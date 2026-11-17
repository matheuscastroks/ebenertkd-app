# UX — Operação do professor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** dashboard, matrículas, turmas e chamada do professor focados em tarefas, honestos sobre erros e confortáveis no celular. Nota inicial 7,0/10.

**Architecture:** mudanças por página e componente; sem tocar nos arquivos de fundação. Tons de status via `StatusBadge`.

**Tech Stack:** Next.js 16, React 19, shadcn/ui, Vitest + Testing Library.

**Spec:** [plano mestre](./2026-11-17-00-orquestracao-mestre.md); [contrato de design](../../ux/contrato-de-design.md); auditoria "operação do professor" de 2026-11-17.

**Branch:** `feat/ux-admin-operacao`. **Depende de:** Onda 1.

## Global Constraints

As do plano mestre e do contrato de design.

## Review Focus

- Consulta falha e o dashboard diz "Tudo em dia!" (falso positivo grave).
- "Marcar todos presentes" apaga marcações já feitas.
- Alternar turma com falha deixa a interface mostrando o estado errado.
- Dado inventado ("Dojô Ebenézer TKD") quando o local não está cadastrado.

## Status

- Feito: implementação das tarefas 1–5; dashboard, chamada, alternância de turma e filtros cobertos por testes direcionados.
- Pendente: validação visual a 375px nos dois temas e gates globais da tarefa 6.
- Bloqueios: nenhum bloqueio de código.

## Registro de progresso

- 2026-11-17: tarefas 1–5 implementadas diretamente na main por autorização do dono. Testes direcionados: 6 arquivos, 15 testes passando (`.tmp-operation-green.log` e `.tmp-manager-green.log`); inclui falha de consulta, identificação da cobrança, ordenação de treinos, preservação da chamada, rollback de turma, filtros e ação conforme status. Ordenação de matrículas permanece limitada à página atual, com aviso explícito conforme alternativa prevista na tarefa 4. Validação visual e gates globais ficam pendentes. Não houve acesso ao Appwrite de produção.
- 2026-11-17: plano criado.

### Task 1: Dashboard honesto e enxuto (P0.5, P1.6–P1.9, P1.14, P1.15)

**Files:**
- Modify: `src/app/admin/page.tsx:46-53,81-167,203-205,249-276,313,334-367`
- Test: `src/app/admin/dashboard-pending.test.tsx` (criar)

- [x] **Step 1:** Testes: `consulta de pendências que falha mostra "Não foi possível carregar pendências" com botão Tentar novamente, nunca "Tudo em dia"`; `comprovante exibe nome do aluno e link direto para a cobrança`; `treinos de hoje ordenados por horário`; `sem card "Operação e Comunicação" nem "Alunos adimplentes"`.
- [x] **Step 2:** Rodar `npx vitest run src/app/admin` e ver falhar.
- [x] **Step 3:** Substituir os `.catch(() => ({ rows: [] }))` por estado de erro explícito; pendências em lista simples com divisórias (sem cards aninhados); dois indicadores (em atraso, recebido no mês); remover atalhos duplicados da sidebar e o checklist com itens fixos; título "Hoje · segunda-feira"; padronizar a ação em "Fazer chamada"; remover comentários que narram a interface; local ausente = "Local não informado".
- [x] **Step 4:** Rodar testes e ver passar.
- [ ] **Step 5:** Commit `fix: dashboard do professor mostra erro real e prioriza pendências`.

### Task 2: Chamada rápida e segura (P0.2, P0.3, P1.15, P2.16)

**Files:**
- Modify: `src/features/classes/components/attendance-sheet.tsx:50-89`
- Test: `attendance-sheet.test.tsx` (atualizar)

- [x] **Step 1:** Testes: `"Marcar restantes como presentes" preenche só quem não tem status`; `cabeçalho compacto sem texto técnico "gravada em lote único"`; `botões de status mantêm h-11`.
- [x] **Step 2:** Rodar e ver falhar.
- [x] **Step 3:** Preencher só os não marcados; compactar cabeçalho e linha do aluno (botões ≥44px); barra de salvar com fundo sólido e `shadow-xs`; copy "Salvar só ao concluir".
- [x] **Step 4:** Rodar e ver passar.
- [ ] **Step 5:** Commit `fix: chamada preserva marcações e fica mais compacta no celular`.

### Task 3: Turmas — alternância confirmada e página limpa (P0.1, P1.9, P1.11, P2.17–P2.20)

**Files:**
- Modify: `src/features/classes/components/class-status-toggle.tsx`, `class-manager.tsx:139,149,193,221-247`, `src/app/admin/turmas/[classId]/page.tsx:76-181`
- Test: `class-status-toggle.test.tsx` (atualizar)

- [x] **Step 1:** Testes: `toggle usa useOptimistic, fica disabled durante o envio e reverte se a action falhar`; `área de toque ≥44px`; `notice recebe tone explícito`; `título é "Turmas"`.
- [x] **Step 2:** Rodar e ver falhar.
- [x] **Step 3:** `useOptimistic`/`useTransition`; toast "Turma pausada" com aviso de que some da matrícula; `tone` vindo da page (sem `includes("não")`); remover duplicação de nome/horário no card; dias em chips curtos "Seg"; remover tooltip "?" e `hover:border-primary/40` em cards não clicáveis.
- [x] **Step 4:** Rodar e ver passar.
- [ ] **Step 5:** Commit `fix: alternância de turma com estado otimista e confirmação`.

### Task 4: Matrículas — filtros e ação certa (P1.12, P1.13, P2.22)

**Files:**
- Modify: `src/features/students/components/enrollment-filters.tsx:72-149`, `enrollment-table.tsx:138,178`, `src/app/admin/matriculas/page.tsx`
- Test: `enrollment-filters.test.tsx`, `enrollment-table.test.tsx` (atualizar)

- [x] **Step 1:** Testes: `no mobile só a busca fica visível e Filtros abre o resto com contagem de ativos`; `botão é "Analisar" só para enviada/em análise e "Ver" nas demais`; `pendentes aparecem primeiro por padrão`.
- [x] **Step 2:** Rodar e ver falhar.
- [x] **Step 3:** Filtros em colapsável com chips; `useTransition` no `router.replace` (opacidade durante a troca); ordenação padrão por status pendente; ordenação feita no servidor ou aviso "ordena a página atual".
- [x] **Step 4:** Rodar e ver passar.
- [ ] **Step 5:** Commit `feat: filtros de matrícula recolhíveis e ação conforme o status`.

### Task 5: Acessibilidade e consistência (P0.4, P1.10)

**Files:** `src/app/admin/matriculas/page.tsx:88`, `src/app/admin/page.tsx:63`, botões `h-7/h-8/h-9` listados na auditoria.

- [x] **Step 1:** Teste `ícones decorativos têm aria-hidden` e `size-4.5` substituído por classe válida.
- [ ] **Step 2:** Rodar e ver falhar.
- [x] **Step 3:** `aria-hidden` nos ícones; `min-h-11` no mobile para botões de ação; `text-sm` como piso.
- [x] **Step 4:** Rodar e ver passar.
- [ ] **Step 5:** Commit `fix: alvos de toque e ícones acessíveis na operação`.

### Task 6: Fechamento da área

- [ ] **Step 1:** `npm run typecheck && npm run lint && npm test && npm run build`; remover as exceções desta área da lista do teste `design-contract` (plano 01, tarefa 7).
- [ ] **Step 2:** Conferir dashboard, chamada e matrículas em 375px, claro e escuro.
- [ ] **Step 3:** Atualizar este plano e o mestre; abrir PR.
