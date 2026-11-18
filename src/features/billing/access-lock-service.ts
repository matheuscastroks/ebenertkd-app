import "server-only";

import { Query } from "node-appwrite";
import { writeAuditEvent } from "@/features/auth/service";
import type { Profile } from "@/features/auth/types";
import {
  evaluateStudentAppAccess,
  type StudentAppAccessState,
} from "@/features/billing/access-lock-rules";
import type { Charge, Payment } from "@/features/billing/types";
import type { Enrollment, Student } from "@/features/students/types";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { invalidateTags } from "@/lib/cache/invalidate";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { saoPauloToday } from "@/lib/dates";

/**
 * Calcula internamente o estado do ciclo mensal de 30 dias para um `student_id`.
 * Uso exclusivo em camadas server-side (gate do layout, painel do admin e visão do responsável/adulto).
 * Nunca deve vazar valores financeiros para `minor_student`.
 */
export async function getStudentAppAccessByStudentId(
  studentId: string
): Promise<StudentAppAccessState> {
  const { tables, config } = createAppwriteAdminClient();

  const [enrollmentsRes, chargesRes] = await Promise.all([
    tables.listRows<Enrollment>({
      databaseId: config.databaseId,
      tableId: APPWRITE_IDS.tables.enrollments,
      queries: [Query.equal("student_id", [studentId]), Query.limit(1)],
    }),
    tables.listRows<Charge>({
      databaseId: config.databaseId,
      tableId: APPWRITE_IDS.tables.charges,
      queries: [
        Query.equal("student_id", [studentId]),
        Query.equal("charge_type", ["monthly_fee"]),
        Query.orderDesc("due_date"),
        Query.limit(100),
      ],
    }),
  ]);

  const enrollment = enrollmentsRes.rows[0] ?? null;
  const charges = chargesRes.rows;

  let payments: Payment[] = [];
  if (charges.length > 0) {
    const chargeIds = charges.map((charge) => charge.$id).slice(0, 100);
    const paymentsRes = await tables.listRows<Payment>({
      databaseId: config.databaseId,
      tableId: APPWRITE_IDS.tables.payments,
      queries: [
        Query.equal("charge_id", chargeIds),
        Query.equal("status", ["confirmed"]),
        Query.limit(100),
      ],
    });
    payments = paymentsRes.rows;
  }

  return evaluateStudentAppAccess({
    enrollment,
    charges,
    payments,
    referenceDate: saoPauloToday(),
  });
}

export async function getStudentAppAccessByProfileId(
  profileId: string
): Promise<{ studentId: string | null; access: StudentAppAccessState }> {
  const { tables, config } = createAppwriteAdminClient();
  const studentsRes = await tables.listRows<Student>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.students,
    queries: [Query.equal("profile_id", [profileId]), Query.limit(1)],
  });
  const student = studentsRes.rows[0];
  if (!student) {
    return {
      studentId: null,
      access: evaluateStudentAppAccess({ enrollment: null, charges: [], payments: [] }),
    };
  }
  const access = await getStudentAppAccessByStudentId(student.$id);
  return { studentId: student.$id, access };
}

export async function setStudentAccessOverride(
  actor: Profile,
  studentId: string,
  overrideUntilDate: string | null
) {
  if (actor.role !== "admin") throw new Error("admin_required");
  const { tables, config } = createAppwriteAdminClient();
  const enrollmentsRes = await tables.listRows<Enrollment>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.enrollments,
    queries: [Query.equal("student_id", [studentId]), Query.limit(1)],
  });
  const enrollment = enrollmentsRes.rows[0];
  if (!enrollment) throw new Error("enrollment_not_found");

  const normalized = overrideUntilDate?.trim()
    ? `${overrideUntilDate.trim().slice(0, 10)}T23:59:59.000Z`
    : null;

  const updated = await tables.updateRow<Enrollment>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.enrollments,
    rowId: enrollment.$id,
    data: {
      access_override_until: normalized,
      updated_at: new Date().toISOString(),
    },
  });

  invalidateTags(CACHE_TAGS.enrollments, CACHE_TAGS.student(studentId));
  await writeAuditEvent(
    "enrollment.access_override_updated",
    actor.account_id,
    "enrollment",
    enrollment.$id,
    { student_id: studentId, access_override_until: normalized }
  );

  return updated;
}
