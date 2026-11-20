type LessonLike = { $id: string; status: string; lesson_date: string };
type LinkLike = { $id: string; started_at: string; ended_at?: string | null };
type RecordLike = { class_enrollment_id: string };

export function saoPauloDay(now: Date): string;
export function lessonReadyToClose(lesson: LessonLike, today: string): boolean;
export function eligibleLinks<T extends LinkLike>(links: T[], lessonDate: string): T[];
export function missingAttendance<T extends LinkLike>(lesson: LessonLike, links: T[], records: RecordLike[]): T[];
