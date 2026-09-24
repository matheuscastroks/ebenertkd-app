# Demo Data Seed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** preencher o ambiente de testes com dados fictícios coerentes, vinculando os usuários existentes a turmas, matrículas, contratos, cobranças e pagamentos sem gerar duplicatas.

**Architecture:** um script administrativo usa IDs determinísticos com prefixo `demo-` e operações de upsert no Appwrite. Os usuários e perfis existentes são descobertos por e-mail/username; nenhum usuário real é criado ou substituído. O seed cobre cenários de cobrança paga, pendente, vencida e com comprovante em análise para tornar os painéis úteis imediatamente.

**Tech Stack:** TypeScript, Node Appwrite SDK, Appwrite TablesDB/Storage, Vitest.

---

### Task 1: Catálogo determinístico do seed

**Files:**
- Create: `scripts/appwrite/demo-seed-data.ts`
- Create: `scripts/appwrite/demo-seed-data.test.ts`

- [x] Criar helpers puros `demoId`, `monthOffset`, `dueDate` e `buildDemoScenario`.
- [x] Testar estabilidade dos IDs, ajuste do último dia do mês e variedade de estados financeiros.
- [x] Executar `npm test -- scripts/appwrite/demo-seed-data.test.ts`; esperado: todos os testes aprovados.

### Task 2: Upserts relacionais

**Files:**
- Create: `scripts/appwrite/seed-demo-data.ts`
- Modify: `package.json`

- [x] Localizar e migrar os perfis existentes para as personas Camila Ferreira, Lucas Mendes e Pedro Ferreira.
- [x] Criar ou atualizar três turmas e um aluno/matrícula por perfil estudantil, preservando permissões do aluno e responsável.
- [x] Publicar um modelo de contrato de demonstração e criar contratos assinados coerentes com matrículas ativas.
- [x] Criar configuração PIX fictícia, cobranças de três competências, pagamentos e comprovante em análise usando IDs `demo-*`.
- [x] Registrar eventos de auditoria e imprimir somente contagens, sem segredos ou senhas.
- [x] Adicionar `npm run appwrite:seed-demo-data`.

### Task 3: Execução e validação remota

**Files:**
- Modify: `docs/superpowers/plans/2026-09-24-demo-data-seed.md`

- [x] Executar testes, lint e typecheck.
- [x] Executar `npm run appwrite:seed-demo-data` duas vezes; esperado: mesmas contagens e nenhuma duplicação.
- [x] Validar via MCP as relações entre perfis, turmas, matrículas, contratos, cobranças, comprovantes e pagamentos.
- [x] Executar build de produção e criar commits separados para seed e documentação.
