export function reminderStage(due: string, day: string): string | null;
export function processingDays(lastRunDay: string | undefined, today: string): string[];
export function pendingReminder(due: string, days: string[], today: string): { stage: string; daysLeft: number | null } | null;
export function reminderCopy(stage: string, description: string, daysLeft?: number | null): { title: string; body: string };
export function renewalReminderDays(endsAt: string, days: string[], today: string): { day: string; left: number }[];
