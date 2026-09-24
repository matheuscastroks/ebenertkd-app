# Navigation, Classes and Enrollment Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** separar corretamente a ficha do aluno, permitir que o professor gerencie turmas e adotar a sidebar shadcn como shell de todos os painéis.

**Architecture:** uma tabela `training_classes` será a fonte das turmas disponíveis e o aluno persistirá o ID e o nome selecionados. Um `PortalShell` montará navegação por papel sobre `DashboardShell`, garantindo sidebar consistente em todas as rotas autenticadas. As opções fixas de graduação e vencimento ficarão centralizadas em regras de domínio compartilhadas pelo formulário e pela validação Zod.

**Tech Stack:** Next.js Server Components/Actions, Appwrite TablesDB, Zod, shadcn/ui Sidebar, Vitest.

---

### Task 1: Opções de domínio e schema de turmas

**Files:**
- Modify: `src/lib/appwrite/ids.ts`
- Modify: `scripts/appwrite/schema.ts`
- Modify: `scripts/appwrite/setup.ts`
- Create: `src/features/classes/types.ts`
- Create: `src/features/classes/service.ts`
- Modify: `src/features/students/schemas.ts`
- Test: `src/features/students/rules.test.ts`

- [x] Centralizar `BELT_OPTIONS`, GUBs `9..1` e vencimentos `5, 10, 15, 20, 25, 30` e testar rejeição de valores fora das listas.
- [x] Criar `training_classes` com nome, dias, horários, capacidade, status e timestamps.
- [x] Persistir `training_class_id` no aluno e validar no servidor que a turma selecionada está ativa.
- [x] Ensinar o reconciliador a atualizar limites de colunas inteiras existentes (`gub` e dias de vencimento).

### Task 2: Gestão administrativa de turmas

**Files:**
- Create: `src/app/actions/training-classes.ts`
- Create: `src/app/admin/turmas/page.tsx`
- Create: `src/features/classes/components/class-manager.tsx`

- [x] Criar turma com nome, dias da semana, início, término e capacidade opcional.
- [x] Editar os mesmos dados e ativar/desativar uma turma sem apagá-la.
- [x] Exibir feedback de sucesso/erro e impedir horários inválidos ou turma sem dia selecionado.

### Task 3: Formulário de matrícula por assunto

**Files:**
- Modify: `src/app/matricula/page.tsx`
- Modify: `src/app/actions/enrollment.ts`
- Modify: `src/features/students/components/enrollment-form.tsx`
- Modify: `src/features/students/enrollment-service.ts`

- [x] Separar cartões de dados pessoais, contato, emergência, Taekwondo, saúde, pagamento e documentos.
- [x] Trocar GUB, faixa, vencimento e turma por selects com opções controladas.
- [x] Carregar apenas turmas ativas, preservando a turma já escolhida ao editar um rascunho.

### Task 4: Sidebar como shell principal

**Files:**
- Modify: `src/components/dashboard/app-sidebar.tsx`
- Modify: `src/components/dashboard/dashboard-shell.tsx`
- Create: `src/components/dashboard/portal-shell.tsx`
- Modify: `src/components/dashboard/phase-one-panel.tsx`
- Modify: `src/app/admin/page.tsx`
- Modify: `src/app/admin/alunos/page.tsx`
- Modify: `src/app/admin/alunos/[studentId]/page.tsx`
- Modify: `src/app/aluno/page.tsx`
- Modify: `src/app/responsavel/page.tsx`
- Modify: `src/app/menor/page.tsx`
- Modify: `src/app/matricula/page.tsx`

- [x] Definir menus por papel com ícones e estado ativo: visão geral, matrículas, turmas e dependentes.
- [x] Renderizar todo conteúdo autenticado dentro de `SidebarProvider`, `AppSidebar` e `SidebarInset`.
- [x] Manter navegação móvel, recolhimento e logout acessíveis.

### Task 5: Verificação e entrega

- [x] Aplicar schema no Appwrite e confirmar `infra:plan` sem pendências.
- [x] Executar testes, lint, typecheck, build e smoke test.
- [ ] Verificar visualmente as rotas do aluno e do admin em desktop e celular.
- [x] Criar commits separados para turmas/domínio e shell/formulário.
