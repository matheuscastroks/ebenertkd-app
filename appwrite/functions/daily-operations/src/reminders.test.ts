import { describe, expect, it } from "vitest";
import { parqExpiryDay, parqReminderStage, pendingReminder, processingDays, reminderCopy, reminderStage, renewalReminderDays, shouldGenerate } from "./reminders.js";

describe("processingDays", () => {
  it("covers only today on the first run or a same-day rerun", () => {
    expect(processingDays(undefined, "2027-03-10")).toEqual(["2027-03-10"]);
    expect(processingDays("2027-03-10", "2027-03-10")).toEqual(["2027-03-10"]);
  });

  it("covers every day since the last completed run", () => {
    expect(processingDays("2027-03-07", "2027-03-10")).toEqual(["2027-03-08", "2027-03-09", "2027-03-10"]);
  });

  it("crosses month and year boundaries", () => {
    expect(processingDays("2027-12-30", "2028-01-02")).toEqual(["2027-12-31", "2028-01-01", "2028-01-02"]);
  });

  it("limits catch-up to 14 days after a long outage", () => {
    const days = processingDays("2027-01-01", "2027-03-10");
    expect(days).toHaveLength(14);
    expect(days.at(-1)).toBe("2027-03-10");
  });
});

describe("pendingReminder", () => {
  const due = "2027-03-10T12:00:00.000Z";

  it("sends the regular reminder on its own day", () => {
    expect(pendingReminder(due, ["2027-03-07"], "2027-03-07")).toEqual({ stage: "due_minus_3", daysLeft: null });
  });

  it("recovers a pre-due reminder missed by an outage, with the real days left", () => {
    expect(pendingReminder(due, ["2027-03-08", "2027-03-09"], "2027-03-09")).toBeNull();
    expect(pendingReminder(due, ["2027-03-07", "2027-03-08", "2027-03-09"], "2027-03-09")).toEqual({ stage: "due_minus_3", daysLeft: 1 });
  });

  it("drops a missed reminder that would now be false", () => {
    expect(pendingReminder(due, ["2027-03-10", "2027-03-11"], "2027-03-11")).toBeNull();
    expect(pendingReminder(due, ["2027-03-07", "2027-03-08", "2027-03-09", "2027-03-10", "2027-03-11"], "2027-03-11")).toBeNull();
  });

  it("recovers an overdue reminder and keeps only the most recent stage", () => {
    expect(pendingReminder(due, ["2027-03-12", "2027-03-13", "2027-03-14"], "2027-03-14")).toEqual({ stage: "overdue_plus_3", daysLeft: null });
    expect(pendingReminder(due, ["2027-03-07", "2027-03-08", "2027-03-13"], "2027-03-13")).toEqual({ stage: "overdue_plus_3", daysLeft: null });
  });

  it("does nothing when no stage falls in the covered days", () => {
    expect(pendingReminder(due, ["2027-03-15", "2027-03-16"], "2027-03-16")).toBeNull();
  });
});

describe("reminderCopy", () => {
  it("uses the real days left and the singular for one day", () => {
    expect(reminderCopy("due_minus_3", "Mensalidade 2027-03").body).toBe("Mensalidade 2027-03 vence em 3 dias.");
    expect(reminderCopy("due_minus_3", "Mensalidade 2027-03", 1).body).toBe("Mensalidade 2027-03 vence em 1 dia.");
  });
});

describe("reminderStage", () => {
  it("keeps the weekly overdue schedule", () => {
    expect(reminderStage("2027-03-10", "2027-03-20")).toBe("overdue_weekly_1");
    expect(reminderStage("2027-03-10", "2027-03-14")).toBeNull();
  });
});

describe("renewalReminderDays", () => {
  it("recovers the 30 and 7 day notices inside the covered days", () => {
    expect(renewalReminderDays("2027-04-09", ["2027-03-09", "2027-03-10"], "2027-03-10")).toEqual([{ day: "2027-03-10", left: 30 }]);
    expect(renewalReminderDays("2027-04-09", ["2027-04-01", "2027-04-02", "2027-04-03"], "2027-04-03")).toEqual([{ day: "2027-04-02", left: 7 }]);
  });

  it("ignores contracts that already ended", () => {
    expect(renewalReminderDays("2027-03-01", ["2027-02-22"], "2027-03-02")).toEqual([]);
  });
});

describe("régua customizada da academia", () => {
  const policy = { payment_stages: [-5, 0, 2], overdue_weekly_from_day: 8 };

  it("usa os dias da política e o semanal a partir do dia configurado", () => {
    expect(reminderStage("2027-03-10", "2027-03-05", policy)).toBe("due_minus_5");
    expect(reminderStage("2027-03-10", "2027-03-07", policy)).toBeNull();
    expect(reminderStage("2027-03-10", "2027-03-12", policy)).toBe("overdue_plus_2");
    expect(reminderStage("2027-03-10", "2027-03-18", policy)).toBe("overdue_weekly_1");
    expect(reminderStage("2027-03-10", "2027-03-25", policy)).toBe("overdue_weekly_2");
  });

  it("recupera o lembrete perdido e a mensagem cita os dias reais", () => {
    expect(pendingReminder("2027-03-10", ["2027-03-05", "2027-03-06"], "2027-03-06", policy)).toEqual({ stage: "due_minus_5", daysLeft: 4 });
    expect(reminderCopy("overdue_plus_2", "Mensalidade 2027-03").body).toBe("Mensalidade 2027-03 está em atraso há 2 dias.");
  });

  it("avisos de renovação e PAR-Q seguem os dias da política", () => {
    expect(renewalReminderDays("2027-04-09", ["2027-02-23"], "2027-02-23", [45, 10])).toEqual([{ day: "2027-02-23", left: 45 }]);
    expect(renewalReminderDays("2027-04-09", ["2027-03-10"], "2027-03-10", [45, 10])).toEqual([]);
    expect(parqReminderStage(14, [14, 0])).toBe("14d");
    expect(parqReminderStage(30, [14, 0])).toBeNull();
    expect(parqExpiryDay("2027-01-01T12:00:00.000Z", 180)).toBe("2027-06-30");
    expect(shouldGenerate("2027-04", "2027-03-25", 3)).toBe(false);
    expect(shouldGenerate("2027-04", "2027-03-29", 3)).toBe(true);
  });
});
