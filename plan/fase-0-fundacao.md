# Fase 0 — Fundação Appwrite Implementation Plan

> **For agentic workers:** execute os itens em ordem e marque os checkboxes somente após comprovar o resultado. Não use dados reais nesta fase.

**Goal:** estabelecer uma configuração Appwrite reproduzível e provar hospedagem, sessão, banco, arquivo privado, função agendada e push.

**Architecture:** o Next.js usa SDK de servidor para ações privilegiadas e SDK de sessão para o usuário autenticado. A infraestrutura é descrita em código idempotente, com IDs estáveis, um banco, um bucket privado e duas Functions.

**Tech Stack:** Next.js 16, TypeScript, Appwrite Sites/Auth/TablesDB/Storage/Functions/Messaging, Vitest.

---

## 0.1 Baseline e contratos

**Arquivos:** criar `src/lib/appwrite/config.ts`, `src/lib/appwrite/server.ts`, `src/lib/appwrite/session.ts`, `scripts/appwrite/schema.ts`, `scripts/appwrite/setup.ts`; alterar `package.json`, `.env.example`, `AGENTS.md`.

- [ ] Registrar um commit-base do estado atual, sem incluir `.env*` ou segredos.
- [x] Adicionar `node-appwrite`, `appwrite`, `server-only`, `tsx`, `web-push` e `pdf-lib`; criar scripts `infra:plan`, `infra:apply`, `typecheck`.
- [x] Definir e validar: `NEXT_PUBLIC_APPWRITE_ENDPOINT`, `NEXT_PUBLIC_APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`, `APPWRITE_DATABASE_ID`, `APPWRITE_STORAGE_BUCKET_ID`, `APP_URL`, chaves VAPID e credenciais do Drive.
- [x] Fazer `server.ts` expor clientes administrativos apenas no servidor; `session.ts` deve criar cliente com o cookie HTTP-only `ebenertkd-session`.
- [x] Fazer `setup.ts` comparar e criar recursos por ID estável; `infra:plan` só relata diferenças e `infra:apply` aplica mudanças aditivas.

## 0.2 Modelo inicial e limites

- [x] Criar tabelas-base `profiles`, `audit_events`, `automation_runs` e índices por `account_id`, `role`, `event_type`, `created_at` e chave idempotente.
- [x] Criar bucket privado `private-files`, limite de 5 MB e extensões de imagem/PDF permitidas.
- [x] Aplicar negação por padrão; acesso a linhas e arquivos será concedido explicitamente por serviço de domínio.
- [x] Criar `src/lib/appwrite/ids.ts` como fonte única de IDs de banco, tabelas, bucket e Functions.
- [x] Atualizar `AGENTS.md` para documentar Appwrite, scripts e proibição de editar recursos manualmente sem refletir no schema.

## 0.3 Provas técnicas

- [x] Criar rota protegida de diagnóstico que valida sessão sem expor chave ou payload sensível.
- [x] Criar smoke test que grava/lê uma linha temporária em transação e faz upload/download de arquivo privado, removendo ambos ao final.
- [x] Criar o código e o provisionamento da Function `daily-operations` e da Function `backup` com cron diário; nesta fase ambas registram uma execução idempotente.
- [ ] Publicar preview no Appwrite Sites e validar cookies seguros, SSR e variáveis de runtime.
- [ ] Validar inscrição Web Push em Chrome Android e Safari/iOS instalado na tela inicial; registrar limitações em `docs/operations.md`.

## Testes e aceite

- [ ] Testar falha de configuração, cookie ausente/inválido, importação client-side de módulo administrativo e reexecução do setup.
- [x] Rodar `npm test`, `npm run lint`, `npm run typecheck` e `npm run build`; todos saíram com código 0.
- [ ] Gate: um ambiente novo é criado pelos scripts; sessão, transação, arquivo privado, cron, deploy e push têm evidência registrada em `docs/implementation/fase-0.md`.
