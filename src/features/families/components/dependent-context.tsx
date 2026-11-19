import "server-only";
import { notFound } from "next/navigation";
import type { Profile } from "@/features/auth/types";
import { listGuardianMinors } from "@/features/families/service";
import { getAttendanceHistory } from "@/features/classes/attendance-history-service";
import { listProfilePhotoDocumentIds } from "@/features/students/service";
import { DependentHeader, type DependentSection } from "./dependent-header";

export async function DependentContext({ guardian, profileId, section }: { guardian: Profile; profileId: string; section: DependentSection }) {
  const minors = await listGuardianMinors(guardian);
  const minor = minors.find((item) => item.$id === profileId);
  if (!minor) notFound();
  const [history, photos] = await Promise.all([
    getAttendanceHistory(guardian, profileId), listProfilePhotoDocumentIds([profileId])
  ]);
  return <DependentHeader name={minor.full_name} rankKey={history.student?.rank_key}
    photoDocumentId={photos.get(profileId)} currentProfileId={profileId} section={section}
    siblings={minors.map((item) => ({ profileId: item.$id, name: item.full_name }))} />;
}
