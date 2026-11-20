# Plano de Implementação: Ferramentas Financeiras do Professor

> **Data:** 2026-11-18
> **Escopo:** Duas ferramentas de decisão dentro de `/admin/financeiro`: (1) Calculadora de Mensalidade (ponto de equilíbrio e metas) e (2) Reajuste de Mensalidade com aviso pronto para WhatsApp.
> **Depende de:** Fase 4 (financeiro), Fase 3 (contratos) e o [plano de gestão periódica](./plano-gestao-periodica-admin.md) (fechamento mensal e renovações).

---

## 1. Problema e resultado esperado

| Ferramenta | Pergunta que responde | Resultado na tela |
| :--- | :--- | :--- |
| **Calculadora** | "Para tirar R$ 4.000 por mês, quanto preciso cobrar?" / "Perdi 5 alunos, ainda pago o aluguel?" | Mensalidade mínima, alunos necessários, folga ou déficit do mês, com números reais da academia pré-preenchidos. |
| **Reajuste** | "Quanto aumento, quanto entra a mais e como aviso sem atrito?" | Novo valor por aluno, impacto mensal/anual no caixa, mensagem pronta para copiar e abrir no WhatsApp de cada pagador. |

**Fora de escopo (regra do [plano mestre](./README.md)):** integração com API do WhatsApp, disparo automático em massa, busca automática de IPCA/IGP-M e alteração de contratos já assinados no meio da vigência. O WhatsApp é usado apenas por texto copiado e links `wa.me` abertos manualmente pelo professor, como já ocorre em `/admin/matriculas/retencao`.

---

## 2. Rotas e navegação

| Rota | Tela | Grupo no menu "Financeiro" |
| :--- | :--- | :--- |
| `/admin/financeiro/calculadora` | Calculadora de Mensalidade | "Calculadora de metas" |
| `/admin/financeiro/reajuste` | Simulador e campanha de reajuste | "Reajuste de mensalidade" |
| `/admin/financeiro/reajuste/[id]` | Campanha salva: lista de envio e status | — (acesso pela tela anterior) |

- Adicionar `adminBillingCalculator` e `adminBillingAdjustment` em `ROUTES` e os itens em `navigationForProfile` (`src/lib/navigation/routes.ts` + teste).
- Ambas as páginas exigem `role === "admin"` no servidor (layout de `/admin` + verificação nas server actions).

---

## 3. Calculadora de Mensalidade

### 3.1 Dados pré-preenchidos (leitura, servidor)

Novo `src/features/billing/planning-service.ts` (server-only, `cachedRead` com tag de cobranças) devolve um `PlanningBaseline`:

| Campo | Origem |
| :--- | :--- |
| `activeStudents` | Matrículas com status `active` (e `awaiting_renewal`, contadas à parte). |
| `averageFeeCents` | Média de `contract.monthly_fee_cents` dos contratos `signed` vigentes. |
| `feeDistribution` | Contagem de alunos por faixa de valor (para mostrar que nem todos pagam igual). |
| `defaultRatePercent` | Média dos últimos 3 fechamentos: (previsto − realizado) / previsto, reutilizando `buildMonthlyClosingReport`. |
| `realizedLast3MonthsCents` | Receita realizada média dos últimos 3 meses (fechamento). |

O professor pode sobrescrever qualquer valor; a tela sempre mostra "valor real" ao lado do campo editado.

### 3.2 Entradas do professor

- **Custos fixos mensais** (lista editável, com sugestões): aluguel, energia/água, internet/app, contador, seguro, instrutor auxiliar, outros.
- **Custos variáveis por aluno** (opcional): material, taxa de federação rateada, taxa de meio de pagamento (%).
- **Meta de pró-labore** (salário desejado do professor).
- **Reserva/investimento mensal** (opcional): ex.: R$ 300/mês para tatames novos.
- **Inadimplência esperada** (%) — padrão = valor real.

### 3.3 Regras (função pura `src/features/billing/planning-rules.ts`)

Valores em centavos, arredondamento sempre para cima nos resultados de "quanto cobrar".

```
necessidadeMensal = custosFixos + proLabore + reserva
receitaEfetivaPorAluno = mensalidade × (1 − inadimplência) × (1 − taxaPagamento%) − custoVariavelPorAluno

mensalidadeNecessaria(alunos) = ceil( (necessidadeMensal / alunos + custoVariavel) / ((1 − inad) × (1 − taxa%)) )
alunosNecessarios(mensalidade) = ceil( necessidadeMensal / receitaEfetivaPorAluno )
pontoEquilibrio (sem pró-labore e sem reserva) = ceil( custosFixos / receitaEfetivaPorAluno )
folgaMensal = alunos × receitaEfetivaPorAluno − necessidadeMensal
```

Casos de borda obrigatórios (teste): zero alunos, receita efetiva ≤ 0 (custo variável maior que a mensalidade → mensagem "cada aluno dá prejuízo"), inadimplência 100%, valores vazios, arredondamento de centavos.

### 3.4 Modos de pergunta (abas `Tabs` do shadcn)

1. **"Quanto cobrar?"** — entrada: meta de pró-labore → saída: mensalidade necessária com os alunos atuais e comparação com o valor médio atual (+R$ X / +Y%).
2. **"Quantos alunos preciso?"** — entrada: mensalidade → saída: alunos para o equilíbrio e para a meta.
3. **"E se...?"** — sliders de −10 a +20 alunos e de −20% a +30% na mensalidade → saída: folga/déficit do mês e do ano; destaque vermelho quando abaixo do ponto de equilíbrio. Atalhos prontos: "Perdi 5 alunos", "Contratar instrutor (R$ ___)", "Mudar de ponto (aluguel R$ ___)", "Comprar equipamento (R$ ___ em N meses)".

### 3.5 Visualização

- Cartões de resultado (`Card`): ponto de equilíbrio, alunos atuais, folga do mês.
- Gráfico de linha (padrão dos gráficos já usados no fechamento): receita × alunos com linhas horizontais de "custos fixos" e "custos + pró-labore"; marcador "você está aqui".
- Frase de leitura humana gerada pela regra, ex.: *"Com 42 alunos a R$ 150, sobram R$ 1.230 depois do aluguel e do seu pró-labore. Você aguenta perder até 8 alunos antes de faltar dinheiro para os custos fixos."*

### 3.6 Persistência

- **V1:** cálculo 100% no cliente sobre o baseline do servidor; rascunho dos custos em `localStorage` (try/catch), apenas conveniência.
- **V2:** tabela `finance_scenarios` (ver §5) para salvar cenários nomeados ("Atual", "Com instrutor", "Ponto novo") e reutilizar os custos fixos no reajuste.

---

## 4. Reajuste de Mensalidade com Aviso Pronto

### 4.1 Restrição jurídica e de domínio (decisão central)

A cobrança mensal usa `contract.monthly_fee_cents` (`charge-service.ts`) e o contrato assinado é imutável (Fase 3). Portanto **o reajuste não altera contratos vigentes**. Ele:

1. Define o novo valor em `enrollment.monthly_fee_cents` dos alunos escolhidos;
2. Entra em vigor **na próxima renovação/emissão de contrato** (`issueContractForEnrollment` já lê o valor da matrícula) ou numa data de vigência a partir da qual novas emissões usam o novo valor;
3. Gera a comunicação com antecedência mínima configurável (padrão **30 dias**, alerta abaixo disso).

Reajuste no meio da vigência (termo aditivo assinado) fica registrado como evolução futura, não neste ciclo.

### 4.2 Fluxo da tela `/admin/financeiro/reajuste`

**Passo 1 — Definir o reajuste**
- Modo: percentual (%), novo valor fixo (R$) ou "arredondar para" (ex.: R$ 5 ou R$ 10 cheios).
- Campo "índice de referência" livre (ex.: "IPCA 12 meses: 4,5%") — digitado pelo professor, sem busca automática.
- Atalho "Usar o valor da calculadora": puxa a mensalidade necessária do cenário salvo (V2).
- Data de vigência (padrão: 1º dia do mês seguinte + 30 dias).

**Passo 2 — Quem é afetado** (tabela com filtros)
- Lista de alunos ativos com valor atual, novo valor, diferença, fim do contrato e "reajuste aplicado em" (data em que o reajuste efetivamente passa a ser cobrado = renovação após a vigência).
- Filtros: turma, faixa de valor atual, contratos que vencem nos próximos 30/60/90 dias (reutilizar a esteira de `getContractRenewalPipeline`).
- Exceções por aluno: desmarcar (bolsista, irmãos, combinado especial) ou valor manual.
- Alunos com desconto (`enrollment.discount_cents`): reajusta a base e mantém o desconto em reais (decisão explícita na UI).

**Passo 3 — Impacto financeiro** (regra pura `adjustment-rules.ts`)
- `+R$ X/mês` quando todos os contratos estiverem renovados; curva mês a mês dos próximos 12 meses conforme cada renovação entra.
- Impacto anual e comparação com a meta da calculadora ("o reajuste cobre 80% da sua meta de pró-labore").
- **Cenário de evasão:** slider "e se N alunos saírem por causa do aumento?" → mostra o número máximo de saídas em que o reajuste ainda compensa (`alunosQuePodemSair = floor(ganhoMensal / novoValorMedio)`).

**Passo 4 — Mensagem**
- Modelos prontos (escolha por `RadioGroup`): **Cordial padrão**, **Curto e direto**, **Com transparência de custos** (lista o que subiu: aluguel, energia, material) e **Para responsáveis** (fala do filho/da filha).
- Variáveis: `{nome}`, `{nome_aluno}`, `{valor_atual}`, `{valor_novo}`, `{diferenca}`, `{vigencia}`, `{indice}`, `{academia}`, `{professor}`.
- Texto editável com pré-visualização renderizada para um aluno real; contador de caracteres.
- Princípios do texto (revisados com o skill de UX copy): agradece a confiança, explica o motivo em uma frase, informa valor e data com clareza, reforça o que melhora/continua, abre canal para conversa individual, sem pedir desculpas em excesso e sem tom de cobrança.

Exemplo do modelo "Cordial padrão":

> Olá, {nome}! Tudo bem? 🥋
> Primeiro, obrigado por fazer parte da {academia}. Ver a evolução de {nome_aluno} nos treinos é o que move a gente.
> Quero te avisar com antecedência que, a partir de {vigencia}, a mensalidade passará de {valor_atual} para {valor_novo}. O reajuste acompanha a inflação do período ({indice}) e os custos de manter o espaço, os equipamentos e a qualidade das aulas.
> O novo valor passa a valer na renovação do seu contrato, que também ficará disponível para assinatura pelo app.
> Se quiser conversar sobre isso, é só me chamar aqui. Conte sempre comigo!
> {professor}

**Passo 5 — Salvar e enviar**
- "Salvar campanha" cria o registro (status `draft`).
- "Confirmar reajuste" (diálogo de consequência, padrão `consequence-dialog.tsx`): grava os novos valores em `enrollment.monthly_fee_cents`, muda a campanha para `applied`, registra auditoria. Idempotente por `campaign_id + enrollment_id`.
- Lista de envio em `/admin/financeiro/reajuste/[id]`: uma linha por pagador (responsável quando houver menor, senão o aluno), com botões **Copiar mensagem** e **Abrir no WhatsApp** (`whatsappLink(phone)` + `?text=` codificado) e checkbox "avisado" (persistido). Progresso "18 de 42 avisados".
- Opção complementar: publicar um aviso no app (`/avisos`) + push, reaproveitando a Fase 6, com a mesma mensagem genérica (sem valores individuais).

### 4.3 Integração com a renovação

- `renewContract` / `quickRenewContract`: nada muda no código de emissão (já usa o valor da matrícula), mas a tela de renovações passa a exibir "valor anterior → valor novo" quando houver campanha aplicada.
- Se o professor renovar antes da data de vigência, o sistema avisa: "Este aluno tem reajuste para {vigencia}. Emitir com o valor atual ou o novo?".

---

## 5. Dados (declarar em `scripts/appwrite/schema.ts` antes do `infra:apply`)

Permissões deny-by-default; acesso apenas via server actions de admin.

**`finance_scenarios`** (V2 da calculadora)
| Coluna | Tipo |
| :--- | :--- |
| `name` | varchar 64 |
| `fixed_costs_json` | text (lista `{label, amount_cents}`) |
| `variable_cost_cents`, `payment_fee_bps`, `pro_labore_cents`, `reserve_cents` | integer ≥ 0 |
| `default_rate_bps` | integer 0–10000 |
| `created_by_account_id`, `created_at`, `updated_at` | — |

**`tuition_adjustments`** (campanha)
| Coluna | Tipo |
| :--- | :--- |
| `status` | enum `draft`, `applied`, `cancelled` |
| `mode` | enum `percent`, `fixed`, `rounded` |
| `percent_bps` | integer (450 = 4,5%) |
| `reference_index_label` | varchar 128, opcional |
| `effective_from` | datetime |
| `message_template` | text |
| `total_monthly_impact_cents` | integer |
| `applied_at`, `applied_by_account_id`, `created_at`, `updated_at` | — |

**`tuition_adjustment_items`**
| Coluna | Tipo |
| :--- | :--- |
| `adjustment_id`, `enrollment_id`, `student_id` | varchar 36 (índices) |
| `previous_fee_cents`, `new_fee_cents` | integer |
| `excluded` | boolean |
| `notified_at` | datetime, opcional |
| índice único | `adjustment_id + enrollment_id` |

Telefone e nome **não** são duplicados na tabela: lidos no servidor no momento de montar a lista de envio. Nenhum log com telefone ou valores individuais.

---

## 6. Arquivos previstos

```
src/features/billing/planning-rules.ts            (+ .test.ts)  cálculos puros da calculadora
src/features/billing/planning-service.ts                         baseline real (server-only)
src/features/billing/adjustment-rules.ts          (+ .test.ts)  novo valor, arredondamento, impacto, curva 12m
src/features/billing/adjustment-message.ts        (+ .test.ts)  modelos e interpolação de variáveis
src/features/billing/adjustment-service.ts                       campanhas, aplicar, marcar avisado (server-only, auditado)
src/features/billing/components/planning-calculator.tsx (+ .test.tsx)
src/features/billing/components/planning-chart.tsx
src/features/billing/components/adjustment-wizard.tsx   (+ .test.tsx)
src/features/billing/components/adjustment-send-list.tsx (+ .test.tsx)
src/app/admin/financeiro/calculadora/page.tsx (+ loading.tsx)
src/app/admin/financeiro/reajuste/page.tsx (+ loading.tsx)
src/app/admin/financeiro/reajuste/[id]/page.tsx
src/app/actions/tuition-adjustment.ts                             server actions (admin, zod)
```

Componentes: somente primitives já instaladas em `src/components/ui/` (Tabs, Card, Slider, Input, Table, RadioGroup, Textarea, Dialog, Badge, Checkbox), conforme [uso racional do shadcn/ui](./uso-racional-shadcn-ui.md). Interface recebe reais e exibe `formatBrl`; internamente centavos (`reaisToCents`).

---

## 7. Checklist de execução

### Etapa A — Calculadora (V1)
- [x] Rotas e menu (`routes.ts` + teste)
- [x] `planning-rules.ts` com testes de todos os casos de borda (§3.3)
- [x] `planning-service.ts` (baseline real a partir de contratos e fechamentos)
- [x] Tela com três modos, gráfico, frase de leitura e atalhos "E se...?"
- [x] Teste de interação: alterar alunos/mensalidade atualiza folga e ponto de equilíbrio

### Etapa B — Reajuste (simulação e mensagem)
- [x] `adjustment-rules.ts`: percentual, valor fixo, arredondamento, desconto preservado, curva de 12 meses por data de renovação, máximo de evasão tolerável
- [x] `adjustment-message.ts`: 4 modelos, variáveis, escape seguro para `wa.me?text=`
- [x] Wizard em 4 passos com pré-visualização e cópia
- [x] Testes: cálculo, interpolação, aviso de antecedência < 30 dias

### Etapa C — Campanha persistida e lista de envio
- [ ] Declarar `tuition_adjustments` e `tuition_adjustment_items` no schema; `infra:plan` → `infra:apply` — schema declarado e `infra:plan` conferido; **`infra:apply` pendente** (a executar pelo responsável)
- [x] `adjustment-service.ts`: salvar, aplicar (idempotente, auditado), marcar avisado
- [x] Teste de autorização: aluno/responsável não acessam nem as actions nem as rotas (testado nas actions e nos serviços; as páginas usam `requireProfile("admin")`)
- [x] Lista de envio com copiar, abrir WhatsApp e progresso
- [x] Aviso "valor anterior → novo" na esteira de renovações

### Etapa D — Integrações (V2)
- [x] `finance_scenarios` e cenários salvos na calculadora
- [x] Botão "Usar o valor da calculadora" no reajuste
- [x] Aviso geral opcional em `/avisos` + push

### Gate final
- [ ] `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`
- [ ] Evidência visual (desktop e celular) das duas telas
- [ ] Validação com o professor: simular "perdi 5 alunos" e um reajuste real, e enviar 1 mensagem de teste para o próprio número

---

## 8. Decisões em aberto

1. **Antecedência mínima do aviso:** 30 dias (proposta) ou outro prazo definido no contrato?
2. **Vigência:** reajuste só na renovação (proposta, sem aditivo) ou também data fixa para todos com termo aditivo assinado no app (evolução futura)?
3. **Custos fixos:** o professor aceita digitar os custos no app (V2 salva no servidor) ou prefere manter só no navegador?
4. **Taxa de pagamento:** hoje o fluxo é PIX manual (sem taxa); manter o campo opcional para cartão/maquininha?
