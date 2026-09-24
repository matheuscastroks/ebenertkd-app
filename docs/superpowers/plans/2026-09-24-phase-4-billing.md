# Phase 4 Billing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** gerar mensalidades únicas, receber comprovantes PIX, reconciliar pagamentos manualmente e entregar um painel financeiro exportável.

**Architecture:** cobranças possuem chave determinística por matrícula, tipo, competência e origem. Comprovantes são versionados no bucket privado; aprovação, pagamento e mudança de estado usam transação TablesDB. Regras de calendário, totais e CSV permanecem puras e testáveis, enquanto a rotina diária gera mensalidades e atualiza atrasos.

**Tech Stack:** Next.js App Router, Appwrite TablesDB Transactions/Storage/Functions, Zod, Vitest e CSV UTF-8.

---

### Task 1: Modelo e regras financeiras

**Files:** `src/lib/appwrite/ids.ts`, `scripts/appwrite/schema.ts`, `scripts/appwrite/schema.test.ts`, `src/features/billing/types.ts`, `schemas.ts`, `rules.ts`, `rules.test.ts`

- [x] Criar `charges`, `payment_proofs`, `payments`, `payment_reversals` e `billing_settings`, incluindo a unicidade `enrollment_id + charge_type + competence + origin_id`.
- [x] Implementar vencimento ajustado ao último dia do mês, chave idempotente, estado de atraso e agregação por data efetiva.
- [x] Testar fevereiro comum/bissexto, dias 29–31, vigência, cobranças pagas distintas e alunos pagadores distintos.
- [x] Executar `npm test -- src/features/billing scripts/appwrite/schema.test.ts`.

### Task 2: Geração e integração com contratos

**Files:** `src/features/billing/charge-service.ts`, `generate-charges.ts`, `src/features/contracts/signature-service.ts`, `cancellation-service.ts`, `appwrite/functions/daily-operations/src/main.js`

- [x] Criar a primeira mensalidade somente após assinatura, usando `first_due_date` e valor líquido aprovado.
- [x] Gerar competências seguintes quando faltarem até sete dias para o mês e somente dentro da vigência.
- [x] Marcar pendências vencidas sem alterar pagamentos, cancelamentos ou comprovantes em análise.
- [x] Ao aprovar cancelamento, cancelar mensalidades futuras e criar taxa de saída quando o valor decidido for maior que zero.

### Task 3: PIX, comprovantes e pagamentos

**Files:** `src/features/billing/settings-service.ts`, `proof-service.ts`, `payment-service.ts`, `src/app/actions/billing.ts`, `src/app/api/payment-proofs/[proofId]/route.ts`

- [x] Permitir ao professor configurar chave PIX, tipo e favorecido.
- [x] Validar e armazenar comprovantes JPEG/PNG/WebP/PDF privados, mantendo versões anteriores.
- [x] Aprovar/rejeitar comprovante com motivo; aprovação cria pagamento e atualiza cobrança em transação idempotente.
- [x] Permitir lançamento manual e estorno auditável sem apagar registros.

### Task 4: Portais, painel e CSV

**Files:** rotas sob `src/app/admin/financeiro/`, `src/app/aluno/financeiro/`, `src/app/responsavel/dependentes/[profileId]/financeiro/`, componentes em `src/features/billing/components/`, `src/features/billing/report-service.ts`

- [x] Mostrar cobranças, PIX copiável, envio de comprovante e histórico ao pagador correto.
- [x] Exibir recebido no período, pendente, atrasado, em análise, cobranças pagas e alunos distintos.
- [x] Filtrar por competência, aluno, turma e tipo com paginação; listar inadimplentes e comprovantes pendentes.
- [x] Exportar CSV UTF-8 com competência, aluno, tipo, valor, vencimento, pagamento e estado.

### Task 5: Infraestrutura e entrega

**Files:** `plan/fase-4-financeiro.md`

- [x] Rodar `npm test`, `npm run lint`, `npm run typecheck` e `npm run build`.
- [ ] Aplicar e verificar o schema no Appwrite; publicar `daily-operations` com o comando versionado do projeto.
- [ ] Atualizar o plano comprovado e separar commits de domínio/infra, experiência financeira e documentação.
