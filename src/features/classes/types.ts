import type { Models } from "node-appwrite";

export const WEEKDAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export type TrainingClass = Models.Row & {
  name: string;
  weekdays: Weekday[];
  start_time: string;
  end_time: string;
  location?: string | null;
  capacity?: number | null;
  status: "active" | "inactive";
  created_by_account_id: string;
  created_at: string;
  updated_at: string;
};

export type ClassEnrollment = Models.Row & {
  training_class_id: string;
  enrollment_id: string;
  student_id: string;
  status: "active" | "ended";
  started_at: string;
  ended_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type Lesson = Models.Row & {
  training_class_id: string;
  lesson_date: string;
  start_time: string;
  end_time: string;
  lesson_type: "regular" | "makeup";
  status: "open" | "completed" | "cancelled";
  created_by_account_id: string;
  created_at: string;
  updated_at: string;
};

export type AttendanceRecord = Models.Row & {
  lesson_id: string;
  class_enrollment_id: string;
  enrollment_id: string;
  student_id: string;
  status: "present" | "absent" | "excused";
  recorded_by_account_id: string;
  correction_reason?: string | null;
  created_at: string;
  updated_at: string;
};
