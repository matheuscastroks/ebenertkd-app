import "server-only";

import { Query } from "node-appwrite";
import {
  evaluateStudentRetention,
  sortRetentionAssessments,
  summarizeRetentionCohort,
  type RetentionRiskLevel,
} from "@/features/classes/retention-rules";
import type { AttendanceRecord, Lesson, TrainingClass } from "@/features/classes/types";
import type { CancellationRequest } from "@/features/contracts/types";
import type { Enrollment, Student, StudentDocument } from "@/features/students/types";
import { listAllRows } from "@/lib/appwrite/all-rows";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { cachedRead } from "@/lib/cache/cached-read";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { saoPauloCurrentCompetence, saoPauloToday } from "@/lib/dates";

export type RetentionOverviewFilters = {
  classId?: string;
  risk?: RetentionRiskLevel;
  search?: string;
};

function loadRetentionDataset() {
  return cachedRead(
    {
      name: "admin-retention-dataset",
      key: [],
      tags: [
        CACHE_TAGS.enrollments,
        CACHE_TAGS.studentsAll,
        CACHE_TAGS.classEnrollments,
        CACHE_TAGS.trainingClasses,
        CACHE_TAGS.attendanceAll,
        CACHE_TAGS.cancellations,
      ],
      revalidate: 60,
    },
    async () => {
      const [students, enrollments, classes, lessons, attendance, cancellations, photos] =
        await Promise.all([
          listAllRows<Student>(APPWRITE_IDS.tables.students),
          listAllRows<Enrollment>(APPWRITE_IDS.tables.enrollments),
          listAllRows<TrainingClass>(APPWRITE_IDS.tables.trainingClasses),
          listAllRows<Lesson>(APPWRITE_IDS.tables.lessons, [Query.equal("status", ["completed"])]),
          listAllRows<AttendanceRecord>(APPWRITE_IDS.tables.attendanceRecords),
          listAllRows<CancellationRequest>(APPWRITE_IDS.tables.cancellationRequests, [
            Query.equal("status", ["approved"]),
          ]),
          listAllRows<StudentDocument>(APPWRITE_IDS.tables.studentDocuments, [
            Query.equal("document_type", ["profile_photo"]),
          ]),
        ]);

      return { students, enrollments, classes, lessons, attendance, cancellations, photos };
    }
  );
}

export async function getRetentionOverview(filters: RetentionOverviewFilters = {}) {
  const { students, enrollments, classes, lessons, attendance, cancellations, photos } =
    await loadRetentionDataset();

  const referenceDate = saoPauloToday();
  const currentCompetence = saoPauloCurrentCompetence();

  const classById = new Map(classes.map((item) => [item.$id, item]));
  const lessonById = new Map(lessons.map((item) => [item.$id, item]));
  const enrollmentByStudent = new Map(enrollments.map((item) => [item.student_id, item]));

  const photoByStudent = new Map<string, string>();
  for (const photo of photos) {
    if (photo.status !== "rejected" && !photoByStudent.has(photo.student_id)) {
      photoByStudent.set(photo.student_id, photo.$id);
    }
  }

  const attendanceByStudent = new Map<
    string,
    Array<{ lessonDate: string; status: "present" | "absent" | "excused" }>
  >();
  for (const record of attendance) {
    const lesson = lessonById.get(record.lesson_id);
    if (!lesson) continue;
    const list = attendanceByStudent.get(record.student_id) ?? [];
    list.push({ lessonDate: lesson.lesson_date, status: record.status });
    attendanceByStudent.set(record.student_id, list);
  }

  const newEnrollmentsInMonth = enrollments.filter(
    (item) =>
      (item.status === "active" || item.status === "awaiting_renewal") &&
      (item.contract_start ?? item.created_at).startsWith(currentCompetence)
  ).length;

  const cancellationsInMonth = cancellations.filter((item) =>
    (item.decided_at ?? item.target_exit_month).startsWith(currentCompetence)
  ).length;

  const activeStudents = students.filter((student) => {
    const enrollment = enrollmentByStudent.get(student.$id);
    return (
      student.status === "active" ||
      enrollment?.status === "active" ||
      enrollment?.status === "awaiting_renewal"
    );
  });

  const assessments = sortRetentionAssessments(
    activeStudents.map((student) => {
      const enrollment = enrollmentByStudent.get(student.$id);
      const classObj = student.training_class_id
        ? classById.get(student.training_class_id)
        : undefined;
      return evaluateStudentRetention({
        studentId: student.$id,
        profileId: student.profile_id,
        fullName: student.full_name,
        rankKey: student.rank_key,
        trainingClassId: student.training_class_id,
        trainingClassName: classObj?.name ?? student.training_class,
        whatsapp: student.whatsapp,
        guardianContact: student.guardian_contact,
        photoDocumentId: photoByStudent.get(student.$id),
        enrollmentCreatedAt: enrollment?.contract_start ?? enrollment?.created_at ?? student.created_at,
        attendanceEntries: attendanceByStudent.get(student.$id) ?? [],
        referenceDate,
      });
    })
  );

  const summary = summarizeRetentionCohort(
    assessments,
    newEnrollmentsInMonth,
    cancellationsInMonth
  );

  const normalizedSearch = filters.search?.trim().toLocaleLowerCase("pt-BR");
  const filteredRows = assessments.filter((row) => {
    if (filters.classId && row.trainingClassId !== filters.classId) return false;
    if (filters.risk && row.riskLevel !== filters.risk) return false;
    if (normalizedSearch && !row.fullName.toLocaleLowerCase("pt-BR").includes(normalizedSearch)) {
      return false;
    }
    return true;
  });

  return {
    rows: filteredRows,
    summary,
    classes: classes.filter((item) => item.status === "active"),
  };
}
