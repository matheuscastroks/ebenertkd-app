import { describe, expect, it } from "vitest";
import type { Event } from "@/features/events/types";
import { examStatusOf, toExamEvent } from "@/features/exams/types";

describe("banca de exame como evento", () => {
  it("traduz o ciclo do evento para o estado da banca", () => {
    expect(examStatusOf("draft")).toBe("planned");
    expect(examStatusOf("registration_open")).toBe("planned");
    expect(examStatusOf("registration_closed")).toBe("confirmed");
    expect(examStatusOf("in_progress")).toBe("confirmed");
    expect(examStatusOf("completed")).toBe("completed");
    expect(examStatusOf("cancelled")).toBe("cancelled");
  });

  it("expõe título, data, local e taxa da linha de events", () => {
    const row = { $id: "e1", event_type: "belt_exam", title: "33º Exame", starts_at: "2026-12-05T12:00:00.000Z", location_text: "Dojang", exam_fee_cents: 15000, status: "registration_open" } as Event;
    expect(toExamEvent(row)).toMatchObject({ $id: "e1", name: "33º Exame", event_date: "2026-12-05T12:00:00.000Z", location: "Dojang", default_fee_cents: 15000, status: "planned" });
    expect(toExamEvent({ ...row, exam_fee_cents: null }).default_fee_cents).toBe(0);
  });
});
