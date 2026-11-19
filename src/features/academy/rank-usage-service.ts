import "server-only";

import { Query } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { countStudentsByRank } from "@/features/academy/rank-changes";
import type { Student } from "@/features/students/types";
import { listAllRows } from "@/lib/appwrite/all-rows";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";

/** Quantos alunos há em cada graduação. Só o administrador consulta (a tela mostra por que uma graduação não pode ser desativada). */
export async function getStudentsPerRank(actor: Profile): Promise<Record<string, number>> {
  if (actor.role !== "admin") throw new Error("admin_required");
  const students = await listAllRows<Student>(APPWRITE_IDS.tables.students, [Query.select(["$id", "rank_key"])]);
  return Object.fromEntries(countStudentsByRank(students));
}
