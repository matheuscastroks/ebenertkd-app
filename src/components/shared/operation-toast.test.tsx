import { render, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { OperationToast } from "./operation-toast";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }));

describe("OperationToast", () => {
  it("exibe feedback no Sonner e remove somente os parâmetros consumidos", async () => {
    window.history.replaceState({}, "", "/admin?error=save&page=2");
    render(<OperationToast tone="error" title="Não foi possível salvar" description="Revise os dados." clearParams={["error"]} />);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Não foi possível salvar", expect.objectContaining({ description: "Revise os dados." })));
    expect(window.location.search).toBe("?page=2");
  });
});
