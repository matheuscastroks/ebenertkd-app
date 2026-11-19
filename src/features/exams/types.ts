import type { Models } from "node-appwrite";
import type { PaidChargeDecision } from "@/features/exams/rules";

export type ExamEvent = Models.Row & {
  name: string;
  event_date: string;
  location?: string | null;
  default_fee_cents: number;
  status: "planned" | "confirmed" | "completed" | "cancelled";
  created_by_account_id: string;
  created_at: string;
  updated_at: string;
};

export type ExamParticipant = Models.Row & {
  event_id: string;
  enrollment_id: string;
  student_id: string;
  target_rank_key: string;
  fee_cents: number;
  charge_id?: string | null;
  status: "registered" | "approved" | "failed" | "absent" | "cancelled";
  result_notes?: string | null;
  financial_decision?: PaidChargeDecision | null;
  graded_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type BeltHistory = Models.Row & {
  student_id: string;
  event_id: string;
  exam_participant_id: string;
  previous_rank_key: string;
  new_rank_key: string;
  /** Nome da faixa na época da promoção. Renomear a graduação depois não altera o histórico. */
  previous_belt_name: string;
  new_belt_name: string;
  achieved_at: string;
  created_at: string;
};
