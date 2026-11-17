# UX — Entrada e conta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** tornar login, recuperação, configurações, onboarding e avisos simples, acessíveis e sem decoração, corrigindo os problemas P0 da auditoria (nota inicial 6,5/10).

**Architecture:** mudanças locais por componente, reaproveitando `Tabs`, `Alert`, `Progress` e `Field` do shadcn já instalados. Nenhuma mudança em `globals.css`/`components/ui` (dono: Fundação).

**Tech Stack:** Next.js 16, React 19, shadcn/ui, Vitest + Testing Library.

**Spec:** [orquestração mestre](./2026-11-17-00-orquestracao-mestre.md); auditoria "entrada e conta" de 2026-11-17.

**Branch:** `feat/ux-entrada-conta` (PR contra `main`). **Depende de:** Onda 1 (Fundação) mesclada.

## Global Constraints

Todas as de [00-orquestracao-mestre](./2026-11-17-00-orquestracao-mestre.md#global-constraints). Em especial: alvo de toque 44px, `text-sm` mínimo, sem ícones decorativos, tokens de cor.

## Review Focus

- Erro de login só em toast que some: o erro precisa ficar na tela e ligado ao campo.
- Esc/clique fora no onboarding descarta preferências sem avisar.
- Mensagem técnica ("configuração do Appwrite") exposta ao usuário final.
- Dark mode legível em todos os cartões de aviso.

## Status

- Feito: nada ainda.
- Pendente: tarefas 1 a 6.
- Bloqueios: aguarda Onda 1.

## Registro de progresso

- 2026-11-17: plano criado a partir da auditoria.

### Task 1: Abas de acesso e login acessíveis (P0.2, P0.4, P0.5, P1.6)

**Files:**
- Modify: `src/components/auth/auth-entry.tsx:81-121`, `src/components/auth/login-card.tsx:167-251`, `src/components/auth/register-card.tsx:364-377`
- Test: `src/components/auth/auth-entry.test.tsx` (criar)

**Interfaces:**
- Produces: abas "Entrar" e "Criar conta" com `Tabs` do shadcn (`role="tablist"` + `tabpanel` + setas de teclado). Menor: link discreto "Sou aluno menor de idade" que ativa o formulário de menor.

- [ ] **Step 1:** Escrever `auth-entry.test.tsx`: `renderiza abas Entrar e Criar conta com tabpanel`, `setas do teclado trocam a aba`, `link "Sou aluno menor de idade" mostra o formulário de usuário`. Atenção: os E2E `tests/e2e/public-access.spec.ts` e `product-experience.spec.ts` procuram `getByRole("tab", { name: "Adulto" | "Menor" })`; atualizar para os novos nomes no mesmo commit.
- [ ] **Step 2:** Rodar `npx vitest run src/components/auth` e ver falhar.
- [ ] **Step 3:** Trocar os botões `role="tab"` por `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`. No `LoginCard`, mostrar o erro em `Alert` com `role="alert"` acima do formulário e `aria-invalid`/`aria-describedby` nos campos. Botão de mostrar senha com `size-11` e `focus-visible:ring-2`.
- [ ] **Step 4:** Rodar os testes e ver passar; `npm run typecheck`.
- [ ] **Step 5:** Commit `feat: abas de acesso acessíveis e erro de login persistente`.

### Task 2: Configurações — separar "Excluir conta" (P0.1, P1.7)

**Files:**
- Modify: `src/app/configuracoes/page.tsx:121-177`, `src/app/configuracoes/DeleteAccountDialog.tsx`
- Test: `src/app/configuracoes/delete-account-section.test.tsx` (criar)

- [ ] **Step 1:** Teste `exibe seção própria "Excluir conta" com texto da consequência e botão destrutivo fora do card de sessão`.
- [ ] **Step 2:** Rodar e ver falhar.
- [ ] **Step 3:** Criar seção separada com título, 1 frase de consequência e o botão `destructive`; remover ícones dos títulos de seção; subtítulo da página curto ("Tema, notificações e sessão").
- [ ] **Step 4:** Rodar e ver passar.
- [ ] **Step 5:** Commit `fix: separa a exclusão de conta da sessão em configurações`.

### Task 3: Onboarding enxuto e seguro (P0.6, P0.7, P1.1–P1.4)

**Files:**
- Modify: `src/features/onboarding/components/onboarding-modal.tsx`, `onboarding-welcome-step.tsx`, `onboarding-permission-step.tsx`, `onboarding-checklist.tsx`
- Test: `src/features/onboarding/components/onboarding-modal.test.tsx` (atualizar)

- [ ] **Step 1:** Testes: `Esc no passo 2 volta ao passo 1 e não conclui`, `progresso tem role=progressbar e texto Passo X de 3 anunciado`, `"Pular" aparece uma vez`, `passo de boas-vindas não renderiza cards aninhados` (sem `Momento de Valor`).
- [ ] **Step 2:** Rodar e ver falhar.
- [ ] **Step 3:** Usar `Progress`; `onOpenChange` só fecha no passo 1 ou via "Pular"; passo 1 = saudação + 1 frase + lista de 3 itens; passo 3 = título, 1 frase, "Ativar notificações" e "Agora não"; botões de rodapé `h-11`.
- [ ] **Step 4:** Rodar e ver passar.
- [ ] **Step 5:** Commit `refactor: onboarding mais simples e seguro contra descarte acidental`.

### Task 4: Avisos — item único e sem excesso de badges (P0.3, P1.8–P1.10, P2.5–P2.7)

**Files:**
- Create: `src/features/notifications/components/notification-item.tsx`
- Modify: `notification-inbox.tsx`, `notification-drawer.tsx`, `push-permission-card.tsx`, `notification-preferences.tsx`
- Test: `notification-inbox.test.tsx`, `notification-drawer.test.tsx`, `notification-item.test.tsx` (criar)

**Interfaces:**
- Produces: `NotificationItem({ notification, onMarkRead, compact? })` usado por inbox e drawer.

- [ ] **Step 1:** Testes: `item mostra bolinha só quando não lido`, `não renderiza badge "Lido"`, `abas Avisos/Histórico usam Tabs e alvo h-10+`, `botão Marcar como lido tem h-11 no mobile`.
- [ ] **Step 2:** Rodar e ver falhar.
- [ ] **Step 3:** Extrair `NotificationItem`; tipo como texto cinza pequeno; remover ícones em quadrado dos cartões de push/preferências; "Desativar" vira `outline` neutro; microcopy: "Nenhum aviso novo", "Receba avisos de aula e mensalidade neste aparelho".
- [ ] **Step 4:** Rodar e ver passar.
- [ ] **Step 5:** Commit `refactor: item de aviso único e interface de notificações mais limpa`.

### Task 5: Cadastro e copy de erro (P1.5, P1.11, P1.12, P2.1–P2.3)

**Files:**
- Modify: `src/app/page.tsx:24-51`, `src/components/auth/login-card.tsx`, `register-card.tsx`, `src/app/recuperar/page.tsx`
- Test: `src/components/auth/register-card.test.tsx` (criar)

- [ ] **Step 1:** Testes: `cadastro exige confirmar senha`, `erro de configuração mostra "Cadastro indisponível no momento. Fale com a academia."`, `título da recuperação é "Recuperar senha"`.
- [ ] **Step 2:** Rodar e ver falhar.
- [ ] **Step 3:** Campo "Confirmar senha"; remover ícone decorativo do cabeçalho e dos campos de e-mail/senha; cabeçalho da página = logo + h1 + 1 linha; remover `CardHeader` redundante da recuperação.
- [ ] **Step 4:** Rodar e ver passar.
- [ ] **Step 5:** Commit `feat: confirmação de senha e textos de erro claros no cadastro`.

### Task 6: Fechamento da área

- [ ] **Step 1:** `npm run typecheck && npm run lint && npm test && npm run build`.
- [ ] **Step 2:** Conferir tema claro/escuro e 375px de largura no navegador (login, configurações, onboarding, avisos).
- [ ] **Step 3:** Marcar este plano como concluído, atualizar a tabela do plano mestre, abrir PR.
