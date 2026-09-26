import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/admin/matriculas",
  useSearchParams: () => mockSearchParams,
}));

import { EnrollmentFilters } from "@/features/students/components/enrollment-filters";
import type { TrainingClass } from "@/features/classes/types";

describe("EnrollmentFilters", () => {
  const dummyClasses = [
    { $id: "class-1", name: "Iniciantes" },
    { $id: "class-2", name: "Avançado" },
  ] as TrainingClass[];

  it("renders filter inputs and triggers search update with debounce", async () => {
    vi.useFakeTimers();
    mockSearchParams = new URLSearchParams();
    render(<EnrollmentFilters classes={dummyClasses} />);

    const searchInput = screen.getByLabelText("Aluno");
    fireEvent.change(searchInput, { target: { value: "Carlos" } });

    expect(mockReplace).not.toHaveBeenCalled();

    vi.advanceTimersByTime(350);

    expect(mockReplace).toHaveBeenCalledWith("/admin/matriculas?q=Carlos", { scroll: false });
    vi.useRealTimers();
  });

  it("shows clear button when filters are active and clears on click", () => {
    mockSearchParams = new URLSearchParams("q=Carlos&status=submitted");
    render(<EnrollmentFilters classes={dummyClasses} />);

    const clearButton = screen.getByRole("button", { name: "Limpar filtros" });
    expect(clearButton).toBeInTheDocument();

    fireEvent.click(clearButton);
    expect(mockReplace).toHaveBeenCalledWith("/admin/matriculas", { scroll: false });
  });
});
