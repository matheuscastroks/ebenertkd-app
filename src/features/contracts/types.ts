import type { Models } from "node-appwrite";

export type ContractTemplate = Models.Row & {
  name: string;
  draft_content: string;
  published_version_id?: string | null;
  created_by_account_id: string;
  updated_by_account_id: string;
  created_at: string;
  updated_at: string;
};

export type ContractVersion = Models.Row & {
  template_id: string;
  version: number;
  content: string;
  content_hash: string;
  published_by_account_id: string;
  published_at: string;
};

export type ContractStatus = "pending_signature" | "signed" | "expired" | "cancelled";

export type Contract = Models.Row & {
  enrollment_id: string;
  student_id: string;
  version_id: string;
  version_number: number;
  status: ContractStatus;
  content_snapshot: string;
  content_hash: string;
  student_name: string;
  guardian_name?: string | null;
  monthly_fee_cents: number;
  starts_at: string;
  ends_at: string;
  signature_id?: string | null;
  pdf_file_id?: string | null;
  pdf_hash?: string | null;
  signed_at?: string | null;
  created_by_account_id: string;
  created_at: string;
  updated_at: string;
};

export type ContractSignature = Models.Row & {
  contract_id: string;
  signer_profile_id: string;
  signer_account_id: string;
  signer_name: string;
  signature_data_url: string;
  content_hash: string;
  ip_fingerprint?: string | null;
  user_agent?: string | null;
  accepted_at: string;
  created_at: string;
};

export type CancellationRequest = Models.Row & {
  contract_id: string;
  enrollment_id: string;
  student_id: string;
  requested_by_profile_id: string;
  target_exit_month: string;
  notice_date: string;
  suggested_fee_cents: number;
  decided_fee_cents?: number | null;
  status: "pending" | "approved" | "rejected";
  reason?: string | null;
  decision_notes?: string | null;
  decided_by_account_id?: string | null;
  decided_at?: string | null;
  created_at: string;
  updated_at: string;
};
