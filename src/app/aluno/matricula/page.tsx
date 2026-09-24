import { redirect } from "next/navigation";
import { resolveStudentProfile } from "@/features/students/access";
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
  const target = await resolveStudentProfile(actor, actor.$id);
  return <EnrollmentWorkspace actor={actor} target={target} query={query} activePath={ROUTES.studentEnrollment} />;
}
