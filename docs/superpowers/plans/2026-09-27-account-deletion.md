# Account Deletion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement irreversible account deletion for both students (self-deletion under Settings) and the professor/admin (student deletion under `/admin/alunos/acessos`), with an explicit safeguard popup requiring the user to type "EXCLUIR".

**Architecture:** A dedicated `account-deletion-service` manages Appwrite Auth user deletion, profile anonymization, guardian link removal, and session cleanup. Server actions handle authentication boundaries and revalidation. Accessible Alert Dialogs enforce typing "EXCLUIR" before executing the destructive action.

**Tech Stack:** Next.js App Router (Server Actions), React 19, Appwrite Users & TablesDB SDK, Tailwind CSS, Lucide React, Vitest.

---

### File Structure Map

1. `src/features/auth/account-deletion-service.ts` — Deletion logic for self and admin, protecting admin accounts and anonymizing personal data.
2. `src/features/auth/account-deletion-service.test.ts` — Unit tests for deletion logic, admin protections, and edge cases.
3. `src/app/actions/account-deletion.ts` — Server actions `deleteSelfAccountAction` and `deleteStudentAccountAction`.
4. `src/features/auth/components/delete-account-dialog.tsx` — Client component with safeguard input requiring "EXCLUIR" to activate destructive button.
5. `src/features/auth/components/delete-account-dialog.test.tsx` — Test verifying the button stays disabled until "EXCLUIR" is typed.
6. `src/features/auth/components/danger-zone-card.tsx` — Danger zone card for `/configuracoes`.
7. `src/features/students/components/admin-delete-student-dialog.tsx` — Admin deletion trigger and dialog for `StudentAccessTable`.
8. `src/features/students/components/student-access-table.tsx` — Integration of admin delete button in actions column.
9. `src/app/configuracoes/page.tsx` — Integration of `DangerZoneCard`.

---

### Task Breakdown

- [ ] **Task 1: Account Deletion Service & Tests**
  - [ ] Create `src/features/auth/account-deletion-service.test.ts`.
  - [ ] Implement `src/features/auth/account-deletion-service.ts`.
  - [ ] Verify tests pass with `npx vitest run src/features/auth/account-deletion-service.test.ts`.

- [ ] **Task 2: Server Actions for Account Deletion**
  - [ ] Implement `src/app/actions/account-deletion.ts` with session destruction for self-deletion and revalidation.

- [ ] **Task 3: DeleteAccountDialog Component & Tests**
  - [ ] Create `src/features/auth/components/delete-account-dialog.test.tsx`.
  - [ ] Implement `src/features/auth/components/delete-account-dialog.tsx`.
  - [ ] Implement `src/features/auth/components/danger-zone-card.tsx`.
  - [ ] Verify component tests pass.

- [ ] **Task 4: Admin Student Deletion in StudentAccessTable**
  - [ ] Implement `src/features/students/components/admin-delete-student-dialog.tsx`.
  - [ ] Update `src/features/students/components/student-access-table.tsx` to render delete button in Ações column.

- [ ] **Task 5: Integration in Settings Page**
  - [ ] Add `DangerZoneCard` to `src/app/configuracoes/page.tsx` (only for non-admin accounts).

- [ ] **Task 6: Verification & Git Commit**
  - [ ] Run full test suite, typecheck, lint, build.
  - [ ] Commit and push to `origin/main`.
