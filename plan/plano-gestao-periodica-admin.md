# Plano de Implementação: Telas de Gestão Mensal, Semestral e Anual no Painel Admin

> **Data:** 2026-11-18  
> **Escopo:** Evolução gerencial do painel administrativo (`/admin`) para acompanhamento de retenção, elegibilidade para exames, fechamento financeiro, renovações de contratos, relatório anual e regularidade documental.

---

## 1. Arquitetura de Rotas e Navegação

| Periodicidade | Rota | Objetivo Principal |
| :--- | :--- | :--- |
| **Mensal** | `/admin/matriculas/retencao` | Monitorar faltas consecutivas, evasão (churn) e saldo mensal de matrículas. |
| **Mensal** | `/admin/financeiro/fechamento` | Fechamento contábil por competência (Previsto vs. Realizado, recuperação de atrasados, estornos e pendências). |
| **Semestral** | `/admin/exames/elegibilidade` | Quadro de aptidão por tempo mínimo na faixa, presenças acumuladas e adimplência financeira. |
| **Semestral** | `/admin/contratos/renovacoes` | Esteira de vencimentos (vencidos, 7d, 30d, 60d, 90d) com renovação rápida. |
| **Anual** | `/admin/relatorios/anual` | Balanço executivo de 12 meses: receita anual, sazonalidade, ticket médio, permanência (LTV) e funil de faixas. |
| **Anual** | `/admin/matriculas/regularidade` | Controle anual de validade de atestados médicos (365 dias) e pendências documentais. |

---

## 2. Regras de Negócio Aplicadas

### 2.1 Critérios de Retenção (Padrão do Setor de Academias e Artes Marciais)
- **Crítico (`critical`):** $\ge 3$ faltas consecutivas sem justificativa, OU $\ge 21$ dias corridos sem presença registrada (para alunos ativos há $\ge 14$ dias), OU frequência nos últimos 30 dias $< 50\%$ (com $\ge 4$ aulas realizadas).
- **Atenção (`warning`):** $2$ faltas consecutivas, OU entre $14$ e $20$ dias sem presença, OU frequência nos últimos 30 dias entre $50\%$ e $74\%$.
- **Saudável (`healthy`):** $< 2$ faltas consecutivas e presença nos últimos 13 dias (ou frequência $\ge 75\%$).

### 2.2 Critérios de Elegibilidade para Exame de Faixa
- `10º e 9º Gub` (Branca / Ponta Amarela): mínimo `90 dias` (3 meses) e `20 presenças`.
- `8º e 7º Gub` (Amarela / Ponta Verde): mínimo `90 dias` (3 meses) e `24 presenças`.
- `6º e 5º Gub` (Verde / Ponta Azul): mínimo `120 dias` (4 meses) e `30 presenças`.
- `4º e 3º Gub` (Azul / Ponta Vermelha): mínimo `150 dias` (5 meses) e `36 presenças`.
- `2º e 1º Gub` (Vermelha / Ponta Preta): mínimo `180 dias` (6 meses) e `48 presenças`.
- Bloqueio automático de status se houver cobranças vencidas (`overdue`).

### 2.3 Regularidade Anual (Atestado Médico)
- Validade padrão de **365 dias** a partir da data de envio do atestado médico aprovado.
- Alerta preventivo quando restarem **30 dias ou menos** para o vencimento.

---

## 3. Checklist de Execução

- [x] Atualizar `ROUTES` e `navigationForProfile` em `src/lib/navigation/routes.ts` e `src/lib/navigation/routes.test.ts`
- [x] Tela 1: Retenção e Frequência (`/admin/matriculas/retencao`) + regras + gráfico + testes
- [x] Tela 2: Elegibilidade para Exames (`/admin/exames/elegibilidade`) + regras + gráfico + ação de inscrição + testes
- [x] Tela 3: Fechamento Mensal / DRE (`/admin/financeiro/fechamento`) + regras + gráfico + testes
- [x] Tela 4: Esteira de Renovações (`/admin/contratos/renovacoes`) + regras + gráfico + ação de renovação + testes
- [x] Tela 5: Balanço Executivo Anual (`/admin/relatorios/anual`) + regras + gráficos + testes
- [x] Tela 6: Regularidade Anual (`/admin/matriculas/regularidade`) + regras + gráfico + testes
- [x] Gate final: `npm test` (suíte `src/` completa + contratos arquiteturais), `npm run typecheck`, `npm run lint`, `npm run build`
