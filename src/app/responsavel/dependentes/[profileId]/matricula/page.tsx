import { resolveStudentProfile } from "@/features/students/access";
import { EnrollmentWorkspace } from "@/features/students/components/enrollment-workspace";
import { requireCapability } from "@/lib/auth/session";
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
  const target = await resolveStudentProfile(guardian, profileId);
  return <EnrollmentWorkspace actor={guardian} target={target} query={query} activePath={ROUTES.guardianDependents} />;
}
