import type { Models } from "node-appwrite";
import type { AppCapability, AppRole } from "@/lib/auth/auth-utils";

export type Profile = Models.Row & {
  account_id: string;
  full_name: string;
  email: string;
  username?: string | null;
  role: AppRole;
  capabilities: AppCapability[];
  status: "active" | "invited" | "disabled";
  onboarding_completed_at?: string | null;
  onboarding_preferences?: string | null;
  created_at: string;
  updated_at: string;
};

export type AdultRegistration = {
  fullName: string;
  email: string;
  password: string;
  accountType: "adult_student" | "guardian";
};

export type MinorRegistration = {
  fullName: string;
  username: string;
  password: string;
};
