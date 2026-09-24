import { trainingClassSchema } from "@/features/classes/schemas";

describe("training class schema", () => {
  it("accepts a class with at least one day and a valid time range", () => {
    expect(trainingClassSchema.safeParse({ name: "Infantil noite", weekdays: ["Segunda", "Quarta"], startTime: "18:00", endTime: "19:00", capacity: 20 }).success).toBe(true);
  });

  it("rejects a class without days or with an inverted time range", () => {
    expect(trainingClassSchema.safeParse({ name: "Infantil noite", weekdays: [], startTime: "18:00", endTime: "19:00" }).success).toBe(false);
    expect(trainingClassSchema.safeParse({ name: "Infantil noite", weekdays: ["Segunda"], startTime: "19:00", endTime: "18:00" }).success).toBe(false);
  });
});
