import type { ReactNode } from "react";
import { DashboardFrame, DashboardShell } from "@/components/dashboard/dashboard-shell";
import type { Profile } from "@/features/auth/types";
import { countEnrollmentsRequiringReview } from "@/features/students/service";
import { countUnreadNotifications } from "@/features/notifications/notification-service";
import type { BackTarget } from "@/components/dashboard/section-nav";
import { navigationForProfile } from "@/lib/navigation/routes";

export async function PortalFrame({ profile, children }: { profile: Profile; children: ReactNode }) {
  const badge = profile.role === "admin" ? "Professor" : profile.role === "guardian" ? "Responsável" : "Aluno";
  const [enrollments, notifications] = await Promise.all([profile.role === "admin" ? countEnrollmentsRequiringReview().catch(() => 0) : Promise.resolve(undefined), countUnreadNotifications(profile).catch(() => 0)]);
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
      avatarUrl={avatarUrl}
      navItems={navigationForProfile(profile, { enrollments, notifications })}
      unreadNotifications={notifications}
    >
      {children}
    </DashboardFrame>
  );
}

export function PortalShell({ profile, title, subtitle, back, headerActions, children }: { profile: Profile; title: string; subtitle: string; back?: BackTarget; headerActions?: ReactNode; children: ReactNode }) {
  const badge = profile.role === "admin" ? "Professor" : profile.role === "guardian" ? "Responsável" : "Aluno";
  return <DashboardShell title={title} subtitle={subtitle} badge={badge} back={back} headerActions={headerActions}>{children}</DashboardShell>;
}
