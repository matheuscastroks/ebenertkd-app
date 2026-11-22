import { EnrollmentWorkspace } from "@/features/students/components/enrollment-workspace";
import { requireCapability } from "@/lib/auth/session";
import { dependentSegments } from "@/features/families/paths";
import { ROUTES } from "@/lib/navigation/routes";

export default async function DependentEnrollmentPage({
  params,
  searchParams
}: {
  params: Promise<{ profileId: string }>;
  searchParams: Promise<{ saved?: string; submitted?: string; error?: string }>;
}) {
  const [guardian, { profileId }, query] = await Promise.all([
    requireCapability("guardian"),
    params,
    searchParams
  ]);
  return <EnrollmentWorkspace actor={guardian} targetProfileId={profileId} query={query} back={{ label: "Família", href: ROUTES.guardian }} segments={dependentSegments(profileId)} />;
}
