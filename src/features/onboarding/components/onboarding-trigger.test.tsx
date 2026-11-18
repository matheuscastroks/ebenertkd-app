import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const replace = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/responsavel",
  useSearchParams: () => new URLSearchParams(search),
}));
vi.mock("@/app/actions/onboarding", () => ({
  saveOnboardingAction: vi.fn().mockResolvedValue({ success: true }),
  skipOnboardingAction: vi.fn().mockResolvedValue({ success: true }),
}));
import { skipOnboardingAction } from "@/app/actions/onboarding";
import { OnboardingTrigger } from "./onboarding-trigger";

beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); replace.mockReset(); search = ""; });
afterEach(() => { vi.useRealTimers(); });

it("não abre para quem já concluiu ou pulou", async () => {
  render(<OnboardingTrigger role="guardian" userName="Juliana" hasCompletedOnboarding />);
  await act(async () => { vi.advanceTimersByTime(500); });
  expect(screen.queryByText(/Passo 1 de 3/)).toBeNull();
});

it("pular persiste e limpa o pedido de rever a apresentação", async () => {
  search = "onboarding=true";
  render(<OnboardingTrigger role="guardian" userName="Juliana" hasCompletedOnboarding />);
  await act(async () => { vi.advanceTimersByTime(500); });
  await userEvent.click(await screen.findByRole("button", { name: /Pular apresentação/ }));
  await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/responsavel", { scroll: false }));
  expect(skipOnboardingAction).toHaveBeenCalled();
});
