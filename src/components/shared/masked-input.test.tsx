import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MaskedInput } from "@/components/shared/masked-input";

describe("MaskedInput", () => {
  it("formats initial defaultValue and live user input for CPF", () => {
    render(<MaskedInput mask="cpf" aria-label="CPF" defaultValue="12345678901" />);
    const input = screen.getByLabelText("CPF");
    expect(input).toHaveValue("123.456.789-01");

    fireEvent.change(input, { target: { value: "98765432100" } });
    expect(input).toHaveValue("987.654.321-00");
  });

  it("formats CEP, phone, CNPJ and UF inputs", () => {
    render(
      <div>
        <MaskedInput mask="cep" aria-label="CEP" />
        <MaskedInput mask="phone" aria-label="Telefone" />
        <MaskedInput mask="cnpj" aria-label="CNPJ" />
        <MaskedInput mask="uf" aria-label="UF" />
      </div>
    );

    fireEvent.change(screen.getByLabelText("CEP"), { target: { value: "21931580" } });
    expect(screen.getByLabelText("CEP")).toHaveValue("21931-580");

    fireEvent.change(screen.getByLabelText("Telefone"), { target: { value: "21965188988" } });
    expect(screen.getByLabelText("Telefone")).toHaveValue("(21) 9 6518-8988");

    fireEvent.change(screen.getByLabelText("CNPJ"), { target: { value: "12345678000195" } });
    expect(screen.getByLabelText("CNPJ")).toHaveValue("12.345.678/0001-95");

    fireEvent.change(screen.getByLabelText("UF"), { target: { value: "sp1" } });
    expect(screen.getByLabelText("UF")).toHaveValue("SP");
  });

  it("reformats value when mask prop changes dynamically", () => {
    const { rerender } = render(
      <MaskedInput mask="none" aria-label="Chave PIX" defaultValue="12345678901" />
    );
    expect(screen.getByLabelText("Chave PIX")).toHaveValue("12345678901");

    rerender(<MaskedInput mask="cpf" aria-label="Chave PIX" defaultValue="12345678901" />);
    expect(screen.getByLabelText("Chave PIX")).toHaveValue("123.456.789-01");
  });
});
