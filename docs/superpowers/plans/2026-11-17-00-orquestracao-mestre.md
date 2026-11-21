# Orquestração de produto (Product Owner) — Plano mestre

> **Para agentes e IAs que assumirem este trabalho:** leia este arquivo primeiro. Ele é a fonte de verdade do que foi feito e do que falta. Cada área tem um plano detalhado próprio (lista abaixo). Ao terminar qualquer tarefa, **atualize o plano da área e a tabela de status deste arquivo no mesmo commit** do código. Não existe outra memória do trabalho além destes arquivos e do git.

**Goal:** entregar o app Ebener TKD funcional, com interface limpa, simples e consistente (princípios de interface da Apple: clareza, deferência ao conteúdo, hierarquia tipográfica, profundidade sutil, alvos de toque de 44pt, movimento com propósito), sem excesso decorativo ("AI slop").

**Architecture:** trabalho dividido em áreas com um dono por arquivo de fundação. Ondas: 0 operacional → 1 fundação de design → 2 áreas em paralelo → 3 QA e fechamento. Nesta retomada, por autorização do dono, trabalho direto na `main`, commits separados por responsabilidade e revisão com subagentes.

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
- Commits em português com assunto convencional e autoria real; nesta retomada não é exigido PR, conforme autorização do dono.
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
- [x] Exames no portal do aluno e do responsável (PR #2, mesclado).
- [x] Backup cifrado para o Drive: correções, scripts e guia `docs/backup-setup.md` (PR #4, mesclado; configuração operacional pendente).
- [x] Notificações push integradas (#5); logout revoga a inscrição do aparelho e limpa rascunhos locais. VAPID configurado localmente; entrega real em dispositivo ainda precisa de homologação.
- [x] Recuperação de lembretes integrada no PR #7; deploy e verificação operacional ainda pendentes.
- [x] Página `/privacidade` (PR #8, mesclado). Revisão jurídica e campos do professor pendentes.
- [ ] Configurar Google Drive/OAuth e chave de backup, ensaiar restauração; validar configuração VAPID no ambiente publicado (local preenchido).
- [x] Ambiente local validado: build Webpack, lint, typecheck, 428 testes e 18 E2E públicos aprovados.

### Onda 1 — Fundação de design (bloqueia a Onda 2)

- [x] Direção visual mantida e absorvida na Fundação, sem dependência `motion` (decisão registrada no PR #9).
- [~] Plano 01 implementado diretamente na main; fechamento e evidência visual pendentes.

### Onda 2 — Áreas em paralelo (após a Onda 1)

- [~] Plano 02 — Entrada e conta — implementado; revisão e fechamento em validação
- [~] Plano 03 — Operação do professor — implementado; revisão e fechamento em validação
- [~] Plano 04 — Financeiro e documentos — implementado; revisão e fechamento em validação
- [~] Plano 05 — Portais aluno e responsável — implementado; revisão e fechamento em validação

### Onda 3 — QA e fechamento

- [x] Rodada de QA visual e de carregamento (2026-11-17): os 4 perfis (professor, adulto, responsável, menor) entram e todas as telas internas carregam (200, título correto), em 375px claro e 1280px escuro, contra o banco de desenvolvimento do dono. Defeitos achados e corrigidos (PRs #11 e seguinte): rolagem horizontal no desktop, tabelas cortando a coluna Ações, faixa colorida nos cartões de métrica, texto de marketing no onboarding, laranja repetido em Exames. Fluxo E2E completo (`tests/e2e/lifecycle.spec.ts`) segue sem execução: exige projeto Appwrite isolado.
- [~] E2E de ciclo completo e família implementados com guard contra produção; execução aguarda projeto Appwrite isolado (tests/e2e/LIFECYCLE.md).
- [x] Revisão cruzada de subagentes/tech lead das áreas 01–05, com correções e commits separados na main.
- [ ] Piloto com o professor e duas famílias (docs/pilot-script.md).

### Onda 4 — Refinamento premium (2026-11-17, plano [06](./2026-11-17-06-refinamento-premium.md))

- [x] Entrada nova (#14), estrutura e navegação (#16), telas do professor (#18) e portais do aluno, menor e responsável (#17), mesclados com CI verde.
- [x] Correções do QA: exclusão de conta caía em erro (#15), auditoria de dependências (#19), filtros do financeiro (#20).
- [x] Varredura visual final com os 4 perfis (375px claro e 1280px escuro): todas as telas internas carregam, sem rolagem horizontal; menor sem dado financeiro.
- [~] Revisão de tech lead e QA dos PRs da onda 4 (agente de revisão somente leitura em andamento).
- [ ] Cache das leituras do Appwrite (plano a criar): agente interrompido pelo dono; o app ainda faz chamadas em sequência por página. Avaliar junto com a hospedagem do app.
- [x] Backend do Appwrite movido para Nova York (#21): projeto novo, schema aplicado (30 tabelas e bucket). Uma chamada à API caiu de 0,6 a 1,3 s para ~0,3 s.
- [ ] Functions no projeto novo: `daily-operations` criada e implantada em 20/11/2026, com intervalo gratuito de 24 horas; `backup` continua pendente. A conta recusa cron, mas aceita intervalo nativo, sem agendador externo ou upgrade. Consulte o [registro da implantação](../../implementation/implantacao-rotina-diaria-2026-11-20.md).
- [ ] Contas no projeto novo: nenhuma criada; o dono cria o administrador (`npm run appwrite:create-admin`).

## Registro de progresso (mais recente primeiro)

- 2026-11-17: onda 4 mesclada; backend migrado para Nova York; pendências: cron das Functions, contas do projeto novo, cache de leituras, revisão formal, e as ações do dono (Drive, VAPID, deploy, privacidade, piloto).

- 2026-11-17: fechamento técnico local: 118 arquivos/428 testes e 18 E2E públicos desktop/mobile aprovados; build, lint e typecheck passaram. PWA não recarrega na primeira instalação; cliente e diagnóstico Appwrite respeitam o ambiente configurado. Guarda de design sem exceções. Relatório: docs/implementation/validacao-retomada-2026-11-17.md. Criação do projeto isolado de homologação bloqueada pela revisão automática; aprovação específica solicitada, recurso não criado.

- 2026-11-17: implementação das áreas 02–05 integrada em commits por responsabilidade; revisão cruzada corrigiu falhas de persistência do onboarding, estado de turma, fuso São Paulo, submissão da matrícula e confirmações responsivas. Suíte completa: 114 arquivos/406 testes aprovados; testes adicionais de isolamento do cliente Appwrite aprovados. Build Webpack, lint e typecheck aprovados; conferência pública Playwright 8/8 em Edge, com rede externa bloqueada. Telas autenticadas, ciclo E2E real, dispositivos, piloto e operação Drive permanecem gates abertos.

- 2026-11-17: rotina diária (`appwrite/functions/daily-operations`) agora cobre os dias desde a última execução concluída em `automation_runs` (máximo 14) e recupera lembretes de pagamento e avisos de renovação de contrato perdidos; módulo puro `reminders.js` com 13 testes. Validado com executor sem dependências e `node --check`; o `vitest` do repositório não foi rodado (`node_modules` em reinstalação). **Falta:** rodar `npm test`, `typecheck` e lint após a reinstalação; rebase sobre o PR #5 (também altera `main.js`, em trechos distintos); e, só com autorização explícita do dono, `npm run appwrite:deploy-function -- daily-operations` e conferir `covered_days` em `automation_runs`.

- 2026-11-17: auditorias UX das 4 áreas concluídas; planos 00, 02, 03, 04, 05 escritos. Plano 01 aguarda a auditoria de fundação.

## Protocolo para quem executa

1. Escolha a próxima tarefa `[ ]` do plano da sua área, na ordem.
2. Nesta retomada, trabalhar na `main` autorizada, sem merges de branches; preservar trabalho preexistente.
3. Siga os passos (teste que falha → implementação → teste passa → commit).
4. Ao terminar a tarefa, marque os checkboxes no plano da área, adicione uma linha em "Registro de progresso" do plano e atualize a tabela deste arquivo, tudo no mesmo commit.
5. Revisar com subagentes e validar antes de encerrar; commits diretos na main autorizados.
6. Se algo bloquear (conflito de propriedade, decisão de produto), escreva em "Bloqueios" no plano da área e pare naquela tarefa.
