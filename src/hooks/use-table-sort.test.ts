import { renderHook, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useTableSort } from "./use-table-sort";

interface Person {
  id: number;
  name: string;
  age: number;
}

const sampleItems: Person[] = [
  { id: 1, name: "Carlos", age: 30 },
  { id: 2, name: "Ana", age: 25 },
  { id: 3, name: "Beatriz", age: 28 },
];

describe("useTableSort", () => {
  const comparators = {
    name: (a: Person, b: Person) => a.name.localeCompare(b.name, "pt-BR"),
    age: (a: Person, b: Person) => a.age - b.age,
  };

  it("returns original items when no sort is active", () => {
    const { result } = renderHook(() =>
      useTableSort(sampleItems, { comparators })
    );

    expect(result.current.sortKey).toBeNull();
    expect(result.current.sortDirection).toBeNull();
    expect(result.current.sortedItems).toEqual(sampleItems);
  });

  it("cycles through asc -> desc -> null when toggling the same key", () => {
    const { result } = renderHook(() =>
      useTableSort(sampleItems, { comparators })
    );

    // 1st click: asc
    act(() => {
      result.current.toggleSort("name");
    });
    expect(result.current.sortKey).toBe("name");
    expect(result.current.sortDirection).toBe("asc");
    expect(result.current.sortedItems.map((p) => p.name)).toEqual([
      "Ana",
      "Beatriz",
      "Carlos",
    ]);

    // 2nd click: desc
    act(() => {
      result.current.toggleSort("name");
    });
    expect(result.current.sortKey).toBe("name");
    expect(result.current.sortDirection).toBe("desc");
    expect(result.current.sortedItems.map((p) => p.name)).toEqual([
      "Carlos",
      "Beatriz",
      "Ana",
    ]);

    // 3rd click: resets to null
    act(() => {
      result.current.toggleSort("name");
    });
    expect(result.current.sortKey).toBeNull();
    expect(result.current.sortDirection).toBeNull();
    expect(result.current.sortedItems).toEqual(sampleItems);
  });

  it("switches to new key in asc direction when a different key is clicked", () => {
    const { result } = renderHook(() =>
      useTableSort(sampleItems, { comparators })
    );

    act(() => {
      result.current.toggleSort("name");
    });
    expect(result.current.sortKey).toBe("name");

    act(() => {
      result.current.toggleSort("age");
    });
    expect(result.current.sortKey).toBe("age");
    expect(result.current.sortDirection).toBe("asc");
    expect(result.current.sortedItems.map((p) => p.age)).toEqual([25, 28, 30]);
  });

  it("respects defaultDirection if provided", () => {
    const { result } = renderHook(() =>
      useTableSort(sampleItems, {
        comparators,
        defaultDirection: { age: "desc" },
      })
    );

    act(() => {
      result.current.toggleSort("age");
    });
    expect(result.current.sortKey).toBe("age");
    expect(result.current.sortDirection).toBe("desc");
    expect(result.current.sortedItems.map((p) => p.age)).toEqual([30, 28, 25]);
  });

  it("resets sorting when resetSort is called", () => {
    const { result } = renderHook(() =>
      useTableSort(sampleItems, { comparators })
    );

    act(() => {
      result.current.toggleSort("name");
    });
    expect(result.current.sortKey).toBe("name");

    act(() => {
      result.current.resetSort();
    });
    expect(result.current.sortKey).toBeNull();
    expect(result.current.sortDirection).toBeNull();
    expect(result.current.sortedItems).toEqual(sampleItems);
  });
});
