# Phase 3 Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** emitir contratos versionados, coletar assinatura autenticada, preservar um PDF verificável e administrar cancelamentos e vencimentos.

**Architecture:** o modelo editável publica versões imutáveis; a liberação da matrícula cria um contrato com snapshot e hash da versão. A assinatura é autorizada no servidor, salva evidência e PDF privado de forma idempotente, então ativa a matrícula. Cancelamentos e renovações usam regras puras testadas e decisões administrativas auditáveis.

**Tech Stack:** Next.js App Router, Server Actions, Appwrite TablesDB/Storage, Zod, pdf-lib, Web Canvas, SHA-256 e Vitest.

---

### Task 1: Persistência e regras puras

**Files:** `src/lib/appwrite/ids.ts`, `scripts/appwrite/schema.ts`, `scripts/appwrite/schema.test.ts`, `src/features/contracts/types.ts`, `src/features/contracts/schemas.ts`, `src/features/contracts/rules.ts`, `src/features/contracts/rules.test.ts`

- [x] Criar tabelas `contract_templates`, `contract_versions`, `contracts`, `contract_signatures` e `cancellation_requests`, com índices por matrícula, aluno, estado e versão.
- [x] Definir `renderContractTemplate(template, variables)` para aceitar somente `student.*`, `guardian.*`, `academy.*`, `financial.*` e `contract.*`, lançando `unknown_contract_variable` para qualquer token desconhecido.
- [x] Testar hash estável, prazo de renovação em 30/7 dias, dia 20/21, virada do ano e seis meses exatos.
- [x] Executar `npm test -- src/features/contracts/rules.test.ts scripts/appwrite/schema.test.ts` e esperar todos os testes verdes.

### Task 2: Modelo administrativo e emissão

**Files:** `src/features/contracts/template-service.ts`, `src/features/contracts/contract-service.ts`, `src/app/actions/contracts.ts`, `src/app/admin/contratos/modelo/page.tsx`, `src/components/dashboard/portal-shell.tsx`, `src/lib/navigation/routes.ts`, `src/features/students/enrollment-service.ts`

- [x] Implementar `saveContractTemplateDraft`, `publishContractTemplate` e `getPublishedContractVersion`; publicação cria uma nova linha imutável com SHA-256.
- [x] Implementar `issueContractForEnrollment`, congelando conteúdo, partes, mensalidade e vigência; reutilizar contrato pendente para garantir idempotência.
- [x] Fazer `advanceToSignature` exigir versão publicada e emitir o contrato antes de mover a matrícula para `awaiting_signature`.
- [x] Criar tela administrativa para editar/publicar o texto e incluir o link “Contratos” na sidebar.

### Task 3: Assinatura e PDF privado

**Files:** `src/features/contracts/pdf.ts`, `src/features/contracts/signature-service.ts`, `src/features/contracts/components/signature-pad.tsx`, `src/features/contracts/components/contract-workspace.tsx`, `src/app/actions/contract-signature.ts`, rotas sob `src/app/aluno/contratos/` e `src/app/responsavel/dependentes/[profileId]/contratos/`, `src/app/api/contracts/[contractId]/pdf/route.ts`

- [x] Criar `buildSignedContractPdf` com identificação, texto congelado, vigência, assinatura, hash e paginação.
- [x] Exigir leitura até o fim, aceite e traço no canvas; validar novamente tudo no servidor.
- [x] Autorizar aluno adulto e responsável vinculado, negar menor e terceiro, persistir assinatura, PDF e ativação de modo repetível.
- [x] Entregar o PDF por endpoint autenticado sem URL pública.

### Task 4: Cancelamento, renovação e operação

**Files:** `src/features/contracts/cancellation-service.ts`, `src/features/contracts/renewal-service.ts`, `src/app/actions/cancellations.ts`, páginas de cancelamento do aluno/responsável e revisão administrativa, `appwrite/functions/daily-operations/src/main.js`

- [x] Criar solicitação com mês de saída e sugestão de multa calculada no servidor.
- [ ] Integrar a decisão com cobranças futuras e débitos existentes quando as entidades financeiras forem criadas na Fase 4.
- [x] Marcar contratos vencidos como `expired` e matrículas como `awaiting_renewal`; gerar eventos de aviso com chaves idempotentes em D-30 e D-7.
- [x] Exibir contratos e solicitações nas áreas correspondentes, com caminhos contextuais por papel.

### Task 5: Verificação e entrega

**Files:** `plan/fase-3-contratos.md`

- [x] Rodar `npm test`, `npm run lint`, `npm run typecheck` e `npm run build`.
- [x] Rodar `npm run infra:plan`; aplicar o schema com `npm run infra:apply` quando o Appwrite estiver acessível.
- [x] Marcar somente os itens comprovados da Fase 3 e criar commits separados para domínio/infra, assinatura/UI e documentação.

**Dependência registrada:** a assinatura ativa a matrícula, mas a criação da primeira cobrança e o cancelamento de cobranças futuras pertencem à Fase 4 e permanecem deliberadamente fora desta entrega.
