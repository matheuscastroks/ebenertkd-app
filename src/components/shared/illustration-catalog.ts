import type { BadgeMetric } from "@/features/academy/defaults";
import type { EventType } from "@/features/events/types";
import type { EarnedBadgeKind } from "@/features/students/badge-rules";

export const illustrationNames = [
  "event-championship", "event-belt-exam", "event-seminar", "event-social", "event-other",
  "achievement-first-lesson", "achievement-streak", "achievement-perfect-month",
  "achievement-lessons-25", "achievement-lessons-50", "achievement-lessons-100",
  "achievement-first-graduation", "achievement-one-year", "achievement-first-event", "achievement-first-medal",
  "badge-participation", "badge-gold", "badge-silver", "badge-bronze", "badge-exam-approved", "badge-seminar-attendance",
  "empty-agenda", "empty-journey", "empty-achievements", "empty-family", "empty-documents", "empty-classes",
] as const;

export type IllustrationName = (typeof illustrationNames)[number];

const events = {
  championship: "event-championship", belt_exam: "event-belt-exam",
  seminar: "event-seminar", social: "event-social", other: "event-other",
} as const satisfies Record<EventType, IllustrationName>;

export function eventIllustration(type: string): IllustrationName {
  return Object.hasOwn(events, type) ? events[type as EventType] : events.other;
}

export const earnedBadgeIllustrations = {
  participation: "badge-participation", medal_gold: "badge-gold", medal_silver: "badge-silver",
  medal_bronze: "badge-bronze", exam_approved: "badge-exam-approved", seminar_attendance: "badge-seminar-attendance",
} as const satisfies Record<EarnedBadgeKind, IllustrationName>;

const milestones: Record<string, IllustrationName> = {
  "first-lesson": "achievement-first-lesson", "streak-4w": "achievement-streak",
  "perfect-month": "achievement-perfect-month", "lessons-25": "achievement-lessons-25",
  "lessons-50": "achievement-lessons-50", "lessons-100": "achievement-lessons-100",
  "first-graduation": "achievement-first-graduation", "one-year": "achievement-one-year",
  "first-event": "achievement-first-event", "first-medal": "achievement-first-medal",
};

const metrics = {
  total_presences: "achievement-first-lesson", best_week_streak: "achievement-streak",
  perfect_months: "achievement-perfect-month", graduations: "achievement-first-graduation",
  tenure_months: "achievement-one-year", events_attended: "achievement-first-event", medals: "achievement-first-medal",
} as const satisfies Record<BadgeMetric, IllustrationName>;

export function achievementIllustration(badge: { id: string; metric: BadgeMetric }): IllustrationName {
  return Object.hasOwn(milestones, badge.id) ? milestones[badge.id] : metrics[badge.metric];
}
