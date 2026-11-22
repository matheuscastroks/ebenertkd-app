import { describe, expect, it } from "vitest";
import { achievementIllustration, eventIllustration, earnedBadgeIllustrations } from "./illustration-catalog";

describe("illustration meanings", () => {
  it("covers the five event types and falls back for unknown values", () => {
    expect(eventIllustration("championship")).toBe("event-championship");
    expect(eventIllustration("belt_exam")).toBe("event-belt-exam");
    expect(eventIllustration("seminar")).toBe("event-seminar");
    expect(eventIllustration("social")).toBe("event-social");
    expect(eventIllustration("future-type")).toBe("event-other");
  });
  it("keeps each training milestone distinct without relying on editable titles or targets", () => {
    const arts = ["first-lesson", "lessons-25", "lessons-50", "lessons-100"].map((id) => achievementIllustration({ id, metric: "total_presences" }));
    expect(new Set(arts).size).toBe(4);
    expect(achievementIllustration({ id: "first-lesson", metric: "medals" })).toBe("achievement-first-lesson");
  });
  it("uses the metric for custom IDs, including names inherited from Object.prototype", () => {
    expect(achievementIllustration({ id: "my-streak", metric: "best_week_streak" })).toBe("achievement-streak");
    expect(achievementIllustration({ id: "constructor", metric: "graduations" })).toBe("achievement-first-graduation");
    expect(achievementIllustration({ id: "custom", metric: "events_attended" })).toBe("achievement-first-event");
  });
  it("gives all six earned recognitions distinct art", () => {
    expect(new Set(Object.values(earnedBadgeIllustrations)).size).toBe(6);
  });
});
