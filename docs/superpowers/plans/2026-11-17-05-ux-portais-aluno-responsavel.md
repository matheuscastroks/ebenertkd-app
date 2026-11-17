# UX — Portais do aluno e do responsável Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** painel do aluno com treino, pendência e faixa em ordem simples; responsável sempre sabendo de qual filho está tratando; matrícula em passos. Nota inicial 6,5/10.

**Architecture:** helper compartilhado `getOutstandingCharge`, contexto do dependente em um cabeçalho comum, `GraduationCard` simplificado e o formulário de matrícula dividido em etapas com rascunho local.

**Tech Stack:** Next.js 16, React 19, shadcn/ui, Vitest + Testing Library.

**Spec:** [plano mestre](./2026-11-17-00-orquestracao-mestre.md); [contrato de design](../../ux/contrato-de-design.md); auditoria "portais" de 2026-11-17. Exames do portal: PR #2.

**Branch:** `feat/ux-portais`. **Depende de:** Onda 1 e do PR #2 mesclado.

## Global Constraints

As do plano mestre e do contrato. Menor nunca recebe dado financeiro (`showFinancial`).

## Review Focus

- Responsável com comprovante em análise vendo "Em dia".
- Frequência "100%" com zero aulas.
- Responsável com 2+ filhos pagando ou assinando para o filho errado.
- Menor vendo qualquer dado financeiro após a refatoração do painel.
- Perda do que foi digitado na matrícula ao recarregar.

## Status

- Feito: nada.
- Pendente: tarefas 1 a 7.
- Bloqueios: aguarda Onda 1 e PR #2.

## Registro de progresso

- 2026-11-17: plano criado.

### Task 1: Pendência financeira correta e compartilhada (P0.1, P1.7, P1.12)

**Files:**
- Create: `src/features/billing/outstanding.ts`, `outstanding.test.ts`
- Modify: `src/app/responsavel/page.tsx:42,81-83,110-118,162-175,213`, `src/app/aluno/page.tsx:49-70`

**Interfaces:**
- Produces: `getOutstandingCharge(charges: Charge[]): Charge | undefined` — escolhe a de vencimento mais próximo entre `pending`, `overdue`, `proof_under_review`; `outstandingLabel(charge): "Pendente" | "Em atraso" | "Comprovante em análise"`.

- [ ] **Step 1:** Testes em `outstanding.test.ts`: `comprovante em análise não é "Em dia"`, `escolhe o vencimento mais próximo`, `vazio retorna undefined`.
- [ ] **Step 2:** Rodar `npx vitest run src/features/billing/outstanding.test.ts` e ver falhar.
- [ ] **Step 3:** Implementar; usar no aluno e no responsável; trocar `emerald/amber` por `StatusBadge`; chamar `listGuardianMinors` uma vez e passar por props.
- [ ] **Step 4:** Rodar e ver passar.
- [ ] **Step 5:** Commit `fix: responsável vê comprovante em análise em vez de "Em dia"`.

### Task 2: Contexto do filho em todas as subpáginas (P0.2, P2.13)

**Files:**
- Create: `src/features/families/components/dependent-header.tsx`, `dependent-header.test.tsx`
- Modify: `src/app/responsavel/dependentes/[profileId]/{financeiro,frequencia,exames,contratos,matricula}/page.tsx`

**Interfaces:**
- Produces: `DependentHeader({ name: string; belt?: string | null; gub?: number | null; photoDocumentId?: string | null; siblings: Array<{ profileId: string; name: string }>; currentProfileId: string; section: "financeiro" | "frequencia" | "exames" | "contratos" | "matricula" })` com seletor para trocar de filho mantendo a seção.

- [ ] **Step 1:** Testes: `mostra o nome do filho e a faixa`, `seletor lista os irmãos e navega para a mesma seção`, `com um único filho não mostra seletor`.
- [ ] **Step 2:** Rodar e ver falhar.
- [ ] **Step 3:** Implementar e usar nas 5 subpáginas; títulos "Financeiro · {nome}".
- [ ] **Step 4:** Rodar e ver passar.
- [ ] **Step 5:** Commit `feat: cabeçalho do dependente com seletor de filho`.

### Task 3: Frequência sem número falso e alvos de toque (P0.3, P0.4, P2.14, P2.16)

**Files:** `src/app/aluno/page.tsx:267`, `src/features/classes/components/attendance-history.tsx` (~l.105,118,290), `src/app/responsavel/page.tsx:180-200`, `src/features/billing/components/payer-billing-view.tsx:59`

- [ ] **Step 1:** Testes: `sem aulas registradas mostra "—" e "Ainda sem aulas registradas", nunca 100%`; `texto de assiduidade neutro`; `botões de ação têm min-h-11`.
- [ ] **Step 2:** Rodar e ver falhar.
- [ ] **Step 3:** Tratar `total === 0`; `min-h-11` e `text-sm` nos controles; copy: "Pagar mensalidade", "Hoje, 19h às 20h".
- [ ] **Step 4:** Rodar e ver passar.
- [ ] **Step 5:** Commit `fix: frequência sem dados mostra "—" e controles com alvo de 44px`.

### Task 4: Painel do aluno enxuto (P1.5, P1.10, P1.11)

**Files:** `src/app/aluno/page.tsx:127-309,393-394`

- [ ] **Step 1:** Testes: `ordem: treino, pendência (card único), faixa`; `não repete a pendência em MetricCard`; `não mostra nome e e-mail do próprio usuário`; `menor não vê financeiro`.
- [ ] **Step 2:** Rodar e ver falhar.
- [ ] **Step 3:** Remover MetricCards redundantes; frequência vira uma linha no card do treino; "Meus dados" e "Documentos" como lista de links ao fim; checklist de onboarding derivado de dados reais ou removido após a matrícula.
- [ ] **Step 4:** Rodar e ver passar.
- [ ] **Step 5:** Commit `refactor: painel do aluno em três blocos`.

### Task 5: Cartão de graduação simples (P1.6, P2.17)

**Files:** `src/features/students/components/graduation-card.tsx`, `graduation-card.test.tsx`, `src/features/exams/components/student-exams-view.tsx:39-44`

- [ ] **Step 1:** Testes: `mostra BeltBadge, "Próximo: Y" e frequência para o exame`; `sem barra de % até Faixa Preta`; `sem texto da Confederação`; `usa tokens (sem neutral-400/white fixos)`.
- [ ] **Step 2:** Rodar e ver falhar.
- [ ] **Step 3:** Reduzir para card simples; mover os "4 pilares" para um texto curto; estado vazio de exames sem ícone decorativo.
- [ ] **Step 4:** Rodar e ver passar.
- [ ] **Step 5:** Commit `refactor: cartão de graduação sem gamificação decorativa`.

### Task 6: Matrícula em passos com rascunho (P1.8, P1.9)

**Files:**
- Create: `src/features/students/components/enrollment-stepper.tsx`, `enrollment-stepper.test.tsx`
- Modify: `src/features/students/components/enrollment-form.tsx` (639 linhas: dividir em um componente por passo)

**Interfaces:**
- Produces: `EnrollmentStepper({ steps: Array<{ id: "pessoais" | "saude" | "treino" | "documentos"; title: string; isValid: boolean }>; current: number })` mostrando "Passo 2 de 4"; `useEnrollmentDraft(key: string)` que guarda o rascunho em `localStorage` (com `try/catch`) e mostra "Rascunho salvo".

- [ ] **Step 1:** Testes: `avançar só com o passo válido`, `rascunho restaura os campos após recarregar`, `CPF e telefone usam inputMode numeric`, `erro de ação recebe tone explícito`.
- [ ] **Step 2:** Rodar e ver falhar.
- [ ] **Step 3:** Dividir em 4 passos; validação no blur; barra de progresso simples no lugar do card lateral de 11 itens; tom do erro vindo da action.
- [ ] **Step 4:** Rodar e ver passar.
- [ ] **Step 5:** Commit `feat: matrícula em quatro passos com rascunho local`.

### Task 7: Fechamento da área

- [ ] **Step 1:** `npm run typecheck && npm run lint && npm test && npm run build`; remover as exceções desta área do teste `design-contract`.
- [ ] **Step 2:** Conferir os portais em 375px, claro e escuro, com conta de aluno adulto, menor e responsável de 2 filhos (projeto Appwrite separado).
- [ ] **Step 3:** Atualizar este plano e o mestre; abrir PR.
