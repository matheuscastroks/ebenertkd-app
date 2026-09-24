# Repository History Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** remover artefatos legados e criar um histórico inicial de commits temáticos, seguro e reproduzível.

**Architecture:** o estado atual será tratado como a primeira entrega do repositório. Arquivos serão agrupados por responsabilidade — fundação, Appwrite, autenticação e operação — e cada grupo será validado antes do próximo commit. Segredos locais permanecem ignorados.

**Tech Stack:** Git, Next.js, TypeScript, Appwrite, Vitest, ESLint.

---

### Task 1: Remover legado

**Files:**
- Delete: `supabase/`
- Delete: `docs/superpowers/plans/2026-08-30-cadastro-aluno.md`
- Delete: rotas e componentes mockados sem consumidores em `src/app/`, `src/components/` e `src/lib/mock-data.ts`
- Modify: `skills-lock.json`
- Modify: `docs/architecture/data-contract.md`

- [x] Remover migrations, seeds e skills exclusivas do Supabase.
- [x] Remover rotas de simulação e componentes mockados sem importadores.
- [x] Atualizar o contrato de dados para Appwrite e quatro perfis de acesso.
- [x] Executar `rg -n -i 'supabase'` e confirmar apenas referências históricas intencionais no plano.

### Task 2: Commit de fundação

**Files:** configurações da raiz, `public/`, componentes visuais compartilhados, regras de domínio e planejamento.

- [x] Verificar que `.env`, `.env.local`, `.next`, `node_modules` e `*.tsbuildinfo` estão ignorados.
- [x] Procurar padrões de chave e segredo nos arquivos candidatos.
- [x] Criar `chore: establish application foundation`.

### Task 3: Commits de infraestrutura e acesso

**Files:** `appwrite/`, `scripts/appwrite/`, `src/lib/appwrite/`, `src/features/`, `src/lib/auth/`, `src/app/`, `middleware.ts`.

- [x] Criar `feat: add Appwrite infrastructure` com schema, Functions, clientes e testes.
- [x] Criar `feat: implement role-based access` com sessões, ações, páginas e vínculos familiares.
- [x] Criar `test: add Appwrite test account tooling` com seed e validação end-to-end.

### Task 4: Validar e revisar histórico

**Files:** todos os arquivos versionados.

- [x] Executar `npm test`, `npm run lint`, `npm run typecheck` e `npm run build`.
- [x] Executar `git status --short` e confirmar árvore limpa.
- [x] Revisar `git log --oneline --decorate` e confirmar a ordem temática.
