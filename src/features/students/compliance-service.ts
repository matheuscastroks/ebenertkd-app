import "server-only";

import { getPolicy } from "@/features/academy/config-service";
import type { CompliancePolicy } from "@/features/academy/defaults";
import type { TrainingClass } from "@/features/classes/types";
import {
  evaluateStudentCompliance,
  sortComplianceAssessments,
  complianceBucketsOf,
  countComplianceBuckets,
  type ComplianceBucket,
} from "@/features/students/compliance-rules";
import type { Enrollment, Student, StudentDocument } from "@/features/students/types";
import { listLatestParqByStudent } from "@/features/students/parq-service";
import { listAllRows } from "@/lib/appwrite/all-rows";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { cachedRead } from "@/lib/cache/cached-read";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { saoPauloToday } from "@/lib/dates";

export type ComplianceFilters = {
  status?: ComplianceBucket;
  classId?: string;
  search?: string;
};

export function loadComplianceDataset() {
  return cachedRead(
    {
      name: "admin-annual-compliance-dataset",
      key: [],
      tags: [CACHE_TAGS.enrollments, CACHE_TAGS.studentsAll, CACHE_TAGS.trainingClasses],
      revalidate: 60,
    },
    async () => {
      const [students, enrollments, documents, classes] = await Promise.all([
        listAllRows<Student>(APPWRITE_IDS.tables.students),
        listAllRows<Enrollment>(APPWRITE_IDS.tables.enrollments),
        listAllRows<StudentDocument>(APPWRITE_IDS.tables.studentDocuments),
        listAllRows<TrainingClass>(APPWRITE_IDS.tables.trainingClasses),
      ]);
      return { students, enrollments, documents, classes };
    }
  );
}

export type ComplianceDataset = Awaited<ReturnType<typeof loadComplianceDataset>>;

/** Avalia todos os alunos ativos com a política informada (pura sobre os dados carregados). */
export function buildComplianceAssessments(
  { students, enrollments, documents, classes }: ComplianceDataset,
  parqByStudent: Awaited<ReturnType<typeof listLatestParqByStudent>>,
  policy: CompliancePolicy,
  referenceDate: string
) {

  const classById = new Map(classes.map((item) => [item.$id, item]));
  const enrollmentByStudent = new Map(enrollments.map((item) => [item.student_id, item]));
  const docsByStudent = new Map<string, StudentDocument[]>();
  for (const doc of documents) {
    const list = docsByStudent.get(doc.student_id) ?? [];
    list.push(doc);
    docsByStudent.set(doc.student_id, list);
  }

  const activeStudents = students.filter((student) => {
    const enrollment = enrollmentByStudent.get(student.$id);
    return (
      student.status === "active" ||
      enrollment?.status === "active" ||
      enrollment?.status === "awaiting_renewal"
    );
  });

  const assessments = sortComplianceAssessments(
    activeStudents.map((student) => {
      const enrollment = enrollmentByStudent.get(student.$id);
      const classObj = student.training_class_id
        ? classById.get(student.training_class_id)
        : undefined;
      return evaluateStudentCompliance({
        student,
        enrollment,
        documents: docsByStudent.get(student.$id) ?? [],
        latestParq: parqByStudent.get(student.$id) ?? null,
        trainingClassName: classObj?.name ?? student.training_class,
        referenceDate,
        policy,
      });
    })
  );
  return assessments;
}

export async function getAnnualComplianceOverview(filters: ComplianceFilters = {}) {
  const [dataset, parqByStudent, policy] = await Promise.all([loadComplianceDataset(), listLatestParqByStudent(), getPolicy("compliance")]);
  const { classes } = dataset;
  const assessments = buildComplianceAssessments(dataset, parqByStudent, policy, saoPauloToday());

  const normalizedSearch = filters.search?.trim().toLocaleLowerCase("pt-BR");
  const scopedRows = assessments.filter((row) => {
    if (filters.classId && row.trainingClassId !== filters.classId) return false;
    if (normalizedSearch && !row.fullName.toLocaleLowerCase("pt-BR").includes(normalizedSearch)) {
      return false;
    }
    return true;
  });

  const bucketCounts = countComplianceBuckets(scopedRows);
  const filteredRows = filters.status
    ? scopedRows.filter((row) => complianceBucketsOf(row).includes(filters.status!))
    : scopedRows;

  return {
    rows: filteredRows,
    bucketCounts,
    policy,
    classes: classes.filter((item) => item.status === "active"),
  };
}
