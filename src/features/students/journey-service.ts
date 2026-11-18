import "server-only";

import { Query } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { getAttendanceHistory } from "@/features/classes/attendance-history-service";
import { getTrainingClass } from "@/features/classes/service";
import { sortBeltHistoryNewestFirst } from "@/features/exams/rules";
import type { BeltHistory } from "@/features/exams/types";
import { resolveStudentProfile } from "@/features/students/access";
import { evaluateStudentCompliance } from "@/features/students/compliance-rules";
import { getLatestParqForStudent } from "@/features/students/parq-service";
import {
  buildBeltRoadmap,
  buildMonthlyAttendanceSeries,
  buildStudentReadiness,
} from "@/features/students/journey-rules";
import type { Enrollment, StudentDocument } from "@/features/students/types";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { saoPauloToday } from "@/lib/dates";

/**
 * Carrega o contexto pedagógico e documental completo do aluno (próprio ou dependente).
 * Nunca retorna dados financeiros para preservar o isolamento de alunos menores.
 */
export async function getStudentJourneySnapshot(actor: Profile, requestedProfileId?: string | null) {
  const targetProfile = await resolveStudentProfile(actor, requestedProfileId);
  const attendance = await getAttendanceHistory(actor, targetProfile.$id);
  const student = attendance.student;

  if (!student) {
    return {
      profile: targetProfile,
      student: null,
      enrollment: null,
      trainingClass: null,
      beltHistory: [] as BeltHistory[],
      documents: [] as StudentDocument[],
      attendanceEntries: [] as Array<{ lessonDate: string; status: "present" | "absent" | "excused" }>,
      roadmap: buildBeltRoadmap({ currentGub: 10, currentBelt: "Branca", beltHistory: [] }),
      readiness: buildStudentReadiness({
        currentGub: 10,
        currentBelt: "Branca",
        presencesSinceLastBelt: 0,
      }),
      monthlySeries: buildMonthlyAttendanceSeries([], 6),
      compliance: null,
    };
  }

  const { tables, config } = createAppwriteAdminClient();
  const [enrollmentsRes, beltHistoryRes, documentsRes, trainingClass, latestParq] = await Promise.all([
    tables.listRows<Enrollment>({
      databaseId: config.databaseId,
      tableId: APPWRITE_IDS.tables.enrollments,
      queries: [Query.equal("student_id", [student.$id]), Query.limit(1)],
    }),
    tables.listRows<BeltHistory>({
      databaseId: config.databaseId,
      tableId: APPWRITE_IDS.tables.beltHistory,
      queries: [Query.equal("student_id", [student.$id]), Query.limit(50)],
    }),
    tables.listRows<StudentDocument>({
      databaseId: config.databaseId,
      tableId: APPWRITE_IDS.tables.studentDocuments,
      queries: [Query.equal("student_id", [student.$id]), Query.limit(20)],
    }),
    student.training_class_id
      ? getTrainingClass(student.training_class_id).catch(() => null)
      : Promise.resolve(null),
    getLatestParqForStudent(student.$id).catch(() => null),
  ]);

  const enrollment = enrollmentsRes.rows[0] ?? null;
  const beltHistory = sortBeltHistoryNewestFirst(beltHistoryRes.rows);
  const documents = documentsRes.rows;
  const referenceDate = saoPauloToday();

  const attendanceEntries = attendance.entries.map(({ lesson, record }) => ({
    lessonDate: lesson.lesson_date.slice(0, 10),
    status: record.status,
  }));

  const latestBelt = beltHistory[0];
  const beltStartDate =
    latestBelt?.achieved_at ??
    student.started_at_tkd ??
    enrollment?.contract_start ??
    enrollment?.created_at ??
    student.created_at;

  const beltStartDay = beltStartDate.slice(0, 10);
  const presencesSinceLastBelt = attendanceEntries.filter(
    (entry) => entry.status === "present" && entry.lessonDate >= beltStartDay
  ).length;

  const roadmap = buildBeltRoadmap({
    currentGub: student.gub,
    currentBelt: student.current_belt,
    beltHistory,
  });

  const readiness = buildStudentReadiness({
    currentGub: student.gub,
    currentBelt: student.current_belt,
    beltStartDate,
    presencesSinceLastBelt,
    referenceDate,
  });

  const monthlySeries = buildMonthlyAttendanceSeries(attendanceEntries, 6, referenceDate);

  const compliance = evaluateStudentCompliance({
    student,
    enrollment,
    documents,
    latestParq,
    trainingClassName: trainingClass?.name ?? student.training_class,
    referenceDate,
  });

  return {
    profile: targetProfile,
    student,
    enrollment,
    trainingClass,
    beltHistory,
    documents,
    attendanceEntries,
    roadmap,
    readiness,
    monthlySeries,
    compliance,
  };
}
