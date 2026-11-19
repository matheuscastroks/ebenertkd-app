import "server-only";

import { Query } from "node-appwrite";
import { getBeltRanks, getPolicy } from "@/features/academy/config-service";
import { effectiveChargeStatus } from "@/features/billing/rules";
import type { Charge } from "@/features/billing/types";
import type { AttendanceRecord, Lesson, TrainingClass } from "@/features/classes/types";
import {
  evaluateExamEligibility,
  sortEligibilityAssessments,
  summarizeEligibility,
  type EligibilityContext,
  type ExamEligibilityStatus,
  type StudentEligibilityAssessment,
} from "@/features/exams/eligibility-rules";
import type { Event } from "@/features/events/types";
import { toExamEvent, type BeltHistory, type ExamEvent, type ExamParticipant } from "@/features/exams/types";
import type { Enrollment, Student, StudentDocument } from "@/features/students/types";
import { listAllRows } from "@/lib/appwrite/all-rows";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { cachedRead } from "@/lib/cache/cached-read";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { saoPauloToday } from "@/lib/dates";

export type EligibilityFilters = {
  status?: ExamEligibilityStatus;
  classId?: string;
  rankKey?: string;
  search?: string;
};

export function loadEligibilityDataset() {
  return cachedRead(
    {
      name: "admin-exam-eligibility-dataset",
      key: [],
      tags: [
        CACHE_TAGS.events,
        CACHE_TAGS.enrollments,
        CACHE_TAGS.studentsAll,
        CACHE_TAGS.attendanceAll,
        CACHE_TAGS.billingCharges,
        CACHE_TAGS.trainingClasses,
      ],
      revalidate: 60,
    },
    async () => {
      const [
        students,
        enrollments,
        classes,
        beltHistory,
        lessons,
        presentAttendance,
        charges,
        examEvents,
        examParticipants,
        photos,
      ] = await Promise.all([
        listAllRows<Student>(APPWRITE_IDS.tables.students),
        listAllRows<Enrollment>(APPWRITE_IDS.tables.enrollments),
        listAllRows<TrainingClass>(APPWRITE_IDS.tables.trainingClasses),
        listAllRows<BeltHistory>(APPWRITE_IDS.tables.beltHistory),
        listAllRows<Lesson>(APPWRITE_IDS.tables.lessons, [Query.equal("status", ["completed"])]),
        listAllRows<AttendanceRecord>(APPWRITE_IDS.tables.attendanceRecords, [
          Query.equal("status", ["present"]),
        ]),
        listAllRows<Charge>(APPWRITE_IDS.tables.charges),
        listAllRows<Event>(APPWRITE_IDS.tables.events, [Query.equal("event_type", ["belt_exam"])]).then((rows): ExamEvent[] => rows.map(toExamEvent)),
        listAllRows<ExamParticipant>(APPWRITE_IDS.tables.examParticipants, [
          Query.equal("status", ["registered"]),
        ]),
        listAllRows<StudentDocument>(APPWRITE_IDS.tables.studentDocuments, [
          Query.equal("document_type", ["profile_photo"]),
        ]),
      ]);

      return {
        students,
        enrollments,
        classes,
        beltHistory,
        lessons,
        presentAttendance,
        charges,
        examEvents,
        examParticipants,
        photos,
      };
    }
  );
}

export type EligibilityDataset = Awaited<ReturnType<typeof loadEligibilityDataset>>;

/** Avalia todos os alunos ativos sob uma configuração de graduações e uma política de exame (a atual ou uma proposta). */
export function buildEligibilityAssessments(dataset: EligibilityDataset, context: EligibilityContext, referenceDate: string) {
  const {
    students,
    enrollments,
    classes,
    beltHistory,
    lessons,
    presentAttendance,
    charges,
    examEvents,
    examParticipants,
    photos,
  } = dataset;

  const classById = new Map(classes.map((item) => [item.$id, item]));
  const lessonById = new Map(lessons.map((item) => [item.$id, item]));
  const enrollmentByStudent = new Map(enrollments.map((item) => [item.student_id, item]));

  const latestBeltByStudent = new Map<string, BeltHistory>();
  for (const row of beltHistory) {
    const existing = latestBeltByStudent.get(row.student_id);
    if (!existing || row.achieved_at > existing.achieved_at) {
      latestBeltByStudent.set(row.student_id, row);
    }
  }

  const photoByStudent = new Map<string, string>();
  for (const photo of photos) {
    if (photo.status !== "rejected" && !photoByStudent.has(photo.student_id)) {
      photoByStudent.set(photo.student_id, photo.$id);
    }
  }

  const overdueStudents = new Set<string>();
  for (const charge of charges) {
    if (effectiveChargeStatus(charge.status, charge.due_date, referenceDate) === "overdue") {
      overdueStudents.add(charge.student_id);
    }
  }

  const openEvents = examEvents
    .filter((event) => event.status === "planned" || event.status === "confirmed")
    .sort((a, b) => a.event_date.localeCompare(b.event_date));
  const openEventById = new Map(openEvents.map((event) => [event.$id, event]));

  const registrationByStudent = new Map<string, ExamEvent>();
  for (const participant of examParticipants) {
    const event = openEventById.get(participant.event_id);
    if (event && !registrationByStudent.has(participant.student_id)) {
      registrationByStudent.set(participant.student_id, event);
    }
  }

  const presentDatesByStudent = new Map<string, string[]>();
  for (const record of presentAttendance) {
    const lesson = lessonById.get(record.lesson_id);
    if (!lesson) continue;
    const list = presentDatesByStudent.get(record.student_id) ?? [];
    list.push(lesson.lesson_date.slice(0, 10));
    presentDatesByStudent.set(record.student_id, list);
  }

  const activeStudents = students.filter((student) => {
    const enrollment = enrollmentByStudent.get(student.$id);
    return enrollment?.status === "active" || enrollment?.status === "awaiting_renewal";
  });

  const assessments = sortEligibilityAssessments(
    activeStudents.map((student) => {
      const enrollment = enrollmentByStudent.get(student.$id);
      const latestBelt = latestBeltByStudent.get(student.$id);
      const beltStartDate =
        latestBelt?.achieved_at ??
        student.started_at_tkd ??
        enrollment?.contract_start ??
        enrollment?.created_at ??
        student.created_at;

      const beltStartDay = beltStartDate.slice(0, 10);
      const presencesSinceLastBelt = (presentDatesByStudent.get(student.$id) ?? []).filter(
        (day) => day >= beltStartDay
      ).length;

      const classObj = student.training_class_id
        ? classById.get(student.training_class_id)
        : undefined;
      const registeredEvent = registrationByStudent.get(student.$id);

      return evaluateExamEligibility(
        {
          studentId: student.$id,
          fullName: student.full_name,
          currentRankKey: student.rank_key,
          trainingClassId: student.training_class_id,
          trainingClassName: classObj?.name ?? student.training_class,
          photoDocumentId: photoByStudent.get(student.$id),
          beltStartDate,
          birthDate: student.birth_date,
          presencesSinceLastBelt,
          hasOverdueCharges: overdueStudents.has(student.$id),
          registeredEventId: registeredEvent?.$id ?? null,
          registeredEventName: registeredEvent?.name ?? null,
          referenceDate,
        },
        context
      );
    })
  );

  return { assessments, openEvents, classes: classes.filter((item) => item.status === "active") };
}

export async function getExamEligibilityOverview(filters: EligibilityFilters = {}) {
  const [dataset, ranks, exam] = await Promise.all([loadEligibilityDataset(), getBeltRanks(), getPolicy("exam")]);
  const { assessments, openEvents, classes } = buildEligibilityAssessments(dataset, { ranks, exam }, saoPauloToday());

  const summary = summarizeEligibility(assessments);

  const normalizedSearch = filters.search?.trim().toLocaleLowerCase("pt-BR");
  const filteredRows = assessments.filter((row: StudentEligibilityAssessment) => {
    if (row.status === "black_belt" && !filters.status) return false;
    if (filters.status && row.status !== filters.status) return false;
    if (filters.classId && row.trainingClassId !== filters.classId) return false;
    if (filters.rankKey && row.currentRankKey !== filters.rankKey) return false;
    if (normalizedSearch && !row.fullName.toLocaleLowerCase("pt-BR").includes(normalizedSearch)) {
      return false;
    }
    return true;
  });

  return {
    rows: filteredRows,
    summary,
    openEvents,
    classes,
  };
}
