import { redirect } from "next/navigation";
import { EnrollmentWorkspace } from "@/features/students/components/enrollment-workspace";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

export default async function StudentEnrollmentPage({
  searchParams
}: {
  searchParams: Promise<{ saved?: string; submitted?: string; error?: string }>;
}) {
  const [actor, query] = await Promise.all([requireProfile(), searchParams]);
  if (!actor.capabilities.includes("student")) redirect(ROUTES.guardianDependents);
  return <EnrollmentWorkspace actor={actor} targetProfileId={actor.$id} query={query} />;
}
