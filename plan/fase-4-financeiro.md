# Fase 4 — Financeiro e comprovantes Implementation Plan

> **For agentic workers:** execute os itens em ordem e marque os checkboxes somente após comprovar o resultado.

**Goal:** gerar mensalidades e taxas, receber comprovantes PIX, permitir conferência manual e entregar relatórios financeiros consistentes.

**Architecture:** cobranças são imutáveis quanto à origem e identificadas por matrícula, tipo e competência. Pagamentos e estornos são lançamentos auditáveis. A rotina diária gera cobranças futuras por chave idempotente.

**Tech Stack:** Appwrite TablesDB Transactions/Storage/Functions, Next.js, Vitest.

---

## 4.1 Modelo financeiro

**Arquivos:** criar `src/features/billing/types.ts`, `schemas.ts`, `charge-service.ts`, `payment-service.ts`, `report-service.ts`; alterar `scripts/appwrite/schema.ts`.

- [ ] Criar `charges`, `payment_proofs`, `payments`, `payment_reversals` e `billing_settings`.
- [ ] Definir tipos `monthly_fee`, `enrollment_fee`, `exam_fee`, `exit_fee`; estados `pending`, `proof_under_review`, `paid`, `overdue`, `cancelled`.
- [ ] Criar índice único `enrollment_id + charge_type + competence + origin_id`; impedir duplicação em reexecuções.
- [ ] Armazenar valor em centavos, competência `YYYY-MM`, vencimento local, data efetiva do recebimento e origem.
- [ ] Configurar chave PIX e favorecido sem expor dados bancários além do necessário ao usuário autenticado.

## 4.2 Geração de mensalidades

**Arquivos:** criar `src/features/billing/generate-charges.ts` e integrar `appwrite/functions/daily-operations/src/main.ts`.

- [ ] Na ativação, criar primeira cobrança com valor e vencimento confirmados pelo professor.
- [ ] Gerar próximas cobranças sete dias antes do início da competência, somente dentro da vigência ativa.
- [ ] Para dias 29–31, usar o último dia do mês quando necessário.
- [ ] Aplicar alterações de valor, desconto ou vencimento apenas a cobranças futuras; edição de cobrança existente exige justificativa e auditoria.
- [ ] Processar desde a última execução bem-sucedida para recuperar dias perdidos; usar lock e chave idempotente.
- [ ] Recalcular `overdue` diariamente sem sobrescrever `proof_under_review`, `paid` ou `cancelled`.

## 4.3 Portal e conferência

**Arquivos:** criar `src/app/(portal)/financeiro/page.tsx`, `src/app/admin/financeiro/page.tsx` e componentes em `src/features/billing/components/`.

- [ ] Mostrar ao pagador competência, valor, vencimento, PIX copiável e estado; responsável alterna entre filhos.
- [ ] Receber um comprovante ativo por cobrança, até 5 MB; substituição cria versão e mantém histórico.
- [ ] Pausar lembretes durante análise e permitir reenvio após rejeição fundamentada.
- [ ] Na aprovação, transacionar comprovante, pagamento, cobrança e auditoria; clique duplo retorna o resultado já confirmado.
- [ ] Permitir pagamento manual pelo professor e estorno com motivo; nunca apagar pagamento aprovado.

## 4.4 Painel e exportação

- [ ] Exibir recebido no mês pela data efetiva, valores pendentes, vencidos e em análise.
- [ ] Separar quantidade de cobranças pagas e alunos distintos que pagaram.
- [ ] Listar inadimplentes e destacar comprovante em análise; filtrar por competência, aluno, turma e tipo.
- [ ] Consultar com paginação/aggregação completa; métricas não podem depender dos primeiros 100 registros.
- [ ] Exportar CSV UTF-8 com período, competência, aluno, tipo, valor, vencimento, pagamento e estado.

## Testes e aceite

- [ ] Testar fevereiro, ano bissexto, dias 29–31, desconto, mudança futura e fim de contrato.
- [ ] Testar upload inválido, reenvio, duas aprovações simultâneas, pagamento manual e estorno.
- [ ] Testar totais por data efetiva versus competência e alunos distintos versus cobranças.
- [ ] Rodar suíte, lint, typecheck e build.
- [ ] Gate: um ciclo mensal completo produz cobranças únicas, comprovantes auditáveis e painel reconciliável com os pagamentos.

