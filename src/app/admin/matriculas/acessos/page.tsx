import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/navigation/routes";

/** Keeps pre-hierarchy enrollment access links working. */
export default function LegacyEnrollmentAccessPage() {
  redirect(ROUTES.adminStudentAccess);
}
