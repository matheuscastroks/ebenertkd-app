"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "@/components/ui/icons";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { SortDirection } from "@/hooks/use-table-sort";

export interface SortableTableHeadProps<K extends string>
  extends Omit<ComponentPropsWithoutRef<typeof TableHead>, "children" | "onToggle"> {
  title: string;
  sortKey: K;
  currentSortKey: K | null;
  currentDirection: SortDirection | null;
  onToggle: (key: K) => void;
  align?: "left" | "right" | "center";
  children?: ReactNode;
}

export function SortableTableHead<K extends string>({
  title,
  sortKey,
  currentSortKey,
  currentDirection,
  onToggle,
  align = "left",
  className,
  children,
  ...props
}: SortableTableHeadProps<K>) {
  const isActive = currentSortKey === sortKey && currentDirection !== null;
  const ariaSort = isActive
    ? currentDirection === "asc"
      ? "ascending"
      : "descending"
    : "none";

  const nextDirectionLabel = !isActive
    ? "ordenar crescente"
    : currentDirection === "asc"
      ? "ordenar decrescente"
      : "remover ordenação";

  return (
    <TableHead
      aria-sort={ariaSort}
      className={cn("group/head p-0 font-medium first:pl-0 last:pr-0", className)}
      {...props}
    >
      <button
        type="button"
        onClick={() => onToggle(sortKey)}
        aria-label={`${title}: ${nextDirectionLabel}`}
        className={cn(
          "group flex h-11 w-full items-center gap-1.5 px-4 group-first/head:pl-5 group-last/head:pr-5 text-xs font-semibold transition-colors duration-(--duration-quick) ease-(--ease-smooth-out) motion-reduce:transition-none",
          "hover:bg-muted/60 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset",
          align === "right" && "justify-end",
          align === "center" && "justify-center",
          align === "left" && "justify-start",
          isActive
            ? "text-primary-text font-semibold"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <span>{children ?? title}</span>
        <span
          className={cn(
            "flex size-4 items-center justify-center transition-[transform,color] duration-(--duration-quick) ease-(--ease-smooth-out) motion-reduce:transition-none",
            isActive
              ? "text-primary-text"
              : "text-muted-foreground/40 group-hover:text-muted-foreground"
          )}
        >
          {isActive ? (
            currentDirection === "asc" ? (
              <ArrowUp className="size-3.5" aria-hidden="true" />
            ) : (
              <ArrowDown className="size-3.5" aria-hidden="true" />
            )
          ) : (
            <ChevronsUpDown className="size-3.5" aria-hidden="true" />
          )}
        </span>
      </button>
    </TableHead>
  );
}
