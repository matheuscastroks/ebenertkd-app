import type { ReactNode } from "react";
import { DashboardFrame } from "@/components/dashboard/dashboard-shell";
import type { Profile } from "@/features/auth/types";
import { countEnrollmentsRequiringReview, getOwnStudentAvatarSex } from "@/features/students/service";
import { countUnreadNotifications } from "@/features/notifications/notification-service";
import { navigationForProfile } from "@/lib/navigation/routes";

export async function PortalFrame({ profile, children }: { profile: Profile; children: ReactNode }) {
  const badge = profile.role === "admin" ? "Professor" : profile.role === "guardian" ? "Responsável" : "Aluno";
  const [enrollments, notifications, avatarSex] = await Promise.all([profile.role === "admin" ? countEnrollmentsRequiringReview().catch(() => 0) : Promise.resolve(undefined), countUnreadNotifications(profile).catch(() => 0), getOwnStudentAvatarSex(profile).catch(() => null)]);
  const email = profile.email || (profile.username ? `@${profile.username}` : undefined);

  let avatarUrl: string | undefined;
  try {
    if (profile.onboarding_preferences) {
      const prefs = JSON.parse(profile.onboarding_preferences) as { avatar_file_id?: string };
      if (prefs.avatar_file_id) {
        avatarUrl = `/api/profile/avatar/${prefs.avatar_file_id}`;
      }
    }
  } catch {
    // Ignore invalid JSON in preferences
  }

  return (
    <DashboardFrame
      badge={badge}
      profileName={profile.full_name}
      profileEmail={email}
      role={profile.role}
      capabilities={profile.capabilities}
      avatarUrl={avatarUrl}
      avatarSex={avatarSex}
      navItems={navigationForProfile(profile, { enrollments, notifications })}
      unreadNotifications={notifications}
    >
      {children}
    </DashboardFrame>
  );
}
