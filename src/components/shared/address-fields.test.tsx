import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddressFields } from "./address-fields";

vi.mock("@/lib/viacep", () => ({
  fetchAddressByCep: vi.fn(),
}));

import { fetchAddressByCep } from "@/lib/viacep";

describe("AddressFields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all address inputs and populates initial values from defaultValue", () => {
    render(
      <AddressFields
        defaultValue="Rua Abélia, 197 - Apto 201, Jardim Guanabara, Rio de Janeiro - RJ, CEP 21931-580"
        required
      />
    );

    const cepInput = screen.getByLabelText(/CEP/i) as HTMLInputElement;
    const streetInput = screen.getByLabelText(/Rua \/ Logradouro/i) as HTMLInputElement;
    const numberInput = screen.getByLabelText(/Número/i) as HTMLInputElement;
    const complementInput = screen.getByLabelText(/Complemento/i) as HTMLInputElement;

    expect(cepInput.value).toBe("21931-580");
    expect(streetInput.value).toBe("Rua Abélia");
    expect(numberInput.value).toBe("197");
    expect(complementInput.value).toBe("Apto 201");
  });

  it("calls ViaCEP when 8 digits are typed and autofills the fields", async () => {
    vi.mocked(fetchAddressByCep).mockResolvedValueOnce({
      cep: "21931-580",
      street: "Rua Abélia",
      neighborhood: "Jardim Guanabara",
      city: "Rio de Janeiro",
      state: "RJ",
    });

    render(<AddressFields />);

    const cepInput = screen.getByLabelText(/CEP/i) as HTMLInputElement;

    fireEvent.change(cepInput, { target: { value: "21931580" } });

    await waitFor(() => {
      expect(fetchAddressByCep).toHaveBeenCalledWith("21931580");
    });

    await waitFor(() => {
      const streetInput = screen.getByLabelText(/Rua \/ Logradouro/i) as HTMLInputElement;
      expect(streetInput.value).toBe("Rua Abélia");
    });

    expect(screen.getByText("Endereço localizado via CEP.")).toBeDefined();
  });

  it("displays message when CEP is not found", async () => {
    vi.mocked(fetchAddressByCep).mockResolvedValueOnce(null);

    render(<AddressFields />);

    const cepInput = screen.getByLabelText(/CEP/i) as HTMLInputElement;
    fireEvent.change(cepInput, { target: { value: "00000000" } });

    await waitFor(() => {
      expect(
        screen.getByText("CEP não localizado. Preencha os campos manualmente.")
      ).toBeDefined();
    });
  });
});
