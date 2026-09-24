import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/training-classes", () => ({ setTrainingClassStatusAction: vi.fn() }));
vi.mock("@/components/ui/switch", () => ({
  Switch: ({ onCheckedChange, ...props }: React.ComponentProps<"button"> & { onCheckedChange?: () => void }) => (
    <button type="button" role="switch" aria-checked={Boolean(props.defaultChecked)} onClick={onCheckedChange} {...props} />
  ),
}));

import { ClassStatusToggle } from "@/features/classes/components/class-status-toggle";

describe("ClassStatusToggle", () => {
  it("submits the inverse status when toggled", () => {
    const requestSubmit = vi.spyOn(HTMLFormElement.prototype, "requestSubmit").mockImplementation(() => undefined);
    const { container } = render(<ClassStatusToggle classId="class-1" active />);
    expect(container.querySelector('input[name="class_id"]')).toHaveValue("class-1");
    expect(container.querySelector('input[name="status"]')).toHaveValue("inactive");
    fireEvent.click(screen.getByRole("switch", { name: "Desativar turma" }));
    expect(requestSubmit).toHaveBeenCalledOnce();
    requestSubmit.mockRestore();
  });
});
