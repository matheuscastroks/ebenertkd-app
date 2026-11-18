import "server-only";

import type { Profile } from "@/features/auth/types";
import { getStudentAppAccessByStudentId } from "@/features/billing/access-lock-service";
import { listChargesForStudent } from "@/features/billing/charge-service";
import { getAttendanceHistory } from "@/features/classes/attendance-history-service";
import { listTrainingClasses } from "@/features/classes/service";
import { getNextClassSchedule } from "@/features/classes/schedule";
import { listStudentContracts } from "@/features/contracts/contract-service";
import { buildPendencies } from "@/features/families/pendencies";
import { evaluateParqStatus } from "@/features/students/parq-rules";
import { getLatestParqForStudent } from "@/features/students/parq-service";
import { listProfilePhotoDocumentIds } from "@/features/students/service";
import { saoPauloToday } from "@/lib/dates";
import { guardianBillingPath, guardianContractPath, guardianContractsPath, guardianEnrollmentPath, guardianParqPath } from "@/lib/navigation/routes";

export type DependentSnapshot = Awaited<ReturnType<typeof loadDependentSnapshots>>[number];

/** Tudo o que o responsável precisa para saber o que está pendente para cada filho. */
export async function loadDependentSnapshots(guardian: Profile, minors: Profile[]) {
  const [classes, photos] = await Promise.all([
    listTrainingClasses(true).catch(() => []),
    listProfilePhotoDocumentIds(minors.map((minor) => minor.$id)).catch(() => new Map<string, string>())
  ]);
  return Promise.all(minors.map(async (minor) => {
    const [history, charges, contracts] = await Promise.all([
      getAttendanceHistory(guardian, minor.$id),
      listChargesForStudent(guardian, minor.$id).catch(() => null),
      listStudentContracts(guardian, minor.$id).catch(() => null)
    ]);
    const student = history.student;
    const [latestParq, accessState] = student?.$id
      ? await Promise.all([
          getLatestParqForStudent(student.$id).catch(() => null),
          getStudentAppAccessByStudentId(student.$id).catch(() => null),
        ])
      : [null, null];
    const parqAssessment = student?.$id ? evaluateParqStatus(latestParq, saoPauloToday()) : null;
    const trainingClass = classes.find((item) => item.$id === student?.training_class_id);
    const pendencies = buildPendencies({
      studentStatus: student?.status,
      charges,
      contracts,
      parqStatus: parqAssessment?.status,
      parqExpiresAt: parqAssessment?.expiresAt,
      accessLocked: accessState?.locked ?? false,
      canSign: true,
      links: {
        enrollment: guardianEnrollmentPath(minor.$id),
        billing: guardianBillingPath(minor.$id),
        contracts: guardianContractsPath(minor.$id),
        contract: (contractId) => guardianContractPath(minor.$id, contractId),
        parq: guardianParqPath(minor.$id),
      }
    });
    return {
      minor, student, summary: history.summary, photoDocumentId: photos.get(minor.$id),
      trainingClass, next: trainingClass ? getNextClassSchedule(trainingClass) : null, pendencies
    };
  }));
}

export const studentStatusLabel = (status?: string | null) =>
  status === "active" ? "Ativo" : status === "submitted" ? "Em análise" : status === "inactive" ? "Inativo" : "Matrícula incompleta";
export const studentStatusTone = (status?: string | null) =>
  status === "active" ? "success" as const : status === "submitted" ? "info" as const : status === "inactive" ? "neutral" as const : "warning" as const;
