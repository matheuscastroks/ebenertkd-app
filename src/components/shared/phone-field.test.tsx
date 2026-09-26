import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PhoneField } from "@/components/shared/phone-field";

describe("PhoneField", () => {
  it("formats initial value and updates value progressively as user types", () => {
    render(
      <PhoneField
        id="test-phone"
        name="test_phone"
        label="Telefone / WhatsApp"
        defaultValue="21965188988"
      />
    );

    const input = screen.getByLabelText("Telefone / WhatsApp") as HTMLInputElement;
    expect(input.value).toBe("(21) 9 6518-8988");

    fireEvent.change(input, { target: { value: "11988887777" } });
    expect(input.value).toBe("(11) 9 8888-7777");
  });

  it("renders with placeholder and required attribute", () => {
    render(
      <PhoneField
        id="emergency-phone"
        name="emergency_phone"
        label="Contato de emergência"
        required
      />
    );

    const input = screen.getByLabelText(/Contato de emergência/i) as HTMLInputElement;
    expect(input).toBeRequired();
    expect(input.placeholder).toBe("(21) 9 6518-8988");
  });
});
