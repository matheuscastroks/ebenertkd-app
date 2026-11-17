# Orquestração de produto (Product Owner) — Plano mestre

> **Para agentes e IAs que assumirem este trabalho:** leia este arquivo primeiro. Ele é a fonte de verdade do que foi feito e do que falta. Cada área tem um plano detalhado próprio (lista abaixo). Ao terminar qualquer tarefa, **atualize o plano da área e a tabela de status deste arquivo no mesmo commit** do código. Não existe outra memória do trabalho além destes arquivos e do git.

**Goal:** entregar o app Ebener TKD funcional, com interface limpa, simples e consistente (princípios de interface da Apple: clareza, deferência ao conteúdo, hierarquia tipográfica, profundidade sutil, alvos de toque de 44pt, movimento com propósito), sem excesso decorativo ("AI slop").

**Architecture:** trabalho dividido em áreas com um dono por arquivo de fundação. Ondas: 0 operacional → 1 fundação de design → 2 áreas em paralelo → 3 QA e fechamento. Cada área trabalha em uma branch própria, abre PR contra `main`, passa por revisão de tech lead/QA e só então é mesclada.

**Tech Stack:** Next.js 16 (App Router), TypeScript estrito, Tailwind, shadcn/ui, Appwrite Cloud, Vitest, Playwright.

**Spec:** auditorias de UX de 2026-11-17 (resumidas em cada plano de área), `docs/ux/*`, `plan/*`, `AGENTS.md`.

## Global Constraints

- Ler `AGENTS.md` antes de qualquer código; consultar `node_modules/next/dist/docs/` para APIs do Next (esta versão tem breaking changes).
- Strict TypeScript, 2 espaços, aspas duplas, alias `@/`; componentes em PascalCase; hooks com prefixo `use-`.
- Autorização por capacidade no servidor; menor nunca vê dado financeiro; nunca logar segredo ou dado pessoal.
- Valores monetários em centavos internamente, reais na interface; datas de negócio em `America/Sao_Paulo`.
- Copy em português do Brasil, curta, sem jargão de produto nem tom de marketing.
- Alvo de toque mínimo 44px no mobile; texto de corpo mínimo `text-sm`; foco visível; `prefers-reduced-motion` respeitado.
- Sem gradientes decorativos, brilhos, ícones em quadrados coloridos, cards aninhados, emojis ou badges em excesso. Cores só por token (`success`, `warning`, `destructive`, `info`, `primary`), nunca `emerald-*`/`amber-*` fixos.
- Arquivos de fundação têm **um único dono** (ver Propriedade). Quem não é o dono não os edita; pede a mudança ao dono.
- Commits em português com assunto convencional, terminando com `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. PR com impacto, decisões, validação e `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Validar antes do PR: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
- Nunca acessar nem alterar o projeto Appwrite de produção `6ab4c32e00317977eeb6` em testes automatizados.

## Review Focus

- Estado de erro mascarado como "tudo certo" (consulta falha e a tela diz "Tudo em dia"): exigir estado de erro explícito.
- Número sem dados exibido como valor real (frequência "100%" com zero aulas): exibir "—".
- Ação irreversível sem resumo da consequência (aprovar pagamento, aprovar rescisão, publicar contrato).
- Responsável com 2 ou mais filhos agindo no filho errado: o nome do filho deve estar sempre visível.
- Tema escuro com cor fixa ilegível.

## Propriedade (um dono por área)

| Área | Arquivos/pastas | Dono | Plano |
| --- | --- | --- | --- |
| Fundação de design | `src/app/globals.css`, `src/app/layout.tsx`, `tailwind.config.ts`, `src/components/ui/*`, `src/components/shared/*`, `src/components/dashboard/*`, `src/components/skeletons/*` | Agente Fundação | [01](./2026-11-17-01-fundacao-design-system.md) |
| Entrada e conta | `src/app/page.tsx`, `src/components/auth/*`, `src/app/recuperar/*`, `src/app/configuracoes/*`, `src/features/onboarding/*`, `src/app/avisos/*`, `src/features/notifications/components/*` | Agente Entrada | [02](./2026-11-17-02-ux-entrada-e-conta.md) |
| Operação do professor | `src/app/admin/page.tsx`, `src/app/admin/matriculas/*`, `src/app/admin/turmas/*`, `src/features/students/components/*` (exceto graduação), `src/features/classes/components/*` | Agente Operação | [03](./2026-11-17-03-ux-admin-operacao.md) |
| Financeiro e documentos | `src/app/admin/financeiro/*`, `src/app/admin/contratos/*`, `src/app/admin/exames/*`, `src/app/admin/sistema/*`, `src/features/billing/components/*`, `src/features/contracts/components/*` | Agente Financeiro | [04](./2026-11-17-04-ux-admin-financeiro.md) |
| Portais aluno e responsável | `src/app/aluno/*`, `src/app/responsavel/*`, `src/features/exams/components/*`, `src/features/students/components/graduation-card.tsx`, `belt-*.tsx`, `enrollment-form.tsx` | Agente Portais | [05](./2026-11-17-05-ux-portais-aluno-responsavel.md) |

## Status geral

Legenda: `[x]` feito e mesclado, `[~]` em andamento/PR aberto, `[ ]` pendente.

### Onda 0 — Operacional e correções (concluída ou em PR)

- [x] CI destravado: dependências vulneráveis, `labeler.yml`, testes E2E das abas (PR #3, mesclado).
- [~] Exames no portal do aluno e do responsável (PR #2).
- [~] Backup cifrado para o Drive: correções, scripts e guia `docs/backup-setup.md` (PR #4).
- [~] Notificações push: correções, `push:generate-keys`, guia `docs/notificacoes.md` (PR #5).
- [~] Rotina diária recupera lembretes de pagamento e avisos de renovação de dias perdidos (branch `feat/rotina-diaria-recuperacao`; PR aberto, **sem deploy**).
- [~] Página `/privacidade` (agente de frontend; PR a abrir).
- [ ] Ação do dono: configurar Google Drive/OAuth e variáveis VAPID (guias nos PRs #4 e #5).
- [ ] Ambiente local: `node_modules` do repositório principal foi corrompido por instalação interrompida; reinstalar (`npm ci`) antes de rodar o app.

### Onda 1 — Fundação de design (bloqueia a Onda 2)

- [ ] Decidir o destino do trabalho visual **não commitado** da sessão "Executar projeto (fork)" (cores `primary-text`, fonte, ícones, `motion`): absorver na Fundação ou descartar. **Sem essa decisão a Onda 1 não começa.**
- [ ] Plano 01 executado e mesclado.

### Onda 2 — Áreas em paralelo (após a Onda 1)

- [ ] Plano 02 — Entrada e conta
- [ ] Plano 03 — Operação do professor
- [ ] Plano 04 — Financeiro e documentos
- [ ] Plano 05 — Portais aluno e responsável

### Onda 3 — QA e fechamento

- [ ] Rodada de QA: fluxos críticos com contas de teste num projeto Appwrite **separado** (nunca produção).
- [ ] E2E autenticado cobrindo: cadastro→aprovação→contrato→cobrança→comprovante→aprovação; turma→chamada→exame.
- [ ] Revisão de tech lead de cada PR; mesclar na ordem 01, 02–05.
- [ ] Piloto com o professor e duas famílias (docs/pilot-script.md).

## Registro de progresso (mais recente primeiro)

- 2026-11-17: rotina diária (`appwrite/functions/daily-operations`) agora cobre os dias desde a última execução concluída em `automation_runs` (máximo 14) e recupera lembretes de pagamento e avisos de renovação de contrato perdidos; módulo puro `reminders.js` com 13 testes. Validado com executor sem dependências e `node --check`; o `vitest` do repositório não foi rodado (`node_modules` em reinstalação). **Falta:** rodar `npm test`, `typecheck` e lint após a reinstalação; rebase sobre o PR #5 (também altera `main.js`, em trechos distintos); e, só com autorização explícita do dono, `npm run appwrite:deploy-function -- daily-operations` e conferir `covered_days` em `automation_runs`.

- 2026-11-17: auditorias UX das 4 áreas concluídas; planos 00, 02, 03, 04, 05 escritos. Plano 01 aguarda a auditoria de fundação.

## Protocolo para quem executa

1. Escolha a próxima tarefa `[ ]` do plano da sua área, na ordem.
2. Crie/continue a branch indicada no plano; trabalhe em worktree isolado.
3. Siga os passos (teste que falha → implementação → teste passa → commit).
4. Ao terminar a tarefa, marque os checkboxes no plano da área, adicione uma linha em "Registro de progresso" do plano e atualize a tabela deste arquivo, tudo no mesmo commit.
5. Ao terminar a área, abra o PR e peça revisão; não mescle sem revisão e CI verde.
6. Se algo bloquear (conflito de propriedade, decisão de produto), escreva em "Bloqueios" no plano da área e pare naquela tarefa.
