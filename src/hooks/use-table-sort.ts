import { useCallback, useMemo, useState } from "react";

export type SortDirection = "asc" | "desc";

export interface UseTableSortOptions<T, K extends string> {
  initialKey?: K | null;
  initialDirection?: SortDirection | null;
  defaultDirection?: Partial<Record<K, SortDirection>>;
  comparators: Record<K, (a: T, b: T) => number>;
}

export function useTableSort<T, K extends string>(
  items: T[],
  options: UseTableSortOptions<T, K>
) {
  const [sortKey, setSortKey] = useState<K | null>(options.initialKey ?? null);
  const [sortDirection, setSortDirection] = useState<SortDirection | null>(
    options.initialDirection ?? null
  );

  const toggleSort = useCallback(
    (key: K) => {
      if (sortKey !== key) {
        setSortKey(key);
        const startDir = options.defaultDirection?.[key] ?? "asc";
        setSortDirection(startDir);
        return;
      }

      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortKey(null);
        setSortDirection(null);
      } else {
        setSortDirection(options.defaultDirection?.[key] ?? "asc");
      }
    },
    [sortKey, sortDirection, options.defaultDirection]
  );

  const resetSort = useCallback(() => {
    setSortKey(null);
    setSortDirection(null);
  }, []);

  const sortedItems = useMemo(() => {
    if (!sortKey || !sortDirection) {
      return items;
    }
    const comparator = options.comparators[sortKey];
    if (!comparator) {
      return items;
    }

    return [...items].sort((a, b) => {
      const result = comparator(a, b);
      return sortDirection === "desc" ? -result : result;
    });
  }, [items, sortKey, sortDirection, options.comparators]);

  return {
    sortedItems,
    sortKey,
    sortDirection,
    toggleSort,
    resetSort,
  };
}
