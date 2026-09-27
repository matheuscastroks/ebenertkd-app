import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StudentAccessTable } from "./student-access-table";
import type { Profile } from "@/features/auth/types";

describe("StudentAccessTable", () => {
  it("renders student profiles and supports sorting by name", async () => {
    const user = userEvent.setup();
    const profileA = {
      $id: "p-1",
      account_id: "u-1",
      full_name: "Carlos Eduardo",
      role: "adult_student",
      email: "carlos@example.com",
      status: "active",
      capabilities: ["student"],
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    } as unknown as Profile;
    const profileB = {
      $id: "p-2",
      account_id: "u-2",
      full_name: "Ana Clara",
      role: "adult_student",
      email: "ana@example.com",
      status: "active",
      capabilities: ["student"],
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    } as unknown as Profile;

    render(
      <StudentAccessTable
        profiles={[profileA, profileB]}
        currentQuery={{}}
      />
    );

    expect(screen.getAllByText("Carlos Eduardo")).toHaveLength(2);
    expect(screen.getAllByText("Ana Clara")).toHaveLength(2);

    const sortButton = screen.getByRole("button", { name: /Aluno:/i });

    // 1st click: asc -> Ana Clara first
    await user.click(sortButton);
    const ascItems = screen
      .getAllByText(/Carlos Eduardo|Ana Clara/)
      .map((el) => el.textContent);
    expect(ascItems[0]).toBe("Ana Clara");

    // 2nd click: desc -> Carlos Eduardo first
    await user.click(sortButton);
    const descItems = screen
      .getAllByText(/Carlos Eduardo|Ana Clara/)
      .map((el) => el.textContent);
    expect(descItems[0]).toBe("Carlos Eduardo");
  });
});
