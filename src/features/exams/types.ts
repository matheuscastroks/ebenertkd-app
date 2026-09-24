import type { Models } from "node-appwrite";
import type { BeltOption, GubOption } from "@/features/students/options";
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
  target_belt: BeltOption;
  target_gub: GubOption;
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
  previous_belt: string;
  previous_gub: number;
  new_belt: BeltOption;
  new_gub: GubOption;
  achieved_at: string;
  created_at: string;
};
