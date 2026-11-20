import type { Profile } from "@/features/auth/types";
import { getStudentCheckInState } from "@/features/classes/check-in-service";
import { CheckInCard } from "@/features/classes/components/check-in-card";

/** Card de check-in do próprio aluno logado; some quando não há treino hoje. */
export async function CheckInSection({ profile }: { profile: Profile }) {
  const state = await getStudentCheckInState(profile).catch(() => null);
  if (!state) return null;
  return <CheckInCard state={state} />;
}
