import {
  countAttendancesInMonth,
  daysSinceLastAttendance,
  isEngagementAtRisk
} from "@/lib/domain/attendance-rules";

const records = [
  "2026-06-02T18:30:00Z",
  "2026-06-05T18:30:00Z",
  "2026-06-09T18:30:00Z",
  "2026-05-28T18:30:00Z"
];

describe("countAttendancesInMonth", () => {
  it("counts only records inside the target month", () => {
    expect(countAttendancesInMonth(records, "2026-06-11")).toBe(3);
  });
});

describe("daysSinceLastAttendance", () => {
  it("returns whole days since the latest check-in", () => {
    expect(daysSinceLastAttendance(records, "2026-06-11T18:30:00Z")).toBe(2);
  });

  it("returns null when there is no attendance history", () => {
    expect(daysSinceLastAttendance([], "2026-06-11T18:30:00Z")).toBeNull();
  });
});

describe("isEngagementAtRisk", () => {
  it("flags the student when the inactivity threshold is reached", () => {
    expect(
      isEngagementAtRisk({
        attendanceRecords: records,
        referenceDate: "2026-06-20T18:30:00Z",
        inactivityThresholdInDays: 7
      })
    ).toBe(true);
  });

  it("keeps the student healthy when recent attendance exists", () => {
    expect(
      isEngagementAtRisk({
        attendanceRecords: records,
        referenceDate: "2026-06-12T18:30:00Z",
        inactivityThresholdInDays: 7
      })
    ).toBe(false);
  });
});
