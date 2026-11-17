import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
vi.mock("@/app/actions/account-deletion", () => ({ deleteSelfAccountAction: vi.fn() }));
import { DeleteAccountSection } from "./delete-account-section";
it("isola exclusao de conta com consequencia", () => {
 render(<DeleteAccountSection />);
 expect(screen.getByRole("region", { name: "Excluir conta" })).toHaveTextContent(/irreversível/i);
 expect(screen.getByRole("button", { name: "Excluir conta" })).toHaveAttribute("data-variant", "destructive");
});

