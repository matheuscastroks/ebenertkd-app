import "server-only";

import { Query } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import type { Charge } from "@/features/billing/types";
import { groupStudentExams, type StudentExamEntry } from "@/features/exams/rules";
import type { ExamEvent, ExamParticipant } from "@/features/exams/types";
import { resolveStudentProfile } from "@/features/students/access";
import type { Student } from "@/features/students/types";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";

/**
 * Exames de um aluno, vistos pelo próprio aluno ou por um responsável vinculado.
 * Menores nunca recebem dados financeiros, mesmo da própria taxa de exame.
 */
export async function getStudentExams(actor: Profile, requestedProfileId?: string | null) {
  const profile = await resolveStudentProfile(actor, requestedProfileId);
  const showFinancial = actor.role !== "minor_student";
  const { tables, config } = createAppwriteAdminClient();
  const databaseId = config.databaseId;

  const studentRows = await tables.listRows<Student>({ databaseId, tableId: APPWRITE_IDS.tables.students, queries: [Query.equal("profile_id", [profile.$id]), Query.limit(1)] });
  const student = studentRows.rows[0] ?? null;
  if (!student) return { profile, student, showFinancial, upcoming: [] as StudentExamEntry[], past: [] as StudentExamEntry[] };

  const participants = await tables.listRows<ExamParticipant>({ databaseId, tableId: APPWRITE_IDS.tables.examParticipants, queries: [Query.equal("student_id", [student.$id]), Query.limit(100)] });

  const eventIds = [...new Set(participants.rows.map((row) => row.event_id))];
  const chargeIds = showFinancial ? participants.rows.flatMap((row) => (row.charge_id ? [row.charge_id] : [])) : [];
  const [events, charges] = await Promise.all([
    eventIds.length ? tables.listRows<ExamEvent>({ databaseId, tableId: APPWRITE_IDS.tables.examEvents, queries: [Query.equal("$id", eventIds), Query.limit(100)] }) : { rows: [] as ExamEvent[] },
    chargeIds.length ? tables.listRows<Charge>({ databaseId, tableId: APPWRITE_IDS.tables.charges, queries: [Query.equal("$id", chargeIds), Query.limit(100)] }) : { rows: [] as Charge[] }
  ]);

  const eventById = new Map(events.rows.map((event) => [event.$id, event]));
  const chargeById = new Map(charges.rows.map((charge) => [charge.$id, charge]));
  const entries: StudentExamEntry[] = participants.rows.flatMap((participant) => {
    const event = eventById.get(participant.event_id);
    if (!event) return [];
    const charge = showFinancial && participant.charge_id ? chargeById.get(participant.charge_id) : undefined;
    return [{ participant, event, charge }];
  });

  return { profile, student, showFinancial, ...groupStudentExams(entries) };
}
