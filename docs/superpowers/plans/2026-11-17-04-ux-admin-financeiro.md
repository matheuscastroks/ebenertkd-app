# UX — Financeiro, contratos, exames e sistema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** toda ação financeira e contratual irreversível mostra a consequência antes de confirmar, com telas sem decoração e tons por token. Nota inicial 6,5/10.

**Architecture:** um componente de confirmação reutilizável (`ConsequenceDialog`) usado por aprovar pagamento, aprovar rescisão, estornar e publicar contrato; limpeza de hubs; troca de cores cruas por `StatusBadge`.

**Tech Stack:** Next.js 16, shadcn `AlertDialog`, Vitest + Testing Library.

**Spec:** [plano mestre](./2026-11-17-00-orquestracao-mestre.md); [contrato de design](../../ux/contrato-de-design.md) regra 12; auditoria "financeiro e documentos" de 2026-11-17.

**Execução atual:** `main`, com commits por responsabilidade e push automático autorizados pelo dono. As dependências de código da Fundação estão integradas; homologação visual protegida aguarda projeto isolado.

## Global Constraints

As do plano mestre e do contrato. Regras de domínio financeiro (centavos, estorno, idempotência) não mudam: este plano só altera a interface e as confirmações.

## Review Focus

- Duplo clique em "Aprovar" não pode gerar dois pagamentos (a action já é idempotente; o botão deve ficar `disabled` ao enviar).
- Rejeitar rescisão sem justificativa.
- Competência "2026-11" exibida crua.
- Texto de cor fixa ilegível no escuro (`emerald-*`/`amber-*`).

## Status

- Feito: implementação das tarefas 1–5; confirmações com resumo dos valores efetivos, bloqueio de duplo envio e submissão por teclado protegida.
- Pendente: integração final, revisão visual em 375px/claro/escuro e homologação autenticada (tarefa 6).
- Bloqueios: nenhum para implementação local; não houve acesso ou deploy em produção.

## Registro de progresso

- Validação global de 2026-11-17: build, lint e typecheck aprovados; 118 arquivos/428 testes passaram. E2E públicos desktop/mobile: 18/18. Gates de telas autenticadas e piloto permanecem abertos; relatório em docs/implementation/validacao-retomada-2026-11-17.md.

- 2026-11-17: tarefas 1–5 implementadas diretamente na main por autorização do dono. `ConsequenceDialog` mantém as actions e as regras financeiras existentes; `ConfirmationForm` protege Enter e preserva salvar rascunho. Resumos leem valor/data/taxa/justificativa dos campos reais antes de confirmar. Assinatura digitada gera a mesma imagem PNG já aceita pelo servidor, sem alterar o contrato da action.
- 2026-11-17: testes direcionados comprovaram cancelamento sem envio, pendência/duplo envio, motivo em branco, confirmação de rescisão/publicação, competência, filtros, resultado de exame e assinatura alternativa. O gráfico `billing-trend-chart` foi removido após confirmar ausência de consumidores com `rg`. Falhas operacionais exibem causa classificada sem expor mensagens brutas do backend. Validação visual, build e suíte integral são registrados pelo coordenador no fechamento.
- 2026-11-17: plano criado.

### Task 1: Componente de confirmação com consequência (P0.1–P0.3, P1.12)

**Files:**
- Create: `src/features/billing/components/consequence-dialog.tsx`, `consequence-dialog.test.tsx`
- Modify: `src/features/billing/components/charge-actions.tsx:53-148,195-205,245-278`

**Interfaces:**
- Produces: `ConsequenceDialog({ trigger, title, summary: Array<{ label: string; value: string }>, effect: string, confirmLabel: string, destructive?: boolean, action: (formData: FormData) => void | Promise<void>, children?: ReactNode })` — `AlertDialog` que lista o resumo, descreve o efeito para o aluno e desabilita o botão ao enviar.

- [x] **Step 1:** Testes: `mostra cada item do resumo e o efeito`, `botão de confirmar fica disabled enquanto envia`, `Cancelar não chama a action`.
- [ ] **Step 2:** Rodar `npx vitest run src/features/billing` e ver falhar.
- [x] **Step 3:** Implementar o componente; usá-lo em aprovar/recusar comprovante ("R$ 150,00 · Ana Souza · competência nov/2026 será marcado como pago em 05/11"), pagamento manual e estorno (incluir valor e data estornados e o efeito "a cobrança volta a ficar em aberto: Pendente ou Em atraso, conforme o vencimento"); recusar exige motivo.
- [x] **Step 4:** Rodar e ver passar.
- [ ] **Step 5:** Commit `feat: confirmação com consequência em ações financeiras`.

### Task 2: Rescisão e publicação de contrato (P0.2, P1.12, P2.13)

**Files:**
- Modify: `src/app/admin/contratos/cancelamentos/page.tsx` e `src/features/contracts/components/cancellations-list.tsx`, `src/app/admin/contratos/modelo/page.tsx:70-98`
- Test: `src/app/admin/contratos/contracts-confirmations.test.tsx` (criar)

- [x] **Step 1:** Testes: `aprovar rescisão abre resumo "Rescisão de X, saída em mês/ano, taxa R$ Y. O aluno será notificado"`; `rejeitar exige justificativa`; `publicar versão N pede confirmação "Novos contratos usarão esta versão. Contratos atuais não mudam."`.
- [ ] **Step 2:** Rodar e ver falhar.
- [x] **Step 3:** Usar `ConsequenceDialog`; unificar rótulos com `Field`/`FieldLabel`; textarea do modelo `min-h-[50dvh]` com contador de caracteres.
- [x] **Step 4:** Rodar e ver passar.
- [ ] **Step 5:** Commit `feat: confirmar rescisão e publicação de contrato com resumo`.

### Task 3: Exames — resultado em um passo claro (P0.4, P0.5)

**Files:**
- Modify: `src/app/admin/exames/[eventId]/page.tsx:255-282,669` (e a troca para tokens)
- Test: `src/features/billing/components/exam-result-actions.test.tsx` (criar)

- [x] **Step 1:** Testes: `Aprovar/Reprovar/Ausente em grid de 3 colunas, h-11, tokens success/destructive`; `resultado pede confirmação "Muda a faixa de X para Y"`; `sem classes emerald-*/rose-* nem gradiente`.
- [ ] **Step 2:** Rodar e ver falhar.
- [x] **Step 3:** Implementar com `ConsequenceDialog` (aprovar mostra a nova faixa e a taxa); remover o gradiente da linha ~669 e trocar cores cruas por tokens.
- [x] **Step 4:** Rodar e ver passar.
- [ ] **Step 5:** Commit `refactor: resultado de exame com confirmação e tokens`.

### Task 4: Financeiro — listagem e filtros (P1.7, P1.8, P1.11)

**Files:**
- Modify: `src/features/billing/components/billing-table.tsx:140-146`, `billing-filters.tsx:44-55`, `src/app/admin/financeiro/page.tsx:104-120`; remover `billing-trend-chart.tsx` se não usado
- Test: `billing-table.test.tsx` (atualizar)

- [x] **Step 1:** Testes: `competência exibida como "nov/2026"`; `coluna Valor alinhada à direita`; `Limpar filtros só aparece com filtro ativo`; `cartões de métrica aplicam ?status=`.
- [ ] **Step 2:** Rodar e ver falhar.
- [x] **Step 3:** Formatar competência; `text-right` no valor; mover Configurações PIX e Exportar CSV para o cabeçalho; filtros ativos como chips; mês com campo compatível com Safari; métricas clicáveis; remover gráfico sem uso (confirmar com `grep`).
- [x] **Step 4:** Rodar e ver passar.
- [ ] **Step 5:** Commit `refactor: listagem financeira legível e métricas acionáveis`.

### Task 5: Hubs sem decoração e tokens (P1.9, P1.10, P2.14–P2.18)

**Files:** `src/app/admin/contratos/page.tsx:20-81`, `admin/exames/page.tsx:54-117`, `admin/sistema/page.tsx:69,265`, `contract-workspace.tsx:82,124`, `signature-pad.tsx` (rótulo acessível)

- [x] **Step 1:** Testes: `hubs não renderizam ícones em quadrado colorido`; `status usa StatusBadge`; `canvas de assinatura tem aria-label e alternativa por nome digitado`.
- [ ] **Step 2:** Rodar e ver falhar.
- [x] **Step 3:** Remover ícones decorativos; contratos como lista de 2 linhas com a pendência em destaque; métricas de exames em 1 linha de texto; `StatusBadge` no lugar de `emerald-*/amber-*`; "Falhas recentes" com a causa e link para detalhes.
- [x] **Step 4:** Rodar e ver passar.
- [ ] **Step 5:** Commit `refactor: hubs de contratos, exames e sistema sem decoração`.

### Task 6: Fechamento da área

- [ ] **Step 1:** `npm run typecheck && npm run lint && npm test && npm run build`; remover as exceções desta área do teste `design-contract`.
- [ ] **Step 2:** Conferir as telas em 375px, claro e escuro.
- [ ] **Step 3:** Atualizar este plano e o mestre; registrar commit e enviar à main após validação.
