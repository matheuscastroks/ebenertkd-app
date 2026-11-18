import "server-only";

import { Query } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { getStudentAppAccessByStudentId } from "@/features/billing/access-lock-service";
import type { Charge } from "@/features/billing/types";
import type { Contract } from "@/features/contracts/types";
import { listGuardianMinors } from "@/features/families/service";
import { createNotification } from "@/features/notifications/notification-service";
import {
  buildPendingNotificationSpecs,
  type PendingNotificationLinks,
} from "@/features/notifications/pending-notifications-rules";
import { evaluateParqStatus } from "@/features/students/parq-rules";
import { getLatestParqForStudent } from "@/features/students/parq-service";
import type { Enrollment, Student } from "@/features/students/types";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { saoPauloToday } from "@/lib/dates";
import {
  guardianBillingPath,
  guardianContractPath,
  guardianEnrollmentPath,
  guardianParqPath,
  ROUTES,
  studentContractPath,
} from "@/lib/navigation/routes";

const SYNC_TTL_MS = 60_000;
const lastSyncByProfile = new Map<string, number>();

async function syncForStudentProfile(
  recipient: Profile,
  studentProfileId: string,
  links: PendingNotificationLinks,
  options: { isGuardianView: boolean; includeFinancial: boolean }
) {
  const { tables, config } = createAppwriteAdminClient();
  const studentsRes = await tables.listRows<Student>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.students,
    queries: [Query.equal("profile_id", [studentProfileId]), Query.limit(1)],
  });
  const student = studentsRes.rows[0];
  if (!student) return;

  const [enrollmentsRes, latestParq, chargesRes, contractsRes, access] = await Promise.all([
    tables.listRows<Enrollment>({
      databaseId: config.databaseId,
      tableId: APPWRITE_IDS.tables.enrollments,
      queries: [Query.equal("student_id", [student.$id]), Query.limit(1)],
    }),
    options.includeFinancial ? getLatestParqForStudent(student.$id).catch(() => null) : Promise.resolve(null),
    options.includeFinancial
      ? tables.listRows<Charge>({
          databaseId: config.databaseId,
          tableId: APPWRITE_IDS.tables.charges,
          queries: [
            Query.equal("student_id", [student.$id]),
            Query.equal("status", ["pending", "overdue"]),
            Query.limit(50),
          ],
        })
      : Promise.resolve({ rows: [] as Charge[] }),
    options.includeFinancial
      ? tables.listRows<Contract>({
          databaseId: config.databaseId,
          tableId: APPWRITE_IDS.tables.contracts,
          queries: [
            Query.equal("student_id", [student.$id]),
            Query.equal("status", ["pending_signature"]),
            Query.limit(10),
          ],
        })
      : Promise.resolve({ rows: [] as Contract[] }),
    options.includeFinancial
      ? getStudentAppAccessByStudentId(student.$id).catch(() => null)
      : Promise.resolve(null),
  ]);

  const today = saoPauloToday();
  const enrollment = enrollmentsRes.rows[0] ?? null;
  const parq = options.includeFinancial ? evaluateParqStatus(latestParq, today) : null;

  const specs = buildPendingNotificationSpecs({
    student,
    enrollment,
    parq,
    charges: chargesRes.rows,
    contracts: contractsRes.rows,
    access,
    links,
    isGuardianView: options.isGuardianView,
    includeFinancial: options.includeFinancial,
    referenceDate: today,
  });

  for (const spec of specs) {
    await createNotification({
      kind: spec.kind,
      title: spec.title,
      body: spec.body,
      audience: "system",
      actionUrl: spec.actionUrl,
      dedupeKey: spec.dedupeKey,
      recipientProfiles: [recipient],
    }).catch(() => undefined);
  }
}

/**
 * Sincroniza de forma leve e idempotente as notificações automáticas de pendências
 * (PAR-Q, ficha de matrícula, contrato e mensalidades) para o usuário autenticado.
 * Chamado nos Route Handlers de notificações, com janela de 60s por perfil e `dedupeKey` estável.
 */
export async function syncPendingNotificationsForProfile(profile: Profile) {
  if (profile.role === "admin") return;

  const now = Date.now();
  const last = lastSyncByProfile.get(profile.$id) ?? 0;
  if (now - last < SYNC_TTL_MS) return;
  lastSyncByProfile.set(profile.$id, now);

  try {
    if (profile.capabilities.includes("student")) {
      const isMinor = profile.role === "minor_student";
      await syncForStudentProfile(
        profile,
        profile.$id,
        {
          enrollment: ROUTES.studentEnrollment,
          parq: ROUTES.studentParq,
          billing: ROUTES.studentBilling,
          contract: studentContractPath,
        },
        { isGuardianView: false, includeFinancial: !isMinor }
      );
    }

    if (profile.capabilities.includes("guardian")) {
      const minors = await listGuardianMinors(profile).catch(() => [] as Profile[]);
      await Promise.all(
        minors.map((minor) =>
          syncForStudentProfile(
            profile,
            minor.$id,
            {
              enrollment: guardianEnrollmentPath(minor.$id),
              parq: guardianParqPath(minor.$id),
              billing: guardianBillingPath(minor.$id),
              contract: (contractId) => guardianContractPath(minor.$id, contractId),
            },
            { isGuardianView: true, includeFinancial: true }
          )
        )
      );
    }
  } catch {
    // Nunca impede o carregamento da caixa de avisos.
  }
}
