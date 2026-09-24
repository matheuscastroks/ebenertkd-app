# Fase 1 — Acesso e vínculos familiares Implementation Plan

> **For agentic workers:** execute os itens em ordem e marque os checkboxes somente após comprovar o resultado.

**Goal:** entregar autenticação segura para professor, adultos, responsáveis e menores, com autorização por papel e família.

**Architecture:** Appwrite Auth mantém credenciais e sessões. `profiles` descreve capacidades; `guardian_student_links` representa vínculos. Usuários menores entram por nome de usuário resolvido no servidor para um e-mail técnico não exibido.

**Tech Stack:** Appwrite Auth, Next.js Server Actions, Zod, cookies HTTP-only, Vitest/Testing Library.

**Status em 24/09/2026:** implementação local concluída. Suíte, lint, typecheck e build aprovados. A aplicação do schema no Appwrite Cloud e o aceite manual com os quatro perfis aguardam uma `APPWRITE_API_KEY` válida em `.env.local`.

---

## 1.1 Schema e tipos

**Arquivos:** criar `src/features/auth/types.ts`, `src/features/auth/schemas.ts`, `src/features/auth/service.ts`, `src/features/families/service.ts`; alterar `scripts/appwrite/schema.ts`.

- [ ] Expandir `profiles` com `account_id` único, `full_name`, `role` (`admin`, `adult_student`, `guardian`, `minor_student`), `email`, `username`, `status` e timestamps.
- [ ] Criar `guardian_student_links` com `guardian_profile_id`, `student_profile_id`, `status`, criador e datas; índice único do par.
- [ ] Definir capacidades explícitas por papel em `src/features/auth/permissions.ts`; não inferir autorização apenas pela rota.
- [ ] Criar auditoria para login administrativo, criação de menor, redefinição de acesso, vínculo e revogação.

## 1.2 Fluxos de conta

- [x] Implementar em `src/app/actions/auth.ts` registro adulto, login adulto, login de menor, logout, recuperação e confirmação de senha no Appwrite.
- [ ] Criar professor exclusivamente por `scripts/appwrite/create-admin.ts`; o registro público aceita somente aluno adulto ou responsável.
- [ ] Validar e normalizar e-mail, CPF e username; mensagens de login não revelam se uma conta existe.
- [ ] No login de menor, resolver username no servidor, aplicar limitação por IP+username e criar sessão sem retornar o e-mail técnico.
- [ ] Permitir que o responsável crie credenciais do menor e redefina sua senha; revogar todas as sessões do menor após redefinição.

## 1.3 Autorização e interface

**Arquivos:** alterar `middleware.ts`, `src/lib/auth/session.ts`, `src/app/page.tsx`; criar `src/app/responsavel/page.tsx`, `src/app/menor/page.tsx`.

- [ ] Trocar middleware e helpers de sessão para Appwrite; redirecionar conforme o papel e impedir acesso por URL a painéis alheios.
- [ ] Implementar painel mínimo de responsável com seletor de filhos e painel mínimo do menor sem dados financeiros de irmãos.
- [ ] Permitir uma conta adulta com capacidades de aluno e responsável sem duplicar identidade.
- [ ] Adicionar fluxo de transição aos 18 anos: e-mail próprio, confirmação, nova senha e decisão explícita sobre manutenção do acesso do responsável.

## Testes e aceite

- [ ] Testar registro duplicado, credenciais inválidas, enumeração de conta, expiração de sessão e rate limit.
- [ ] Testar que responsável A não lê menor B, menor não acessa financeiro/saúde de irmão e aluno não promove o próprio papel.
- [ ] Testar criação e revogação de vínculo e transição para conta adulta.
- [ ] Rodar suíte, lint, typecheck e build.
- [ ] Gate: quatro perfis entram, são redirecionados corretamente e só acessam recursos autorizados.
