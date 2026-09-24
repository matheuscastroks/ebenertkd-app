function toDate(input: string) {
  return new Date(input);
}

export function countAttendancesInMonth(attendanceRecords: string[], referenceDate: string) {
  const baseDate = toDate(referenceDate);
  const month = baseDate.getUTCMonth();
  const year = baseDate.getUTCFullYear();

  return attendanceRecords.filter((record) => {
    const date = toDate(record);

    return date.getUTCMonth() === month && date.getUTCFullYear() === year;
  }).length;
}

export function daysSinceLastAttendance(
  attendanceRecords: string[],
  referenceDate: string
) {
  if (attendanceRecords.length === 0) {
    return null;
  }

  const lastAttendance = attendanceRecords
    .map(toDate)
    .sort((left, right) => right.getTime() - left.getTime())[0];
  const millisecondsPerDay = 1000 * 60 * 60 * 24;

  return Math.floor((toDate(referenceDate).getTime() - lastAttendance.getTime()) / millisecondsPerDay);
}

export function isEngagementAtRisk({
  attendanceRecords,
  referenceDate,
  inactivityThresholdInDays
}: {
  attendanceRecords: string[];
  referenceDate: string;
  inactivityThresholdInDays: number;
}) {
  const elapsedDays = daysSinceLastAttendance(attendanceRecords, referenceDate);

  if (elapsedDays === null) {
    return true;
  }

  return elapsedDays >= inactivityThresholdInDays;
}
