# Portal URL Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** alinhar a estrutura de pastas do App Router com URLs previsíveis por papel e recurso.

**Architecture:** cada área autenticada terá um namespace próprio (`admin`, `aluno`, `responsavel`). Matrículas administrativas serão um recurso de `admin`, a matrícula própria pertencerá a `aluno` e matrículas de dependentes ficarão abaixo do dependente correspondente. Componentes compartilhados concentrarão a renderização para evitar duplicação entre rotas.

**Tech Stack:** Next.js App Router, Server Components, Server Actions, Vitest.

---

### Task 1: Contrato central de rotas

**Files:**
- Create: `src/lib/navigation/routes.ts`
- Modify: `src/lib/auth/auth-utils.ts`
- Modify: `src/lib/auth/auth-utils.test.ts`
- Modify: `scripts/appwrite/validate-test-users.ts`

- [x] Definir helpers tipados para dashboards, matrícula própria, dependentes e revisão administrativa.
- [x] Direcionar aluno adulto e menor para `/aluno`.
- [x] Cobrir os caminhos públicos produzidos pelos helpers em testes unitários.

### Task 2: Reestruturar páginas do App Router

**Files:**
- Create: `src/app/aluno/matricula/page.tsx`
- Create: `src/app/responsavel/dependentes/page.tsx`
- Create: `src/app/responsavel/dependentes/[profileId]/matricula/page.tsx`
- Create: `src/app/admin/matriculas/page.tsx`
- Create: `src/app/admin/matriculas/[studentId]/page.tsx`
- Create: `src/features/students/components/enrollment-workspace.tsx`
- Modify: `src/app/aluno/page.tsx`
- Modify: `src/app/responsavel/page.tsx`
- Delete: `src/app/matricula/page.tsx`
- Delete: `src/app/menor/page.tsx`
- Delete: `src/app/admin/alunos/page.tsx`
- Delete: `src/app/admin/alunos/[studentId]/page.tsx`

- [x] Consolidar dashboards de aluno adulto e menor em `/aluno` com conteúdo apropriado ao papel.
- [x] Extrair workspace compartilhado para matrícula própria e de dependente.
- [x] Manter o `profileId` no segmento dinâmico da URL do responsável, sem query string.
- [x] Renomear o recurso administrativo para `matriculas`.

### Task 3: Atualizar navegação e ações

**Files:**
- Modify: `src/components/dashboard/portal-shell.tsx`
- Modify: `src/app/actions/enrollment.ts`
- Modify: `src/app/actions/enrollment-review.ts`
- Modify: `src/app/actions/family.ts`
- Modify: `src/features/students/components/review-panel.tsx`

- [x] Usar o contrato central em links, estados ativos, redirects e revalidações.
- [x] Redirecionar submissões de matrícula para a URL correspondente ao ator e aluno alvo.
- [x] Remover referências internas a `/matricula`, `/menor`, `/responsavel?profile` e `/admin/alunos`.

### Task 4: Compatibilidade e verificação

**Files:**
- Modify: `next.config.ts`
- Modify: `middleware.ts`

- [x] Redirecionar permanentemente URLs antigas para a nova hierarquia.
- [x] Confirmar proteção dos namespaces autenticados.
- [x] Executar testes, lint, typecheck e build; conferir a lista final de rotas do build.
- [x] Criar commits separados para contrato/rotas e documentação.
