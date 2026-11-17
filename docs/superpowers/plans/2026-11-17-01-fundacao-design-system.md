# Fundação de design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** aplicar o [contrato de design](../../ux/contrato-de-design.md) na base (tokens, primitives, navegação e skeletons) para que as telas da Onda 2 só consumam tokens e componentes. Nota inicial da fundação: 6,0/10.

**Architecture:** um único agente é dono de todos os arquivos de fundação e entra primeiro. Primeiro se absorve (ou descarta) o trabalho visual não commitado de outra sessão, depois se reduz o sistema de profundidade a dois níveis de sombra, unifica alturas e raios, troca cores cruas por tokens e cria um teste que impede regressão.

**Tech Stack:** Tailwind v4 (`@theme` em `globals.css`), shadcn/ui, lucide-react, Vitest.

**Spec:** [contrato de design](../../ux/contrato-de-design.md); [plano mestre](./2026-11-17-00-orquestracao-mestre.md).

**Branch:** `feat/fundacao-design`. **Bloqueia:** planos 02 a 05.

## Global Constraints

Todas as do [plano mestre](./2026-11-17-00-orquestracao-mestre.md#global-constraints) e do contrato. Dono exclusivo de: `src/app/globals.css`, `tailwind.config.ts`, `src/app/layout.tsx`, `src/components/ui/*`, `src/components/shared/*`, `src/components/dashboard/*`, `src/components/skeletons/*`, `src/lib/navigation/routes.ts`, `src/app/manifest.ts`, `package.json` (dependência `motion`).

## Review Focus

- Tema escuro: remover sombras não pode apagar a separação entre cards (usar luminosidade e borda).
- Contraste AA de `text-primary-text` e dos pares `success/warning/info` com seus `-foreground` em claro e escuro.
- Alvo de toque: aumentar `Button` default para `h-10` não pode quebrar tabelas densas (usar `size sm`).
- Bundle: remover `motion` não pode deixar `import` órfão.

## Status

- Feito: auditoria, contrato e implementação das tarefas 1–7 (2026-11-17), com revisão por subagentes.
- Pendente: fechamento da tarefa 8, validação completa e conferência visual em 375px/claro/escuro.
- Bloqueios: nenhum de produto. Direção visual preservada, sem motion; commits diretos na main autorizados em 2026-11-17.

## Registro de progresso

- Validação da retomada: typecheck e lint passaram; 5 arquivos / 23 testes direcionados passaram (controles, navegação, contraste, contrato de design e onboarding). Suíte completa ainda em execução. Build padrão falha no processo PostCSS/Turbopack; alternativa Webpack encontra ENOTFOUND para fonts.googleapis.com. Não foi feito deploy nem push.

- 2026-11-17: retomada na main atualizada; WIP preservado em stash. Fundação implementada com três subagentes; ícones estáticos, controles, superfícies, skeletons e guarda sem exceções para Fundação. Migrações mínimas de consumidores incluídas. Validação visual e fechamento ainda pendentes.

- 2026-11-17: plano criado.

### Task 1: Absorver o trabalho visual pendente

**Files:** os arquivos modificados e não commitados da sessão "Executar projeto (fork)" (`git status`), `package.json`, `package-lock.json`.

- [ ] **Step 1:** Com a decisão do dono, listar `git status --short` e separar o que é visual do que é de outras frentes.
- [ ] **Step 2:** Rodar `npm run typecheck && npm run lint && npm test` sobre o estado atual e registrar falhas pré-existentes aqui.
- [ ] **Step 3:** Commitar o que for mantido em `feat/fundacao-design` (`refactor: tokens de cor e tipografia revisados`); descartar o resto com confirmação do dono.
- [ ] **Step 4:** Remover `motion` e `components/icons/*` animados, se aprovado (Task 4 depende disso).

### Task 2: Profundidade em dois níveis e Card

**Files:**
- Modify: `src/app/globals.css:49-50,87-88,157-176` (remover `--top-glow*`, reduzir/remover `depth-*`), `src/components/ui/card.tsx:22-24`
- Test: `src/components/ui/card.test.tsx` (criar)

**Interfaces:**
- Produces: `Card` sem variantes `floating/flat`; `border border-border`, `shadow-xs` opcional.

- [ ] **Step 1:** Teste `Card não usa depth-* nem transition-all` (`expect(container.firstChild.className).not.toMatch(/depth-|transition-all/)`).
- [ ] **Step 2:** Rodar e ver falhar.
- [ ] **Step 3:** Migrar os 36 usos de `depth-*` (em 22 arquivos) para `shadow-xs`/`shadow-md` ou remover; apagar utilitários mortos do CSS.
- [ ] **Step 4:** Rodar testes e conferir 3 telas nos dois temas.
- [ ] **Step 5:** Commit `refactor: profundidade em dois níveis e card simplificado`.

### Task 3: Alturas, raios e tipografia dos controles

**Files:**
- Modify: `src/components/ui/button.tsx:7,19`, `input.tsx:10`, `select.tsx`, `badge.tsx`, `tailwind.config.ts` (deletar; mover raios para `@theme` se necessário)
- Test: `src/components/ui/controls.test.tsx` (criar)

- [ ] **Step 1:** Teste `Button default e Input têm a mesma altura h-10`, `size sm é h-9`, `sem transition-all`.
- [ ] **Step 2:** Rodar e ver falhar.
- [ ] **Step 3:** `Button` default `h-10`, `sm` `h-9`, `xs` `h-8`; `Input` `h-10`; `transition-colors`; remover `text-[0.8rem]`. Revisar tabelas densas que dependiam de `h-8` e passá-las a `size="sm"`.
- [ ] **Step 4:** `npm run typecheck && npm test`.
- [ ] **Step 5:** Commit `refactor: alturas e raios unificados nos controles`.

### Task 4: Navegação coerente

**Files:**
- Modify: `src/components/dashboard/app-sidebar.tsx`, `mobile-bottom-nav.tsx:127`, `src/lib/navigation/routes.ts` (mapa único de ícones), `src/app/layout.tsx` (remover `IconMotionProvider`)
- Test: `src/components/dashboard/navigation-icons.test.ts` (criar)

**Interfaces:**
- Produces: `NAV_ICONS: Record<SidebarNavIcon, LucideIcon>` exportado de `src/lib/navigation/nav-icons.ts`, usado pela sidebar e pela barra inferior.

- [ ] **Step 1:** Teste `todo SidebarNavIcon tem ícone em NAV_ICONS`.
- [ ] **Step 2:** Rodar e ver falhar.
- [ ] **Step 3:** Criar o mapa único, remover `stroke-[2.5]`, `shadow-lg`, `backdrop-blur-md` da barra inferior (`bg-background border-t`, alvo 44px) e usar a mesma fonte de ícones nos dois menus.
- [ ] **Step 4:** Rodar testes; conferir menu em 375px e desktop.
- [ ] **Step 5:** Commit `refactor: mapa único de ícones e barra inferior sem sombra`.

### Task 5: Variantes semânticas e substituição de cores cruas

**Files:**
- Modify: `src/components/ui/badge.tsx`, `src/components/shared/status-badge.tsx`; consumidores com cor crua: `admin/exames/[eventId]/page.tsx` (30 usos, gradiente na linha ~669), `graduation-card.tsx`, `responsavel/page.tsx`, `admin/sistema/page.tsx`, `admin/contratos/*`
- Test: coberto pela Task 7

**Atenção de propriedade:** os consumidores acima pertencem a outras áreas. A Fundação **só adiciona as variantes**; a substituição nos arquivos de tela é feita pela área dona (planos 03 a 05), citando esta tarefa.

- [ ] **Step 1:** Garantir `StatusBadge tone` cobre `success/warning/info/danger/neutral` com texto em `-foreground`.
- [ ] **Step 2:** Documentar em `docs/ux/contrato-de-design.md` o par fundo/texto correto de cada tom.
- [ ] **Step 3:** Medir contraste AA dos pares em claro e escuro (`src/lib/color-contrast.test.ts`).
- [ ] **Step 4:** Commit `feat: tons semânticos documentados e verificados`.

### Task 6: Overlays, skeletons e manifest

**Files:**
- Modify: `src/components/ui/dialog.tsx`, `sheet.tsx`, `drawer.tsx`, `alert-dialog.tsx` (linhas 39–42), `src/components/skeletons/*`, `src/app/*/loading.tsx` (3 arquivos), `src/app/manifest.ts:13-14`

- [ ] **Step 1:** Teste `overlays não usam backdrop-blur nem shadow-lg/2xl` (parte da Task 7).
- [ ] **Step 2:** Remover `backdrop-blur-xs`, overlay `bg-black/40`, sombras pesadas; skeletons reutilizam `Card`; extrair um `RouteLoading` para os 3 `loading.tsx`.
- [ ] **Step 3:** Alinhar `background_color`/`theme_color` do manifest aos tokens atuais.
- [ ] **Step 4:** `npm run build`.
- [ ] **Step 5:** Commit `refactor: overlays e skeletons consistentes`.

### Task 7: Guarda automática do contrato

**Files:**
- Create: `src/lib/design-contract.test.ts`

- [ ] **Step 1:** Teste que varre `src/**/*.tsx` e falha para `text-\[\d+px\]`, `transition-all`, `shadow-(lg|2xl)`, `depth-`, `font-(bold|black)`, `rounded-\[` e cores `(emerald|amber|red|rose|sky)-\d+` fora de `belt-badge.tsx`. Começa com uma lista de exceções temporárias por arquivo (cada área remove as suas ao terminar).
- [ ] **Step 2:** Rodar; a lista de exceções cobre o estado atual e o teste passa.
- [ ] **Step 3:** Commit `test: guarda automática do contrato de design`.

### Task 8: Fechamento

- [ ] **Step 1:** `npm run typecheck && npm run lint && npm test && npm run build`.
- [ ] **Step 2:** Conferir login, dashboard do professor, painel do aluno em claro/escuro e 375px.
- [ ] **Step 3:** Atualizar este plano e a tabela do plano mestre; abrir PR; mesclar antes de liberar a Onda 2.
