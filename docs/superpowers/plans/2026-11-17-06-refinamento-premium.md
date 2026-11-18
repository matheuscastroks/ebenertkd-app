# Onda 4 — Refinamento premium da interface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** deixar o app com aparência premium e organizada — começando por uma nova tela de entrada — reduzindo a carga cognitiva de cada tela sem remover funcionalidades.

**Architecture:** quatro agentes, cada um dono de uma área de arquivos, trabalhando em branches próprias a partir da `main`. Cada agente audita suas telas contra as diretrizes, decide os níveis primário/secundário/terciário de cada tela, implementa, verifica no navegador e abre um PR explicando decisões e trade-offs. O product owner (sessão principal) revisa, pede ajustes e mescla.

**Tech Stack:** Next.js 16 (App Router, Webpack no dev), TypeScript estrito, Tailwind v4, shadcn/ui, lucide-react, Vitest, Playwright.

**Spec:** [diretrizes de carga cognitiva](../../ux/diretrizes-carga-cognitiva.md), [contrato de design](../../ux/contrato-de-design.md), [plano mestre](./2026-11-17-00-orquestracao-mestre.md).

## Global Constraints

- Seguir as duas diretrizes acima em toda tela tocada. Não remover funcionalidade existente.
- Skills de design: usar `impeccable` e `frontend-design` para crítica e direção visual. Não usar skills de animação pesada (GSAP, scroll-jacking) nem gerar efeitos decorativos.
- Visual: Poppins, tokens existentes (`primary` laranja só para a ação principal da tela), duas sombras (`shadow-xs`, `shadow-md`), sem gradientes decorativos, sem ícones em quadrados coloridos, sem cards aninhados.
- Alvo de toque ≥ 44px no mobile; corpo ≥ `text-sm`; foco visível; `prefers-reduced-motion`.
- Português do Brasil, copy curta, sem jargão de produto ou marketing.
- Verificar no navegador em 375px e 1280px, claro e escuro. Sem rolagem horizontal.
- Validar antes do PR: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
- Commits em português, assunto convencional, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. PR com seção "Decisões e trade-offs de UX" e `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- O banco do `.env.local` é de desenvolvimento (será apagado antes do lançamento). Nunca rodar deploy de Functions nem alterar schema.

## Review Focus

- Tela que ficou bonita mas perdeu uma ação usada com frequência.
- Estado vazio, de erro ou de carregamento esquecido na nova composição.
- Responsável com dois filhos agindo no filho errado após mudança de layout.
- Menor vendo dado financeiro após reorganização.
- Rolagem horizontal ou texto cortado em 375px.

## Propriedade

| Agente | Arquivos | Branch |
| --- | --- | --- |
| A — Entrada | `src/app/page.tsx`, `src/components/auth/*`, `src/app/recuperar/*`, `src/app/privacidade/*`, `public/` (imagens da entrada) | `feat/entrada-premium` |
| B — Estrutura | `src/components/dashboard/*`, `src/components/shared/*`, `src/components/ui/*`, `src/app/globals.css`, `src/app/layout.tsx`, `src/lib/navigation/*` | `feat/estrutura-premium` |
| C — Professor | `src/app/admin/*`, `src/features/{billing,classes,contracts,exams}/components/*`, `src/features/students/components/*` (exceto `graduation-card`, `enrollment-form`) | `feat/professor-premium` |
| D — Portais | `src/app/aluno/*`, `src/app/responsavel/*`, `src/app/avisos/*`, `src/app/configuracoes/*`, `src/features/families/*`, `src/features/onboarding/*`, `src/features/notifications/components/*`, `graduation-card.tsx`, `enrollment-form.tsx` | `feat/portais-premium` |

Quem precisar de mudança fora da sua área registra em "Bloqueios" e pede ao dono daquela área.

## Status

- Feito: diretrizes registradas; plano criado.
- Pendente: tarefas 1 a 5.
- Bloqueios: a regra global `* { border-color: var(--border) }` e `a { text-decoration: none }` em `globals.css` (área B) ficam fora de `@layer` e vencem utilitários como `border-transparent`, `has-checked:border-*`, `aria-invalid:border-destructive` e `hover:underline`; a entrada contorna com `!`, mas a correção global é da Task 2.

## Registro de progresso

- 2026-11-17: plano criado; quatro agentes lançados.
- 2026-11-17: Task 4 (portais) concluída: visão geral do aluno com próximo treino em destaque, pendências em lista com uma só ação laranja e faixa com critérios recolhidos; painel da família com pendências nomeando cada filho; nova página de resumo por dependente (`/responsavel/dependentes/[id]`) com as cinco áreas como navegação; gerenciar dependentes com acesso e senha recolhidos; contratos em lista única; avisos, configurações e apresentação inicial simplificados. Menor continua sem consulta nem exibição de financeiro (testes). A rota de resumo não entra no menu (acessada pelo painel e pela trilha), por isso nenhuma mudança em `src/lib/navigation`.
- 2026-11-17: Task 2 (estrutura) concluída: navegação agrupada por perfil sem remover destinos, barra inferior com rótulos curtos, cabeçalho de página com título único e ação à direita, menu da conta só com itens da conta e skeletons com a geometria do cabeçalho.

### Task 1 (Agente A): Nova tela de entrada

**Files:** `src/app/page.tsx`, `src/components/auth/*`, `src/app/recuperar/*`, testes em `src/components/auth/*.test.tsx`, `tests/e2e/*` se nomes mudarem.

- [x] **Step 1:** Rodar a skill `impeccable` (crítica) e registrar no PR a tarefa principal da tela (entrar), os níveis de informação e o que é decorativo hoje.
- [x] **Step 2:** Desenhar a nova entrada: no desktop, composição em duas áreas (identidade da academia de um lado, formulário do outro) ou coluna única refinada, escolhida e justificada; no mobile, formulário primeiro. Manter abas Entrar/Criar conta, acesso do menor, recuperação de senha e link de privacidade.
- [x] **Step 3:** Testes: abas acessíveis, erro de login persistente com `role="alert"`, acesso do menor, nenhum elemento decorativo sem `aria-hidden`.
- [x] **Step 4:** Verificar no navegador (375/1280, claro/escuro) e rodar a validação completa.
- [x] **Step 5:** PR com decisões e trade-offs.

### Task 2 (Agente B): Estrutura e navegação

- [x] **Step 1:** Auditar sidebar, barra inferior mobile, cabeçalho de página (`DashboardShell`), estados de carregamento e componentes compartilhados contra as diretrizes.
- [x] **Step 2:** Melhorar hierarquia do cabeçalho de página (título, subtítulo, ação principal), agrupamento da navegação e skeletons com a mesma geometria do conteúdo.
- [x] **Step 3:** Testes de navegação e da guarda de design (`src/lib/design-contract.test.ts`) passando.
- [x] **Step 4:** Verificar no navegador e validação completa; PR.

### Task 3 (Agente C): Telas do professor

- [ ] **Step 1:** Para cada tela de `/admin`, registrar tarefa principal e níveis de informação.
- [ ] **Step 2:** Reorganizar (painel, matrículas, turmas, chamada, exames, financeiro, contratos, sistema) com progressive disclosure para ações avançadas, sem remover funções.
- [ ] **Step 3:** Testes das mudanças de comportamento; verificação no navegador; PR.

### Task 4 (Agente D): Portais do aluno e do responsável

- [x] **Step 1:** Mesma auditoria para `/aluno`, `/responsavel`, avisos, configurações e onboarding.
- [x] **Step 2:** Reorganizar; criar telas novas só se a tarefa principal pedir (ex.: página resumo do dependente), justificando no PR.
- [x] **Step 3:** Testes (menor sem dados financeiros); verificação no navegador; PR.

### Task 5 (Product owner): Revisão e integração

- [ ] **Step 1:** Revisar cada PR contra as diretrizes; pedir ajustes.
- [ ] **Step 2:** Mesclar na ordem B → A, C, D (rebase das áreas sobre B).
- [ ] **Step 3:** Varredura visual final com os quatro perfis e registro no plano mestre.
- 2026-11-17: Task 1 (Agente A) — nova entrada em duas áreas no desktop (identidade + formulário) e formulário primeiro no mobile; `/recuperar`, `/recuperar/confirmar` e `/privacidade` no mesmo padrão; PR `feat/entrada-premium`.
