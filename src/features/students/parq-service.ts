import "server-only";

import { AppwriteException, ID, Query } from "node-appwrite";
import { writeAuditEvent } from "@/features/auth/service";
import type { Profile } from "@/features/auth/types";
import { hashContent, privacyIpFingerprint } from "@/features/contracts/rules";
import { createNotification } from "@/features/notifications/notification-service";
import { resolveStudentProfile } from "@/features/students/access";
import {
  canSignParq,
  computeParqExpirationDate,
  PARQ_RESPONSIBILITY_TERM,
  validateParqAnswers,
} from "@/features/students/parq-rules";
import type { ParqSubmission, Student } from "@/features/students/types";
import { listAllRows } from "@/lib/appwrite/all-rows";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { cachedRead } from "@/lib/cache/cached-read";
import { invalidateTags } from "@/lib/cache/invalidate";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { adminEnrollmentPath } from "@/lib/navigation/routes";

function isTableNotFoundError(error: unknown): boolean {
  return (
    error instanceof AppwriteException &&
    (error.code === 404 || error.type === "table_not_found" || error.type === "collection_not_found")
  );
}

export function getLatestParqForStudent(studentId: string): Promise<ParqSubmission | null> {
  if (!studentId) return Promise.resolve(null);
  return cachedRead(
    {
      name: "latest-parq-by-student",
      key: [studentId],
      tags: [CACHE_TAGS.parq(studentId), CACHE_TAGS.parqAll],
      revalidate: 60,
    },
    async () => {
      try {
        const { tables, config } = createAppwriteAdminClient();
        const result = await tables.listRows<ParqSubmission>({
          databaseId: config.databaseId,
          tableId: APPWRITE_IDS.tables.parqSubmissions,
          queries: [
            Query.equal("student_id", [studentId]),
            Query.orderDesc("signed_at"),
            Query.limit(1),
          ],
        });
        return result.rows[0] ?? null;
      } catch (error) {
        if (isTableNotFoundError(error)) return null;
        throw error;
      }
    }
  );
}

export function listAllParqSubmissions(): Promise<ParqSubmission[]> {
  return cachedRead(
    {
      name: "list-all-parq-submissions",
      key: [],
      tags: [CACHE_TAGS.parqAll],
      revalidate: 60,
    },
    async () => {
      try {
        return await listAllRows<ParqSubmission>(APPWRITE_IDS.tables.parqSubmissions, [
          Query.orderDesc("signed_at"),
        ]);
      } catch (error) {
        if (isTableNotFoundError(error)) return [];
        throw error;
      }
    }
  );
}

export async function listLatestParqByStudent(): Promise<Map<string, ParqSubmission>> {
  const rows = await listAllParqSubmissions();
  const map = new Map<string, ParqSubmission>();
  for (const row of rows) {
    const existing = map.get(row.student_id);
    if (!existing || row.signed_at > existing.signed_at) {
      map.set(row.student_id, row);
    }
  }
  return map;
}

export async function getParqContextForActor(actor: Profile, requestedProfileId?: string | null) {
  const targetProfile = await resolveStudentProfile(actor, requestedProfileId);
  const { tables, config } = createAppwriteAdminClient();
  const students = await tables.listRows<Student>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.students,
    queries: [Query.equal("profile_id", [targetProfile.$id]), Query.limit(1)],
  });
  const student = students.rows[0] ?? null;
  const latest = student ? await getLatestParqForStudent(student.$id) : null;
  const canSign = canSignParq({
    role: actor.role,
    actorProfileId: actor.$id,
    studentProfileId: targetProfile.$id,
    capabilities: actor.capabilities,
    studentAccessGranted: true,
  });

  return { targetProfile, student, latest, canSign };
}

export async function submitParq(
  actor: Profile,
  input: {
    profileId?: string | null;
    answers: Record<string, unknown>;
    termAccepted: boolean;
    signatureDataUrl: string;
    signerName?: string | null;
  },
  metadata: { ip?: string | null } = {}
): Promise<ParqSubmission> {
  const targetProfile = await resolveStudentProfile(actor, input.profileId);
  const allowed = canSignParq({
    role: actor.role,
    actorProfileId: actor.$id,
    studentProfileId: targetProfile.$id,
    capabilities: actor.capabilities,
    studentAccessGranted: true,
  });
  if (!allowed) throw new Error("parq_signature_forbidden");
  if (!input.termAccepted) throw new Error("parq_term_required");

  const signatureDataUrl = input.signatureDataUrl.trim();
  if (!signatureDataUrl.startsWith("data:image/png;base64,") || signatureDataUrl.length < 100) {
    throw new Error("parq_signature_required");
  }

  const validated = validateParqAnswers(input.answers);
  const { tables, config } = createAppwriteAdminClient();
  const students = await tables.listRows<Student>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.students,
    queries: [Query.equal("profile_id", [targetProfile.$id]), Query.limit(1)],
  });
  const student = students.rows[0];
  if (!student) throw new Error("student_not_found");

  const signerName = (input.signerName?.trim() || actor.full_name).slice(0, 128);
  const signerRole: ParqSubmission["signer_role"] =
    actor.role === "admin"
      ? "admin"
      : actor.$id === targetProfile.$id
        ? "adult_student"
        : "guardian";

  const now = new Date().toISOString();
  const expiresAt = computeParqExpirationDate(now);
  const answersJson = JSON.stringify(validated.answers);
  const contentHash = hashContent(
    JSON.stringify({
      student_id: student.$id,
      signer_profile_id: actor.$id,
      signer_name: signerName,
      answers: validated.answers,
      term: PARQ_RESPONSIBILITY_TERM,
      signed_at: now,
    })
  );

  const created = await tables.createRow<ParqSubmission>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.parqSubmissions,
    rowId: ID.unique(),
    permissions: [],
    data: {
      student_id: student.$id,
      signer_profile_id: actor.$id,
      signer_account_id: actor.account_id,
      signer_name: signerName,
      signer_role: signerRole,
      answers_json: answersJson,
      has_yes_answer: validated.hasYesAnswer,
      requires_medical_certificate: validated.requiresMedicalCertificate,
      term_accepted: true,
      signature_data_url: signatureDataUrl,
      content_hash: contentHash,
      ip_fingerprint: privacyIpFingerprint(metadata.ip),
      signed_at: now,
      expires_at: expiresAt,
      created_at: now,
    },
  });

  invalidateTags(
    CACHE_TAGS.parq(student.$id),
    CACHE_TAGS.parqAll,
    CACHE_TAGS.enrollments,
    CACHE_TAGS.student(student.$id)
  );

  await writeAuditEvent(
    "student.parq.submitted",
    actor.account_id,
    "parq_submission",
    created.$id,
    {
      student_id: student.$id,
      signer_role: signerRole,
      has_yes_answer: validated.hasYesAnswer,
      yes_questions: validated.yesQuestionNumbers,
      expires_at: expiresAt,
    }
  );

  if (validated.hasYesAnswer) {
    const admins = await tables
      .listRows<Profile>({
        databaseId: config.databaseId,
        tableId: APPWRITE_IDS.tables.profiles,
        queries: [Query.equal("role", ["admin"]), Query.equal("status", ["active"]), Query.limit(50)],
      })
      .catch(() => ({ rows: [] as Profile[] }));

    if (admins.rows.length > 0) {
      await createNotification({
        kind: "system",
        title: `PAR-Q com atenção médica · ${student.full_name}`,
        body: `O PAR-Q anual de ${student.full_name} teve resposta "Sim" nas perguntas ${validated.yesQuestionNumbers.join(", ")}. Recomenda-se conferir o atestado médico atualizado.`,
        audience: "system",
        actionUrl: adminEnrollmentPath(student.$id),
        dedupeKey: `parq-yes:${created.$id}`,
        actorAccountId: actor.account_id,
        recipientProfiles: admins.rows,
      }).catch(() => undefined);
    }
  }

  return created;
}
