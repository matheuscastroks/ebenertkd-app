import type { Models } from "node-appwrite";

export const EVENT_TYPES = ["belt_exam", "championship", "seminar", "social", "other"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_STATUSES = ["draft", "published", "registration_open", "registration_closed", "in_progress", "completed", "cancelled"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const REGISTRATION_STATUSES = ["interested", "pending_approval", "confirmed", "waitlisted", "checked_in", "completed", "no_show", "rejected", "cancelled"] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export type EventAudience = "students" | "students_and_guests" | "public";
export type EventAgeCutoff = "birth_year" | "event_date";
export type EventDeadlineKind = "affiliation" | "registration" | "category_change" | "weigh_in" | "payment" | "custom";
export type EventModality = "kyorugi" | "poomsae" | "festival" | "team" | "general";
export type EventFinancialDecision = "future_credit" | "keep_charge";
export type EventMedal = "gold" | "silver" | "bronze" | "none";

export type Event = Models.Row & {
  event_type: EventType;
  title: string;
  description?: string | null;
  status: EventStatus;
  starts_at: string;
  ends_at?: string | null;
  location_id?: string | null;
  location_text?: string | null;
  organizer_type: "academy" | "external";
  organizer_name?: string | null;
  registration_opens_at?: string | null;
  registration_closes_at?: string | null;
  audience: EventAudience;
  requires_approval: boolean;
  capacity?: number | null;
  max_companions?: number | null;
  companion_price_cents?: number | null;
  age_cutoff: EventAgeCutoff;
  exam_fee_cents?: number | null;
  cover_file_id?: string | null;
  external_url?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  created_by_account_id: string;
  created_at: string;
  updated_at: string;
};

export type EventDeadline = Models.Row & {
  event_id: string;
  kind: EventDeadlineKind;
  label: string;
  due_at: string;
  notify_days_before?: number | null;
  created_at: string;
  updated_at: string;
};

export type EventOption = Models.Row & {
  event_id: string;
  label: string;
  modality: EventModality;
  price_cents: number;
  capacity?: number | null;
  eligibility_json?: string | null;
  max_per_registrant_group?: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type EventRegistration = Models.Row & {
  event_id: string;
  option_id: string;
  student_id?: string | null;
  enrollment_id?: string | null;
  guest_name?: string | null;
  guest_contact?: string | null;
  registered_by_account_id?: string | null;
  status: RegistrationStatus;
  waitlist_position?: number | null;
  companions: number;
  declared_weight_grams?: number | null;
  rank_key_snapshot?: string | null;
  age_class_snapshot?: string | null;
  price_cents: number;
  charge_id?: string | null;
  federation_charge_id?: string | null;
  financial_decision?: EventFinancialDecision | null;
  terms_accepted_at?: string | null;
  guardian_authorized_at?: string | null;
  guardian_account_id?: string | null;
  external_submitted_at?: string | null;
  checked_in_at?: string | null;
  cancelled_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

export type EventRegistrationDocument = Models.Row & {
  registration_id: string;
  kind: "guardian_authorization" | "responsibility_term" | "medical" | "federation_card" | "other";
  file_id: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by_account_id?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type EventResult = Models.Row & {
  registration_id: string;
  event_id: string;
  student_id: string;
  placement?: number | null;
  medal: EventMedal;
  notes?: string | null;
  recorded_by_account_id: string;
  recorded_at: string;
};
