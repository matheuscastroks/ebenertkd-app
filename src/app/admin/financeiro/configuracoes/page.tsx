import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

export default async function BillingSettingsPage() {
  await requireProfile("admin");
  redirect(`${ROUTES.adminBilling}?pix=1`);
}
