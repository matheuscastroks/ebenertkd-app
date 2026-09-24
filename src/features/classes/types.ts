import type { Models } from "node-appwrite";

export const WEEKDAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export type TrainingClass = Models.Row & {
  name: string;
  weekdays: Weekday[];
  start_time: string;
  end_time: string;
  capacity?: number | null;
  status: "active" | "inactive";
  created_by_account_id: string;
  created_at: string;
  updated_at: string;
};
