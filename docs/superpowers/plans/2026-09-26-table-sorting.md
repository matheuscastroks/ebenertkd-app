# Interactive Table Sorting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 1-click interactive client-side column sorting (`null` -> `asc` -> `desc` -> `null`) across the main Admin tables (`EnrollmentTable`, `BillingTable`, `StudentAccessTable`) with a reusable hook and accessible UI component.

**Architecture:** A generic `useTableSort` hook manages sorting state and memoized item sorting via custom comparators. An accessible `<SortableTableHead>` component renders column headers with `aria-sort`, interactive hover states, and dynamic status icons (`ChevronsUpDown`, `ArrowUp`, `ArrowDown`). Applied consistently to tables and mobile cards.

**Tech Stack:** Next.js App Router (Client Components), React 19 (`useMemo`, `useState`), Lucide React icons, Tailwind CSS, Vitest & Testing Library.

---

### File Structure Map

1. `src/hooks/use-table-sort.ts` — Generic sorting hook with cycle logic and memoized sort output.
2. `src/hooks/use-table-sort.test.ts` — Comprehensive unit tests for hook cycling, custom comparators, tie-breakers, and fallback behavior.
3. `src/components/shared/sortable-table-head.tsx` — Accessible table header component with sorting buttons, aria-sort, and dynamic icons.
4. `src/components/shared/sortable-table-head.test.tsx` — Component tests for sort toggling and accessible states.
5. `src/features/students/components/enrollment-table.tsx` — Updated to client component with sorting on Aluno, Graduação (GUB hierarchy), Turma, Vencimento, and Status.
6. `src/features/students/components/enrollment-table.test.tsx` — Updated/extended tests for sorting behavior.
7. `src/features/billing/components/billing-table.tsx` — Updated to client component with sorting on Aluno, Competência, Vencimento, Valor (cents), and Status.
8. `src/features/billing/components/billing-table.test.tsx` — Updated/extended tests for billing sorting.
9. `src/features/students/components/student-access-table.tsx` — Dedicated client table component for `/admin/alunos/acessos` with sorting on Aluno, Tipo de Acesso, and Login.
10. `src/app/admin/alunos/acessos/page.tsx` — Uses `StudentAccessTable`.

---

### Task Breakdown

- [ ] **Task 1: Core Hook `useTableSort` & Tests**
  - [ ] Create `src/hooks/use-table-sort.test.ts` with test cases for cycling, asc/desc sort, and reset.
  - [ ] Implement `src/hooks/use-table-sort.ts`.
  - [ ] Verify test suite passes with `npx vitest run src/hooks/use-table-sort.test.ts`.

- [ ] **Task 2: UI Component `SortableTableHead` & Tests**
  - [ ] Create `src/components/shared/sortable-table-head.test.tsx` testing click handler and aria-sort.
  - [ ] Implement `src/components/shared/sortable-table-head.tsx`.
  - [ ] Verify component tests pass.

- [ ] **Task 3: Integration in `EnrollmentTable`**
  - [ ] Add `"use client"` and wire `useTableSort` with comparators (Aluno, Graduação GUB 10->0, Turma, Vencimento, Status).
  - [ ] Replace standard `<TableHead>` with `<SortableTableHead>`.
  - [ ] Ensure mobile view also displays sorted rows.
  - [ ] Update `src/features/students/components/enrollment-table.test.tsx` to verify sorting interaction.

- [ ] **Task 4: Integration in `BillingTable`**
  - [ ] Add `"use client"` and wire `useTableSort` with comparators (Aluno, Competência, Vencimento, Valor, Status).
  - [ ] Replace standard `<TableHead>` with `<SortableTableHead>`.
  - [ ] Ensure mobile view displays sorted rows.
  - [ ] Update `src/features/billing/components/billing-table.test.tsx`.

- [ ] **Task 5: Extraction & Integration of `StudentAccessTable`**
  - [ ] Create `src/features/students/components/student-access-table.tsx` with `useTableSort`.
  - [ ] Update `src/app/admin/alunos/acessos/page.tsx` to use the component.

- [ ] **Task 6: Full Verification & Validation**
  - [ ] Run full test suite (`npx vitest run`).
  - [ ] Run `npm run typecheck`.
  - [ ] Run `npm run lint`.
  - [ ] Run `npm run build`.
  - [ ] Commit and push to `origin/main`.
