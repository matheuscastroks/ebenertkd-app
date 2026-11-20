import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { EVENT_STATUS_LABEL, EVENT_TYPE_LABEL, REGISTRATION_STATUS_LABEL } from "@/features/events/labels";
import type { EventStatus, EventType, RegistrationStatus } from "@/features/events/types";

const EVENT_STATUS_TONE: Record<EventStatus, StatusTone> = {
  draft: "neutral",
  published: "info",
  registration_open: "success",
  registration_closed: "warning",
  in_progress: "info",
  completed: "neutral",
  cancelled: "danger"
};

const REGISTRATION_TONE: Record<RegistrationStatus, StatusTone> = {
  interested: "info",
  pending_approval: "warning",
  confirmed: "success",
  waitlisted: "warning",
  checked_in: "success",
  completed: "neutral",
  no_show: "danger",
  rejected: "danger",
  cancelled: "neutral"
};

export function EventTypeBadge({ type }: { type: EventType }) {
  return <StatusBadge tone={type === "belt_exam" ? "info" : "neutral"}>{EVENT_TYPE_LABEL[type]}</StatusBadge>;
}

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return <StatusBadge tone={EVENT_STATUS_TONE[status]}>{EVENT_STATUS_LABEL[status]}</StatusBadge>;
}

export function RegistrationStatusBadge({ status }: { status: RegistrationStatus }) {
  return <StatusBadge tone={REGISTRATION_TONE[status]}>{REGISTRATION_STATUS_LABEL[status]}</StatusBadge>;
}
