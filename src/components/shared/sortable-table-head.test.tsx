import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Table, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead } from "./sortable-table-head";

function renderSortableHead(props: Partial<Parameters<typeof SortableTableHead>[0]> = {}) {
  const onToggle = vi.fn();
  const utils = render(
    <Table>
      <TableHeader>
        <TableRow>
          <SortableTableHead
            title="Aluno"
            sortKey="student"
            currentSortKey={props.currentSortKey ?? null}
            currentDirection={props.currentDirection ?? null}
            onToggle={props.onToggle ?? onToggle}
            {...props}
          />
        </TableRow>
      </TableHeader>
    </Table>
  );
  return { ...utils, onToggle };
}

describe("SortableTableHead", () => {
  it("renders with aria-sort='none' when inactive", () => {
    renderSortableHead();
    const th = screen.getByRole("columnheader", { name: /Aluno/i });
    expect(th).toHaveAttribute("aria-sort", "none");
  });

  it("renders with aria-sort='ascending' when active in asc direction", () => {
    renderSortableHead({
      currentSortKey: "student",
      currentDirection: "asc",
    });
    const th = screen.getByRole("columnheader", { name: /Aluno/i });
    expect(th).toHaveAttribute("aria-sort", "ascending");
  });

  it("renders with aria-sort='descending' when active in desc direction", () => {
    renderSortableHead({
      currentSortKey: "student",
      currentDirection: "desc",
    });
    const th = screen.getByRole("columnheader", { name: /Aluno/i });
    expect(th).toHaveAttribute("aria-sort", "descending");
  });

  it("calls onToggle with the sortKey when clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    renderSortableHead({ onToggle });

    const button = screen.getByRole("button", { name: /Aluno/i });
    await user.click(button);

    expect(onToggle).toHaveBeenCalledWith("student");
  });
});
