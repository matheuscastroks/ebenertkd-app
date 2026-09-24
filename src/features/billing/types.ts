import type { Models } from "node-appwrite";

export type ChargeType = "monthly_fee" | "enrollment_fee" | "exam_fee" | "exit_fee";
export type ChargeStatus = "pending" | "proof_under_review" | "paid" | "overdue" | "cancelled";

export type Charge = Models.Row & {
  enrollment_id: string; student_id: string; contract_id?: string | null; charge_type: ChargeType;
  competence: string; origin_id: string; amount_cents: number; due_date: string; status: ChargeStatus;
  description: string; adjustment_reason?: string | null; cancelled_at?: string | null; cancellation_reason?: string | null;
  created_at: string; updated_at: string;
};

export type PaymentProof = Models.Row & {
  charge_id: string; file_id: string; original_name: string; mime_type: string; size_bytes: number; version: number;
  status: "pending" | "approved" | "rejected" | "superseded"; rejection_reason?: string | null;
  uploaded_by_account_id: string; reviewed_by_account_id?: string | null; reviewed_at?: string | null;
  created_at: string; updated_at: string;
};

export type Payment = Models.Row & {
  charge_id: string; proof_id?: string | null; method: "pix_proof" | "manual"; amount_cents: number;
  paid_at: string; status: "confirmed" | "reversed"; recorded_by_account_id: string; notes?: string | null;
  created_at: string; updated_at: string;
};

export type PaymentReversal = Models.Row & { payment_id: string; charge_id: string; reason: string; reversed_by_account_id: string; reversed_at: string; created_at: string };
export type BillingSettings = Models.Row & { pix_key: string; pix_key_type: "cpf" | "cnpj" | "email" | "phone" | "random"; beneficiary_name: string; instructions?: string | null; updated_by_account_id: string; created_at: string; updated_at: string };
