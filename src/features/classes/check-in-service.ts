import "server-only";

import { AppwriteException, Query } from "node-appwrite";
import { z } from "zod";
import type { Profile } from "@/features/auth/types";
import { writeAuditEvent } from "@/features/auth/service";
import { attendanceId } from "@/features/classes/attendance-service";
import type { AttendanceStatus } from "@/features/classes/attendance-rules";
import {
  canCheckIn,
  canJustify,
  checkInPhase,
  checkInWindow,
  evaluateCheckIn,
  JUSTIFICATION_MAX_LENGTH,
  normalizeJustification,
  resolveCheckInPlace,
  type CheckInPhase,
  type LessonSlot
} from "@/features/classes/check-in-rules";
import { lessonDateTime, lessonId } from "@/features/classes/lesson-service";
import { getTrainingClass } from "@/features/classes/service";
import { buildUpcomingTrainingSessions } from "@/features/classes/student-calendar-rules";
import type { AttendanceRecord, ClassEnrollment, Lesson, TrainingClass } from "@/features/classes/types";
import { listLocations } from "@/features/locations/locations-service";
import type { Student } from "@/features/students/types";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { invalidateTags } from "@/lib/cache/invalidate";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { saoPauloToday } from "@/lib/dates";

export type CheckInErrorCode =
  | "check_in_forbidden"
  | "check_in_no_class"
  | "check_in_no_lesson"
  | "check_in_not_open"
  | "check_in_justify_closed"
  | "check_in_location_missing"
  | "check_in_out_of_range"
  | "check_in_invalid_input"
  | "lesson_cancelled"
  | "lesson_closed"
  | "attendance_already_recorded";

export class CheckInError extends Error {
  constructor(public readonly code: CheckInErrorCode, public readonly detail?: { distanceM: number; radiusM: number }) {
    super(code);
    this.name = "CheckInError";
  }
}

export type StudentAttendanceRecordView = {
  status: AttendanceStatus;
  source: AttendanceRecord["source"] | null;
  justification: string | null;
};

export type StudentCheckInState = {
  slot: LessonSlot;
  className: string;
  location: string | null;
  phase: CheckInPhase;
  opensAt: string;
  closesAt: string;
  placeConfigured: boolean;
  record: StudentAttendanceRecordView | null;
};

const slotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/)
});
const checkInSchema = slotSchema.extend({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});
const justifySchema = slotSchema.extend({ reason: z.string().max(JUSTIFICATION_MAX_LENGTH * 2) });

type StudentContext = { student: Student; trainingClass: TrainingClass; link: ClassEnrollment };
type TodaySession = { slot: LessonSlot; lessonRowId: string; lesson?: Lesson };

/**
 * Só o próprio aluno (adulto ou menor) faz check-in e justifica. O alvo é sempre o perfil
 * logado: não existe parâmetro de perfil, então o responsável não age pelo dependente e o
 * administrador usa a chamada.
 */
function assertSelfStudent(actor: Profile) {
  if (actor.role === "admin" || !actor.capabilities.includes("student")) throw new CheckInError("check_in_forbidden");
}

async function loadStudentContext(actor: Profile): Promise<StudentContext> {
  assertSelfStudent(actor);
  const { tables, config } = createAppwriteAdminClient();
  const students = await tables.listRows<Student>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.students, queries: [Query.equal("profile_id", [actor.$id]), Query.limit(1)] });
  const student = students.rows[0];
  if (!student || student.status !== "active" || !student.training_class_id) throw new CheckInError("check_in_no_class");
  const trainingClass = await getTrainingClass(student.training_class_id).catch(() => null);
  if (!trainingClass || trainingClass.status !== "active") throw new CheckInError("check_in_no_class");
  const links = await tables.listRows<ClassEnrollment>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.classEnrollments,
    queries: [Query.equal("training_class_id", [trainingClass.$id]), Query.equal("student_id", [student.$id]), Query.equal("status", ["active"]), Query.limit(1)]
  });
  const link = links.rows[0];
  if (!link) throw new CheckInError("check_in_no_class");
  return { student, trainingClass, link };
}

/** Aulas de hoje da turma: as criadas pelo professor e as previstas pela grade (sem as canceladas). */
async function todaySessions(trainingClass: TrainingClass, today: string): Promise<TodaySession[]> {
  const { tables, config } = createAppwriteAdminClient();
  const lessons = await tables.listRows<Lesson>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.lessons,
    queries: [Query.equal("training_class_id", [trainingClass.$id]), Query.equal("lesson_date", [lessonDateTime(today)]), Query.limit(20)]
  });
  const byId = new Map(lessons.rows.map((lesson) => [lesson.$id, lesson]));
  return buildUpcomingTrainingSessions({ trainingClass, lessons: lessons.rows, referenceDate: today, horizonDays: 0 })
    .filter((session) => session.date === today)
    .map((session) => {
      const lessonRowId = session.id.startsWith("projected-") ? lessonId(trainingClass.$id, session.date, session.startTime) : session.id;
      return { slot: { date: session.date, startTime: session.startTime, endTime: session.endTime }, lessonRowId, lesson: byId.get(lessonRowId) };
    });
}

async function readRecord(lessonRowId: string, classEnrollmentId: string) {
  const { tables, config } = createAppwriteAdminClient();
  try {
    return await tables.getRow<AttendanceRecord>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.attendanceRecords, rowId: attendanceId(lessonRowId, classEnrollmentId) });
  } catch (error) {
    if (error instanceof AppwriteException && error.code === 404) return null;
    throw error;
  }
}

const toView = (record: AttendanceRecord | null): StudentAttendanceRecordView | null =>
  record ? { status: record.status, source: record.source ?? null, justification: record.justification ?? null } : null;

/**
 * Card de check-in do aluno logado: a próxima aula de hoje que ainda não terminou.
 * Devolve null quando não há aula hoje, o perfil não é aluno ou não há turma ativa.
 */
export async function getStudentCheckInState(actor: Profile, now = new Date()): Promise<StudentCheckInState | null> {
  let context: StudentContext;
  try {
    context = await loadStudentContext(actor);
  } catch (error) {
    if (error instanceof CheckInError) return null;
    throw error;
  }
  const sessions = await todaySessions(context.trainingClass, saoPauloToday(now));
  const current = sessions.find((session) => session.lesson?.status !== "completed" && checkInPhase(session.slot, now) !== "ended");
  if (!current) return null;
  const [record, locations] = await Promise.all([readRecord(current.lessonRowId, context.link.$id), listLocations()]);
  const window = checkInWindow(current.slot);
  return {
    slot: current.slot,
    className: context.trainingClass.name,
    location: context.trainingClass.location ?? null,
    phase: checkInPhase(current.slot, now),
    opensAt: window.opensAt.toISOString(),
    closesAt: window.closesAt.toISOString(),
    placeConfigured: resolveCheckInPlace(context.trainingClass.location, locations) !== null,
    record: toView(record)
  };
}

async function resolveTarget(actor: Profile, rawSlot: { date: string; startTime: string }, now: Date) {
  const context = await loadStudentContext(actor);
  if (rawSlot.date !== saoPauloToday(now)) throw new CheckInError("check_in_no_lesson");
  const session = (await todaySessions(context.trainingClass, rawSlot.date)).find((item) => item.slot.startTime === rawSlot.startTime);
  if (!session) throw new CheckInError("check_in_no_lesson");
  return { context, session, phase: checkInPhase(session.slot, now) };
}

/** Garante a linha da aula (aulas previstas pela grade só viram linha no primeiro registro). */
async function ensureLesson(actor: Profile, trainingClass: TrainingClass, session: TodaySession): Promise<Lesson> {
  const { tables, config } = createAppwriteAdminClient();
  let lesson = session.lesson;
  if (!lesson) {
    const now = new Date().toISOString();
    try {
      lesson = await tables.createRow<Lesson>({
        databaseId: config.databaseId,
        tableId: APPWRITE_IDS.tables.lessons,
        rowId: session.lessonRowId,
        permissions: [],
        data: { training_class_id: trainingClass.$id, lesson_date: lessonDateTime(session.slot.date), start_time: session.slot.startTime, end_time: session.slot.endTime, lesson_type: "regular", status: "open", created_by_account_id: actor.account_id, created_at: now, updated_at: now }
      });
    } catch (error) {
      if (!(error instanceof AppwriteException) || error.code !== 409) throw error;
      lesson = await tables.getRow<Lesson>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.lessons, rowId: session.lessonRowId });
    }
  }
  if (lesson.status === "cancelled") throw new CheckInError("lesson_cancelled");
  if (lesson.status === "completed") throw new CheckInError("lesson_closed");
  return lesson;
}

async function createStudentRecord(actor: Profile, context: StudentContext, lesson: Lesson, data: Partial<AttendanceRecord> & { status: AttendanceStatus; source: NonNullable<AttendanceRecord["source"]> }) {
  const { tables, config } = createAppwriteAdminClient();
  if (await readRecord(lesson.$id, context.link.$id)) throw new CheckInError("attendance_already_recorded");
  const now = new Date().toISOString();
  try {
    await tables.createRow<AttendanceRecord>({
      databaseId: config.databaseId,
      tableId: APPWRITE_IDS.tables.attendanceRecords,
      rowId: attendanceId(lesson.$id, context.link.$id),
      permissions: [],
      data: { lesson_id: lesson.$id, class_enrollment_id: context.link.$id, enrollment_id: context.link.enrollment_id, student_id: context.student.$id, recorded_by_account_id: actor.account_id, created_at: now, updated_at: now, ...data }
    });
  } catch (error) {
    if (error instanceof AppwriteException && error.code === 409) throw new CheckInError("attendance_already_recorded");
    throw error;
  }
  invalidateTags(CACHE_TAGS.lesson(lesson.$id), CACHE_TAGS.classLessons(lesson.training_class_id), CACHE_TAGS.attendanceAll, CACHE_TAGS.attendance(context.student.$id));
}

/**
 * Check-in por localização. A distância é calculada aqui (Haversine) contra o local da turma;
 * a posição recebida não é guardada nem registrada em log: só a distância arredondada.
 * Fora do raio, nada é gravado (o aluno pode tentar de novo dentro da janela ou justificar).
 */
export async function checkInStudent(actor: Profile, raw: unknown, now = new Date()) {
  const parsed = checkInSchema.safeParse(raw);
  if (!parsed.success) throw new CheckInError("check_in_invalid_input");
  const input = parsed.data;
  const { context, session, phase } = await resolveTarget(actor, input, now);
  if (!canCheckIn(phase)) throw new CheckInError("check_in_not_open");
  const place = resolveCheckInPlace(context.trainingClass.location, await listLocations());
  if (!place) throw new CheckInError("check_in_location_missing");
  const result = evaluateCheckIn({ latitude: input.latitude, longitude: input.longitude }, place);
  if (!result.inside) throw new CheckInError("check_in_out_of_range", { distanceM: result.distanceM, radiusM: result.radiusM });
  const lesson = await ensureLesson(actor, context.trainingClass, session);
  await createStudentRecord(actor, context, lesson, { status: "present", source: "check_in", check_in_distance_m: result.distanceM, checked_in_at: now.toISOString() });
  await writeAuditEvent("attendance.check_in", actor.account_id, "lesson", lesson.$id, { distance_m: result.distanceM });
  return { distanceM: result.distanceM };
}

/** Justificativa do próprio aluno: a falta já fica Justificada. O texto não vai para a auditoria. */
export async function justifyAbsence(actor: Profile, raw: unknown, now = new Date()) {
  const parsed = justifySchema.safeParse(raw);
  if (!parsed.success) throw new CheckInError("check_in_invalid_input");
  const reason = normalizeJustification(parsed.data.reason);
  if (!reason) throw new CheckInError("check_in_invalid_input");
  const { context, session, phase } = await resolveTarget(actor, parsed.data, now);
  if (!canJustify(phase)) throw new CheckInError("check_in_justify_closed");
  const lesson = await ensureLesson(actor, context.trainingClass, session);
  await createStudentRecord(actor, context, lesson, { status: "excused", source: "justification", justification: reason });
  await writeAuditEvent("attendance.justified", actor.account_id, "lesson", lesson.$id, {});
}
