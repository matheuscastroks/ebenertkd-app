# UX — Entrada e conta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** tornar login, recuperação, configurações, onboarding e avisos simples, acessíveis e sem decoração, corrigindo os problemas P0 da auditoria (nota inicial 6,5/10).

**Architecture:** mudanças locais por componente, reaproveitando `Tabs`, `Alert`, `Progress` e `Field` do shadcn já instalados. Nenhuma mudança em `globals.css`/`components/ui` (dono: Fundação).

**Tech Stack:** Next.js 16, React 19, shadcn/ui, Vitest + Testing Library.

**Spec:** [orquestração mestre](./2026-11-17-00-orquestracao-mestre.md); auditoria "entrada e conta" de 2026-11-17.

**Execução vigente:** commits diretos na `main`, por responsabilidade, autorizados pelo dono em 2026-11-17; sem PR/merge intermediário. **Depende de:** Fundação integrada.

## Global Constraints

Todas as de [00-orquestracao-mestre](./2026-11-17-00-orquestracao-mestre.md#global-constraints). Em especial: alvo de toque 44px, `text-sm` mínimo, sem ícones decorativos, tokens de cor.

## Review Focus

- Erro de login só em toast que some: o erro precisa ficar na tela e ligado ao campo.
- Esc/clique fora no onboarding descarta preferências sem avisar.
- Mensagem técnica ("configuração do Appwrite") exposta ao usuário final.
- Dark mode legível em todos os cartões de aviso.

## Status

- Feito: implementação das tarefas 1 a 5; 21 testes direcionados aprovados e lint da área aprovado.
- Pendente: validação global (typecheck, suíte e build), evidência visual e registro dos commits pelo coordenador.
- Bloqueios: nenhum para o código. A validação visual segue pendente.

## Registro de progresso

- 2026-11-17 (revisão): drawer deixa de renderizar mensagem de caixa vazia quando a consulta falha. Onboarding só fecha e atualiza a rota quando save/skip retornam `success`; erros retornados e falhas de rede mantêm o passo, preferências e Alert inline, com nova tentativa disponível. Conclusão desabilitada durante persistência. Red: 4 falhas observadas e 1 rejeição não tratada; green: 10/10 testes nos dois arquivos afetados, sem rejeições. Lint direcionado aprovado (exit 0).

- 2026-11-17 (Codex): tarefas 1–5 implementadas. Abas Entrar/Criar conta com teclado; acesso de menor separado; erro inline ligado aos campos; confirmação de senha nativa; exclusão em seção própria e consequência compatível com a retenção do histórico. Onboarding sem cards decorativos, Progress e Esc retornando um passo sem concluir. NotificationItem compartilhado pelo inbox e drawer, abas reais, falha de consulta explícita e rollback de leitura em lote. Textos da recuperação e indisponibilidade de cadastro simplificados.
- Validação: 21 testes únicos passaram em execuções direcionadas com `--maxWorkers=1 --pool=threads` (auth-entry, register-card, delete-account-section, notification-item, notification-inbox, notification-drawer, onboarding-modal e onboarding-checklist); lint desses diretórios aprovado; `git diff --check` sem erros. Os testes de comportamento falharam antes da implementação. Correção posterior dos mocks e eventos dos testes legados de abas Radix confirmada em nova execução. E2E tiveram seletores atualizados, mas execução no navegador ainda não foi feita. Gate de tema claro/escuro e 375px continua aberto.
- Decisão técnica: drawer reaproveita NotificationInbox (que consome NotificationItem), eliminando duas implementações distintas de leitura de avisos. Sem mudanças em autorização, servidor de produção ou dependências.

- 2026-11-17: plano criado a partir da auditoria.

### Task 1: Abas de acesso e login acessíveis (P0.2, P0.4, P0.5, P1.6)

**Files:**
- Modify: `src/components/auth/auth-entry.tsx:81-121`, `src/components/auth/login-card.tsx:167-251`, `src/components/auth/register-card.tsx:364-377`
- Test: `src/components/auth/auth-entry.test.tsx` (criar)

**Interfaces:**
- Produces: abas "Entrar" e "Criar conta" com `Tabs` do shadcn (`role="tablist"` + `tabpanel` + setas de teclado). Menor: link discreto "Sou aluno menor de idade" que ativa o formulário de menor.

- [x] **Step 1:** Escrever `auth-entry.test.tsx`: `renderiza abas Entrar e Criar conta com tabpanel`, `setas do teclado trocam a aba`, `link "Sou aluno menor de idade" mostra o formulário de usuário`. Atenção: os E2E `tests/e2e/public-access.spec.ts` e `product-experience.spec.ts` procuram `getByRole("tab", { name: "Adulto" | "Menor" })`; atualizar para os novos nomes no mesmo commit.
- [x] **Step 2:** Rodar `npx vitest run src/components/auth` e ver falhar.
- [x] **Step 3:** Trocar os botões `role="tab"` por `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`. No `LoginCard`, mostrar o erro em `Alert` com `role="alert"` acima do formulário e `aria-invalid`/`aria-describedby` nos campos. Botão de mostrar senha com `size-11` e `focus-visible:ring-2`.
- [ ] **Step 4:** Rodar os testes e ver passar; `npm run typecheck`.
- [ ] **Step 5:** Commit `feat: abas de acesso acessíveis e erro de login persistente`.

### Task 2: Configurações — separar "Excluir conta" (P0.1, P1.7)

**Files:**
- Modify: `src/app/configuracoes/page.tsx:121-177`, `src/app/configuracoes/DeleteAccountDialog.tsx`
- Test: `src/app/configuracoes/delete-account-section.test.tsx` (criar)

- [x] **Step 1:** Teste `exibe seção própria "Excluir conta" com texto da consequência e botão destrutivo fora do card de sessão`.
- [x] **Step 2:** Rodar e ver falhar.
- [x] **Step 3:** Criar seção separada com título, 1 frase de consequência e o botão `destructive`; remover ícones dos títulos de seção; subtítulo da página curto ("Tema, notificações e sessão").
- [x] **Step 4:** Rodar e ver passar.
- [ ] **Step 5:** Commit `fix: separa a exclusão de conta da sessão em configurações`.

### Task 3: Onboarding enxuto e seguro (P0.6, P0.7, P1.1–P1.4)

**Files:**
- Modify: `src/features/onboarding/components/onboarding-modal.tsx`, `onboarding-welcome-step.tsx`, `onboarding-permission-step.tsx`, `onboarding-checklist.tsx`
- Test: `src/features/onboarding/components/onboarding-modal.test.tsx` (atualizar)

- [x] **Step 1:** Testes: `Esc no passo 2 volta ao passo 1 e não conclui`, `progresso tem role=progressbar e texto Passo X de 3 anunciado`, `"Pular" aparece uma vez`, `passo de boas-vindas não renderiza cards aninhados` (sem `Momento de Valor`).
- [x] **Step 2:** Rodar e ver falhar.
- [x] **Step 3:** Usar `Progress`; `onOpenChange` só fecha no passo 1 ou via "Pular"; passo 1 = saudação + 1 frase + lista de 3 itens; passo 3 = título, 1 frase, "Ativar notificações" e "Agora não"; botões de rodapé `h-11`.
- [x] **Step 4:** Rodar e ver passar.
- [ ] **Step 5:** Commit `refactor: onboarding mais simples e seguro contra descarte acidental`.

### Task 4: Avisos — item único e sem excesso de badges (P0.3, P1.8–P1.10, P2.5–P2.7)

**Files:**
- Create: `src/features/notifications/components/notification-item.tsx`
- Modify: `notification-inbox.tsx`, `notification-drawer.tsx`, `push-permission-card.tsx`, `notification-preferences.tsx`
- Test: `notification-inbox.test.tsx`, `notification-drawer.test.tsx`, `notification-item.test.tsx` (criar)

**Interfaces:**
- Produces: `NotificationItem({ notification, onMarkRead, compact? })` usado por inbox e drawer.

- [x] **Step 1:** Testes: `item mostra bolinha só quando não lido`, `não renderiza badge "Lido"`, `abas Avisos/Histórico usam Tabs e alvo h-10+`, `botão Marcar como lido tem h-11 no mobile`.
- [x] **Step 2:** Rodar e ver falhar.
- [x] **Step 3:** Extrair `NotificationItem`; tipo como texto cinza pequeno; remover ícones em quadrado dos cartões de push/preferências; "Desativar" vira `outline` neutro; microcopy: "Nenhum aviso novo", "Receba avisos de aula e mensalidade neste aparelho".
- [x] **Step 4:** Rodar e ver passar.
- [ ] **Step 5:** Commit `refactor: item de aviso único e interface de notificações mais limpa`.

### Task 5: Cadastro e copy de erro (P1.5, P1.11, P1.12, P2.1–P2.3)

**Files:**
- Modify: `src/app/page.tsx:24-51`, `src/components/auth/login-card.tsx`, `register-card.tsx`, `src/app/recuperar/page.tsx`
- Test: `src/components/auth/register-card.test.tsx` (criar)

- [x] **Step 1:** Testes: `cadastro exige confirmar senha`, `erro de configuração mostra "Cadastro indisponível no momento. Fale com a academia."`, `título da recuperação é "Recuperar senha"`.
- [x] **Step 2:** Rodar e ver falhar.
- [x] **Step 3:** Campo "Confirmar senha"; remover ícone decorativo do cabeçalho e dos campos de e-mail/senha; cabeçalho da página = logo + h1 + 1 linha; remover `CardHeader` redundante da recuperação.
- [x] **Step 4:** Rodar e ver passar.
- [ ] **Step 5:** Commit `feat: confirmação de senha e textos de erro claros no cadastro`.

### Task 6: Fechamento da área

- [ ] **Step 1:** `npm run typecheck && npm run lint && npm test && npm run build`.
- [ ] **Step 2:** Conferir tema claro/escuro e 375px de largura no navegador (login, configurações, onboarding, avisos).
- [ ] **Step 3:** Marcar este plano como concluído, atualizar a tabela do plano mestre, abrir PR.
