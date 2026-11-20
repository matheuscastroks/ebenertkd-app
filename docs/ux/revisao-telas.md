# Revisão de telas — Admin, aluno e responsável

Revisão de hierarquia de informação, uma tela por vez. Serve de roteiro: cada tela vira um PR, na ordem da seção "Ordem dos PRs". Os termos seguem o [glossário](glossario.md); a aparência segue o [contrato de design](contrato-de-design.md).

Referências: Apple HIG (Sidebars, Tab bars, Split views, Writing). Pontos que usamos: no máximo dois níveis no sidebar; um rótulo curto por item; a seleção atual sempre destacada; a informação mais importante primeiro; um termo por conceito; sem possessivos ("Favoritos", não "Seus favoritos").

## Por que revisar

- **Sidebar inchado.** Admin com 10 itens e cerca de 25 submenus. Aluno com 12 a 15 itens, 7 só em "Treino".
- **Nomes diferentes para a mesma coisa.** "Fichas de matrícula" no sidebar vira "Matrículas" no título. Cancelamentos têm 4 nomes e locais têm 4. A ficha do aluno aparece como Ficha, Matrícula, Minha matrícula e Meus dados.
- **Informação repetida.** Os mesmos KPIs e gráficos aparecem em Hoje, Financeiro e Fechamento. Retenção, Regularidade, Renovações e Elegibilidade mostram a mesma faixa de KPIs e o mesmo gráfico. Frequência aparece em 5 telas do aluno. O aviso do PAR-Q pode aparecer 3 vezes numa tela.
- **Botões de cabeçalho que repetem submenus.** Não há voltar de verdade: breadcrumbs de 1 item nunca aparecem e o mobile não tem chevron.
- **Ação principal enterrada.** Na ficha do aluno a decisão fica no fim da 5ª aba. Em Reajuste o histórico vem antes da tarefa.

## Modelo de navegação: Seção → Segmento → Pilha

```
Sidebar (1 nível, até 8 itens)        →  Seção (tela-raiz)
  └ Segmentos (links por URL, até 4–5) →  visões irmãs da mesma seção
      └ Pilha (drill-down)             →  detalhe, com "‹ Voltar para <segmento>"
```

- **Seção.** Um item do sidebar. O título grande da página é o nome da seção.
- **Segmento.** Controle segmentado de **links** (`<Link>` com `aria-current="page"`) logo abaixo do título, com o visual do `TabsList` de `src/components/ui/tabs.tsx`. Cada segmento tem uma URL, então o voltar do navegador funciona. "Tabs não substituem URLs."
- **Pilha.** Telas de detalhe (`[id]`) escondem os segmentos e mostram um link de voltar com chevron acima do título. Substitui os breadcrumbs.
- **Ações** ficam em `headerActions` e nunca viram item de navegação.
- **Segmento não é botão de cabeçalho.** Se a ação leva a uma visão irmã, é segmento. Se cria ou altera algo, é ação.
- **As URLs atuais ficam como estão nesta fase.** O agrupamento é por configuração (`navigationForProfile` em `src/lib/navigation/routes.ts`), sem mover rotas.

### Admin: 7 seções

| Grupo | Seção | Segmentos → rota atual | Pilha |
|---|---|---|---|
| — | **Hoje** | — `/admin` | — |
| Rotina | **Alunos** (badge de fichas) | Fichas `/admin/matriculas` · Frequência e risco `/admin/matriculas/retencao` · Documentos anuais `/admin/matriculas/regularidade` · Acessos `/admin/alunos/acessos` | Ficha do aluno `/admin/matriculas/[studentId]` |
| Rotina | **Turmas** | Grade `/admin/turmas` · Locais `/admin/locais` | Turma `[classId]` → Chamada `…/aulas/[lessonId]` |
| Rotina | **Eventos** | Agenda `/admin/eventos` · Inscrições `/admin/eventos/inscricoes` · Exames de faixa `/admin/eventos/exames` · Aptidão `/admin/eventos/exames/elegibilidade` | Evento `[eventId]`, Banca `exames/[eventId]`, Novo evento `/novo` |
| Gestão | **Financeiro** | Cobranças `/admin/financeiro` · Fechamento `/fechamento` · Metas `/calculadora` · Reajuste `/reajuste` | Lista de envio `reajuste/[id]` |
| Gestão | **Contratos** | Renovações `/admin/contratos/renovacoes` · Rescisões `/cancelamentos` · Modelo `/modelo` | — |
| Gestão | **Relatórios** | Balanço anual `/admin/relatorios/anual` | — |
| Rodapé | **Ajustes** | Sem segmentos: lista agrupada no estilo Ajustes do iOS | Identidade, Financeiro e PIX, Graduações, Contratos, Exames, Regras, Primeiros passos, Histórico, Sistema e backup |

- "Campeonatos" sai do sidebar e vira só um filtro da Agenda.
- "Saúde do sistema" vai para dentro de Ajustes.
- `/admin/contratos` passa a mostrar Renovações; o hub `ContractLinks` é removido.
- Avisos fica no sino do cabeçalho e na barra mobile.

### Aluno: 6 seções (+ Família)

| Seção | Segmentos → rota atual |
|---|---|
| **Início** | — `/aluno` |
| **Treinos** | Agenda `/aluno/calendario` · Frequência `/aluno/frequencia` |
| **Faixa** | Progresso `/aluno/evolucao` · Exames `/aluno/exames` · Estudos `/aluno/estudos` · Conquistas `/aluno/conquistas` |
| **Eventos** | — `/aluno/eventos` |
| **Cadastro** | Carteirinha `/aluno/carteirinha` · Ficha `/aluno/matricula` · Saúde `/aluno/parq` · Contratos `/aluno/contratos` (o contrato abre em pilha) |
| **Pagamentos** (só adulto) | — `/aluno/financeiro` |
| **Família** (adulto com a capacidade de responsável) | — `/responsavel` |

- O menor tem tudo, menos Pagamentos e Família.
- Barra mobile: Início · Treinos · Pagamentos (adulto) ou Faixa (menor) · Avisos · Menu.

### Responsável

- **Família** é a seção. A raiz mostra um card por dependente. A ação de cabeçalho "Gerenciar acessos" abre em pilha `/responsavel/dependentes`.
- **Dependente** é uma pilha a partir de Família ("‹ Família"). Os segmentos espelham o aluno: Treinos · Faixa · Eventos · Cadastro · Pagamentos, mapeados para as sub-rotas existentes de `/responsavel/dependentes/[profileId]/…`.
- O seletor "Trocar dependente" continua no cabeçalho.

## Ordem dos PRs

Por impacto na rotina de quem usa. Depois do 11º, as telas restantes seguem a ordem de cada seção.

| # | Tela | Por quê |
|---|---|---|
| 1 | Hoje | É a primeira tela do dia e hoje mistura fila, finanças e setup. |
| 2 | Ficha do aluno | A decisão de matrícula está no fim da 5ª aba. |
| 3 | Fechamento | O resumo, os gráficos e a tabela repetem Financeiro. |
| 4 | Documentos anuais | 8 KPIs e duas listas para uma tarefa só. |
| 5 | Cobranças | KPIs e gráfico duplicados; PIX no cabeçalho. |
| 6 | Banca | "Resumo do exame" duplica os KPIs. |
| 7 | Inscrições | Filas vazias ocupam a tela. |
| 8 | Início do aluno | Lista que duplica o sidebar; frequência com gráfico. |
| 9 | Faixa (Progresso, Exames, Estudos, Conquistas) | Gráfico e medalhas duplicados. |
| 10 | Cadastro (Carteirinha, Ficha, Saúde, Contratos) | Alertas duplicados e dois bugs de menor. |
| 11 | Família e Dependente | Card inchado e âncora quebrada. |
| 12+ | Frequência e risco, Aptidão, Renovações, Metas, Reajuste, Ajustes, Eventos, demais | Mudanças menores. |

Nenhuma tela é redesenhada na entrega da fundação (sidebar, segmentos, pilha, glossário). O redesenho interno é por PR.

## Como ler cada tela

**Objetivo** · **O usuário precisa conseguir** (3 a 5 jobs, em ordem de frequência) · **Primário / secundário / terciário** · **Problemas** · **Plano de ação** · **Seção/segmento**. "Primário" é o que ocupa o topo e o maior peso. "Secundário" aparece sem rolar muito. "Terciário" fica recolhido, atrás de link ou em Ajustes.

---

# Admin

## Hoje

`src/app/admin/page.tsx` · seções `SetupCardSection`, `UrgentTasksSection`, `TodayClassesSection`, `AdminMetricsSection`, `NextExamSection`

**Objetivo.** Saber o que fazer agora.

**O usuário precisa conseguir**
1. Ver o que espera uma decisão sua.
2. Abrir a chamada do treino de hoje.
3. Saber quanto está em atraso.
4. Ver o próximo exame.

**Primário:** fila "Aguardando você". **Secundário:** treinos de hoje. **Terciário:** próximo exame, atraso financeiro, setup.

**Problemas**
- Título "Hoje · {dia}" mistura nome da seção com data; o subtítulo ("Pendências e treinos da academia") não diz o que fazer.
- `AdminMetricsSection` traz um bloco financeiro com gráfico que repete Financeiro e Fechamento.
- `SetupCardSection` fica no topo e empurra a fila para baixo, mesmo para quem já está operando.
- O card de setup não pode ser dispensado.

**Plano de ação**
- Ordem: fila → treinos de hoje → próximo exame.
- Trocar o bloco financeiro por 1 linha "Em atraso: R$ X ›" que leva a Cobranças.
- Transformar `SetupCardSection` em banner dispensável, abaixo da fila.
- Título "Hoje"; a data vai para o subtítulo.

**Seção:** Hoje (sem segmentos).

## Alunos › Fichas

`src/app/admin/matriculas/page.tsx` · `EnrollmentTable`

**Objetivo.** Encontrar e analisar fichas.

**O usuário precisa conseguir**
1. Ver quem precisa de análise.
2. Buscar um aluno pelo nome.
3. Filtrar por situação ou turma.
4. Abrir a ficha.

**Primário:** lista com o filtro "Precisa de análise". **Secundário:** busca e filtros. **Terciário:** outras visões.

**Problemas**
- O título é "Matrículas" e o sidebar diz "Fichas de matrícula". São dois nomes para a mesma coisa.
- `headerActions` tem 3 botões (Retenção, Regularidade anual, Acessos) que são visões irmãs, não ações.
- O filtro padrão não prioriza o que precisa de análise.
- Empty state "Limpar todos os filtros" é o único caminho; quando não há fichas, não diz o que fazer.

**Plano de ação**
- Remover os 3 botões; viram segmentos.
- Título "Alunos"; subtítulo foca a tarefa.
- Filtro padrão "Precisa de análise".
- Empty state com o próximo passo.

**Seção:** Alunos › Fichas.

## Ficha do aluno

`src/app/admin/matriculas/[studentId]/page.tsx` · `ReviewPanel`

**Objetivo.** Decidir a matrícula.

**O usuário precisa conseguir**
1. Ver o status e o que falta.
2. Liberar para assinatura ou devolver com motivo.
3. Conferir dados, saúde e documentos.
4. Ver o contrato e o histórico.

**Primário:** status e ação de decisão. **Secundário:** checklist do que falta. **Terciário:** histórico, dados de contato.

**Problemas**
- A decisão fica no fim da 5ª aba do `ReviewPanel`.
- A checklist vem depois dos dados, e não antes.
- Abas e rótulos com caixa mista; o histórico mostra chaves técnicas, não rótulos em português.
- "Fim do contrato (1 ano)" está fixo e ignora a política da academia.
- Subtítulo "Análise da matrícula: ficha, documentos e condições." repete o título.

**Plano de ação**
- Card fixo no topo com status e a ação principal ("Liberar para assinatura").
- Checklist logo abaixo.
- Abas: Dados · Saúde · Documentos · Contrato.
- Tudo em sentence case; traduzir os rótulos do histórico.
- Ler a vigência da política de contratos.
- Voltar: "‹ Alunos".

**Seção:** Alunos, pilha (`isDetail`).

## Alunos › Frequência e risco

`src/app/admin/matriculas/retencao/page.tsx`

**Objetivo.** Agir sobre quem pode sair.

**O usuário precisa conseguir**
1. Ver quem faltou seguido.
2. Mandar um lembrete.
3. Filtrar por turma ou nível de risco.
4. Abrir a ficha.

**Primário:** lista de quem está em risco. **Secundário:** filtros. **Terciário:** tendências.

**Problemas**
- A faixa de KPIs e o gráfico mostram os mesmos números.
- Os gráficos vêm antes da lista.
- Título "Retenção e frequência" é um terceiro nome; "Ver matrículas" no cabeçalho é um voltar disfarçado.

**Plano de ação**
- KPIs viram chips de filtro, sem gráfico duplicado.
- Lista primeiro; gráficos num bloco recolhido "Ver tendências".
- Remover "Ver matrículas".

**Seção:** Alunos › Frequência e risco.

## Alunos › Documentos anuais

`src/app/admin/matriculas/regularidade/page.tsx` · `ComplianceChart`

**Objetivo.** Cobrar atestado e PAR-Q vencidos.

**O usuário precisa conseguir**
1. Ver quem está vencido.
2. Pedir o documento ao aluno ou responsável.
3. Ver quem vence em breve.
4. Abrir a ficha.

**Primário:** lista de vencidos com ação "Pedir". **Secundário:** chips Vencem em X dias e Pendentes. **Terciário:** gráfico.

**Problemas**
- 8 KPIs para uma única tarefa.
- Atestado e PAR-Q aparecem em listas separadas, com ações repetidas.
- Rótulos fixos ("12m") que ignoram a configuração.
- Título "Regularidade anual" e rota `regularidade` usam um termo diferente do glossário (Documentos).

**Plano de ação**
- 1 linha de chips: Vencidos · Vencem em X dias · Pendentes.
- Lista única com badges por documento.
- Rótulos vêm da política em Ajustes › Regras.

**Seção:** Alunos › Documentos anuais.

## Alunos › Acessos

`src/app/admin/alunos/acessos/page.tsx` · `StudentAccessTable`

**Objetivo.** Resolver o login de um aluno.

**O usuário precisa conseguir**
1. Encontrar o aluno.
2. Ver como ele entra (próprio, do responsável).
3. Reenviar convite ou redefinir senha.
4. Fazer a transição de maioridade.

**Primário:** tabela de acessos. **Secundário:** ações por linha. **Terciário:** explicação das regras.

**Problemas**
- Existe a rota duplicada `/admin/matriculas/acessos` (1 linha) além de `/admin/alunos/acessos`.
- "Excluir aluno" mora aqui, longe da ficha.
- O texto "Como funciona" ocupa espaço fixo.

**Plano de ação**
- Mover "Excluir aluno" para a ficha, com `AlertDialog`.
- "Como funciona" vira `InfoTip`.
- Redirecionar a rota antiga para a atual.

**Seção:** Alunos › Acessos.

## Turmas › Grade

`src/app/admin/turmas/page.tsx` · `ClassManagerSection`

**Objetivo.** Ver e editar turmas e ir para a chamada.

**O usuário precisa conseguir**
1. Ver a próxima turma e abrir a chamada.
2. Criar uma turma.
3. Editar horários e local.
4. Arquivar uma turma.

**Primário:** próxima turma com "Fazer chamada". **Secundário:** grade. **Terciário:** turmas arquivadas.

**Problemas**
- "Fazer chamada" não se destaca da grade.
- O subtítulo fala de "dojangs" e "matrículas", e a tela não gerencia matrícula.

**Plano de ação**
- Destacar a próxima turma com a ação primária.
- Subtítulo: "Horários e locais dos treinos."

**Seção:** Turmas › Grade.

## Turma

`src/app/admin/turmas/[classId]/page.tsx` · `LessonList`, `ClassAttendanceSummary`

**Objetivo.** Fazer ou revisar a chamada de hoje.

**O usuário precisa conseguir**
1. Abrir a chamada de hoje.
2. Criar uma aula de reposição.
3. Revisar aulas recentes.
4. Ver a frequência da turma.

**Primário:** chamada de hoje. **Secundário:** aulas recentes. **Terciário:** tendência, aulas antigas.

**Problemas**
- `ClassAttendanceSummary` (gráfico) e a lista de aulas mostram a mesma frequência em blocos separados.
- Aulas antigas e recentes em dois blocos.

**Plano de ação**
- Juntar frequência e lista; o gráfico fica atrás de "Ver tendência".
- Voltar: "‹ Turmas".

**Seção:** Turmas, pilha.

## Chamada

`src/app/admin/turmas/[classId]/aulas/[lessonId]/page.tsx`

**Objetivo.** Marcar presença rápido.

**O usuário precisa conseguir**
1. Marcar presente ou falta por aluno.
2. Marcar todos de uma vez.
3. Concluir a chamada.

**Primário:** lista de alunos com marcação. **Secundário:** concluir. **Terciário:** observações.

**Problemas**
- Título "Chamada · {turma}" repete o conceito que o voltar já informa.

**Plano de ação**
- Manter. É a melhor tela. Voltar: "‹ {Turma}"; título "Chamada".

**Seção:** Turmas, pilha (2º nível).

## Turmas › Locais

`src/app/admin/locais/page.tsx`

**Objetivo.** Cadastrar os locais de treino.

**O usuário precisa conseguir**
1. Ver os locais.
2. Cadastrar um local.
3. Definir o padrão.
4. Remover um local sem uso.

**Primário:** lista. **Secundário:** cadastro. **Terciário:** padrão.

**Problemas**
- Título "Cadastro de Locais" e botão "Cadastrar Novo Local" em title case; é o 4º nome dos locais ("Locais de treino" em Ajustes).

**Plano de ação**
- Título "Locais"; botão "Novo local"; sentence case.

**Seção:** Turmas › Locais.

## Eventos › Agenda

`src/app/admin/eventos/page.tsx` · `EventCard`

**Objetivo.** Ver e criar eventos.

**O usuário precisa conseguir**
1. Ver os próximos eventos.
2. Criar um evento.
3. Filtrar por tipo.
4. Abrir um evento.

**Primário:** próximos eventos. **Secundário:** filtro por tipo. **Terciário:** passados.

**Problemas**
- Os filtros de tipo (`?tipo=`) usam links com visual de segmento e competem com os segmentos da seção.
- "Exames" aparece como filtro e como segmento.
- Há dois caminhos para criar: Novo evento e Novo exame.

**Plano de ação**
- Filtro de tipo vira `select`.
- Tirar "Exames" do filtro.
- Novo evento também cria exame; o botão "Novo exame" some.

**Seção:** Eventos › Agenda.

## Evento

`src/app/admin/eventos/[eventId]/page.tsx` · `EventTabs`

**Objetivo.** Gerir um evento do início ao fim.

**O usuário precisa conseguir**
1. Abrir ou encerrar inscrições.
2. Ver e aprovar inscritos.
3. Conferir pagamentos.
4. Fazer o check-in.

**Primário:** ação de status do evento. **Secundário:** inscritos. **Terciário:** visão geral, pagamentos.

**Problemas**
- A ação de status (`StatusForm`) está misturada às demais ações de cabeçalho.
- Abas internas competem com o modelo de segmentos; aqui são conteúdo do mesmo item, então cabem em abas.

**Plano de ação**
- Uma ação primária por estado do evento; demais no menu.
- Voltar: "‹ Agenda".

**Seção:** Eventos, pilha.

## Eventos › Inscrições

`src/app/admin/eventos/inscricoes/page.tsx` · `HubQueue`

**Objetivo.** Zerar as pendências de inscrição.

**O usuário precisa conseguir**
1. Ver quantas pendências há em cada fila.
2. Aprovar inscrições em lote.
3. Confirmar a equipe e revisar documentos.
4. Marcar como enviadas à federação.

**Primário:** fila com mais pendências. **Secundário:** demais filas. **Terciário:** filas vazias.

**Problemas**
- Todas as filas aparecem, inclusive as vazias.
- Título "Central de inscrições" e subtítulo longo enumeram as filas.

**Plano de ação**
- Esconder filas vazias.
- Contador por fila no topo, com âncora.
- Título "Inscrições".

**Seção:** Eventos › Inscrições.

## Eventos › Exames de faixa

`src/app/admin/eventos/exames/page.tsx` · `ExamList`

**Objetivo.** Abrir uma banca.

**O usuário precisa conseguir**
1. Criar uma banca.
2. Abrir a banca mais próxima.
3. Ver o resumo do que está aberto.
4. Consultar os concluídos.

**Primário:** bancas ativas. **Secundário:** KPIs. **Terciário:** concluídos.

**Problemas**
- Cabeçalho com "Elegibilidade", que é segmento.
- Concluídos ocupam o mesmo peso das bancas ativas.

**Plano de ação**
- Remover "Elegibilidade" do cabeçalho; vira o segmento Aptidão.
- Manter os KPIs; concluídos recolhidos.

**Seção:** Eventos › Exames de faixa.

## Banca

`src/app/admin/eventos/exames/[eventId]/page.tsx`

**Objetivo.** Avaliar e graduar.

**O usuário precisa conseguir**
1. Inscrever alunos aptos.
2. Registrar o resultado por candidato.
3. Fechar a banca e gerar as graduações.
4. Cancelar uma inscrição.

**Primário:** candidatos e resultado. **Secundário:** KPIs. **Terciário:** alunos aptos para inscrever.

**Problemas**
- "Resumo do exame" duplica os KPIs.
- "Alunos elegíveis" é uma lista própria, repetindo Aptidão.
- Arquivo de 761 linhas dificulta mudar uma parte sem afetar outra.

**Plano de ação**
- Remover "Resumo do exame".
- ~~"Alunos aptos" vira link para Aptidão já filtrado.~~ Feito de outro jeito: Aptidão só inscreve na próxima banca aberta e sem escolher graduação ou taxa. Por isso a lista ficou na Banca com o nome "Inscrever alunos", e um link leva a Aptidão filtrada. O cancelamento do exame foi para o fim da coluna principal.
- Voltar: "‹ Exames de faixa".

**Seção:** Eventos, pilha.

## Eventos › Aptidão

`src/app/admin/eventos/exames/elegibilidade/page.tsx` · `EligibilityChart`

**Objetivo.** Saber quem pode fazer exame.

**O usuário precisa conseguir**
1. Ver quem está apto.
2. Entender o que falta aos demais (tempo, presença, pagamento).
3. Inscrever o aluno na banca aberta.
4. Filtrar por faixa e turma.

**Primário:** lista de aptos. **Secundário:** o que falta. **Terciário:** gráfico.

**Problemas**
- Gráfico antes da lista.
- A rota e o título dizem "Elegibilidade"; Ajustes diz "Tempo mínimo" e o glossário pede Aptidão.

**Plano de ação**
- Lista primeiro; gráfico recolhido.
- Título "Aptidão"; "Tempo mínimo" igual em Ajustes › Exames.

**Seção:** Eventos › Aptidão.

## Financeiro › Cobranças

`src/app/admin/financeiro/page.tsx` · `BillingOverviewChart`, `BillingTable`, `BillingToolbarContent`

**Objetivo.** Conferir comprovantes e receber.

**O usuário precisa conseguir**
1. Aprovar comprovantes pendentes.
2. Registrar um pagamento recebido.
3. Ver quem está em atraso.
4. Filtrar por mês, situação e aluno.

**Primário:** comprovantes e atrasos. **Secundário:** filtros. **Terciário:** resumo do mês.

**Problemas**
- O gráfico de distribuição repete o de Fechamento.
- `BillingToolbarContent` põe PIX e outras ações no cabeçalho, e o PIX já existe em Ajustes › Financeiro.
- Título "Painel financeiro" é um quarto nome; os KPIs não filtram a tabela.

**Plano de ação**
- KPIs viram filtros; sem gráfico.
- PIX só em Ajustes.
- Título "Financeiro".

**Seção:** Financeiro › Cobranças.

## Financeiro › Fechamento

`src/app/admin/financeiro/fechamento/page.tsx` · `ClosingBreakdownChart`, `BillingOverviewChart`, `EventsSummaryCard`

**Objetivo.** Fechar o mês.

**O usuário precisa conseguir**
1. Ver o que impede o fechamento.
2. Conferir o resultado do mês.
3. Exportar o relatório.
4. Cobrar quem está em atraso.

**Primário:** pendências de fechamento. **Secundário:** resumo. **Terciário:** gráficos e tabela detalhada.

**Problemas**
- Subtítulo usa "DRE simplificado", "inadimplência" e "conciliação de caixa".
- Comprovantes pendentes aparecem em mais de um bloco.
- "Cobranças do mês" no cabeçalho é segmento.
- Os gráficos vêm antes das pendências.

**Plano de ação**
- Ordem: pendências → resumo → gráficos.
- Uma só menção a comprovantes pendentes.
- Tabela DRE recolhida, com o nome "Resultado do mês".

**Seção:** Financeiro › Fechamento.

## Financeiro › Metas

`src/app/admin/financeiro/calculadora/page.tsx`

**Objetivo.** Simular preço e número de alunos.

**O usuário precisa conseguir**
1. Ver quanto cobrar para atingir a meta.
2. Ver quantos alunos são necessários.
3. Simular uma mudança.

**Primário:** resultado da simulação. **Secundário:** entradas principais. **Terciário:** ajustes avançados.

**Problemas**
- Cerca de 15 tooltips competem pela atenção.
- "Reajuste de mensalidade" no cabeçalho é segmento.
- "Calculadora de metas" é um nome longo para um segmento de 1 palavra.

**Plano de ação**
- "Ajustes avançados" recolhido.
- Remover o botão do cabeçalho.
- Título "Financeiro"; segmento "Metas".

**Seção:** Financeiro › Metas.

## Financeiro › Reajuste

`src/app/admin/financeiro/reajuste/page.tsx`

**Objetivo.** Criar uma campanha de reajuste.

**O usuário precisa conseguir**
1. Simular o novo valor.
2. Ver o impacto no caixa.
3. Criar a campanha.
4. Abrir a lista de envio.

**Primário:** assistente de simulação. **Secundário:** impacto. **Terciário:** campanhas anteriores.

**Problemas**
- O histórico vem antes da tarefa.
- "Calculadora de metas" no cabeçalho é segmento.

**Plano de ação**
- Assistente primeiro; histórico depois.
- Remover o botão do cabeçalho.

**Seção:** Financeiro › Reajuste.

## Lista de envio

`src/app/admin/financeiro/reajuste/[id]/page.tsx` · `AdjustmentSendList`

**Objetivo.** Avisar cada família do reajuste.

**O usuário precisa conseguir**
1. Copiar a mensagem.
2. Abrir o WhatsApp de cada pagador.
3. Marcar quem foi avisado.

**Primário:** lista de pagadores. **Secundário:** mensagem. **Terciário:** —.

**Problemas**
- "Voltar ao reajuste" é um botão de cabeçalho, e não um voltar de pilha.

**Plano de ação**
- Voltar: "‹ Reajuste".

**Seção:** Financeiro, pilha.

## Contratos › Renovações

`src/app/admin/contratos/renovacoes/page.tsx` · `RenewalPipelineChart`

**Objetivo.** Renovar o que vence.

**O usuário precisa conseguir**
1. Ver quem vence ou venceu.
2. Renovar com nova data final.
3. Filtrar por janela.
4. Abrir a ficha.

**Primário:** lista de vencidos e a vencer. **Secundário:** chips de janela. **Terciário:** gráfico.

**Problemas**
- KPIs e gráfico mostram a mesma contagem.
- **Bug:** o tile "31–90d" filtra `due_60d`.
- Badge "Ciclo semestral/anual" fixo.
- `/admin/contratos` é um hub (`ContractLinks`) sem tarefa.
- Título "Esteira de renovações" e botão "Voltar para contratos" no cabeçalho.
- `page.tsx` de `/admin/contratos` tem imports mortos.

**Plano de ação**
- KPIs viram chips; corrigir o filtro de 31–90d.
- Ciclo vem da política.
- `/admin/contratos` renderiza Renovações; remover o hub e o botão.

**Seção:** Contratos › Renovações.

## Contratos › Rescisões

`src/app/admin/contratos/cancelamentos/page.tsx` · `CancellationsList`

**Objetivo.** Decidir os pedidos de rescisão.

**O usuário precisa conseguir**
1. Ver os pedidos pendentes.
2. Decidir a taxa.
3. Registrar a decisão.

**Primário:** pedidos pendentes. **Secundário:** decididos. **Terciário:** —.

**Problemas**
- Título "Solicitações de cancelamento" é o 3º nome (cancelamento, saída, encerramento).

**Plano de ação**
- Manter a tela; título "Rescisões".

**Seção:** Contratos › Rescisões.

## Contratos › Modelo

`src/app/admin/contratos/modelo/page.tsx`

**Objetivo.** Editar e publicar o contrato.

**O usuário precisa conseguir**
1. Editar o texto.
2. Inserir variáveis.
3. Salvar rascunho.
4. Publicar uma versão.

**Primário:** editor. **Secundário:** publicar. **Terciário:** variáveis, versões.

**Problemas**
- A lista de variáveis ocupa espaço fixo ao lado do editor.

**Plano de ação**
- Variáveis viram um popover "Inserir variável".
- Publicar mantém o `ConsequenceDialog`.

**Seção:** Contratos › Modelo.

## Relatórios › Balanço anual

`src/app/admin/relatorios/anual/page.tsx`

**Objetivo.** Ver o ano em 12 meses.

**O usuário precisa conseguir**
1. Ver a receita do ano.
2. Ver a sazonalidade.
3. Ver a permanência e a distribuição de faixas.
4. Trocar de ano.

**Primário:** receita acumulada. **Secundário:** sazonalidade. **Terciário:** faixas, eventos.

**Problemas**
- Usa "Ticket médio" e "Adimplência" (termos substituídos).
- Subtítulo "Visão executiva" é jargão.

**Plano de ação**
- "Mensalidade média" e "Pagamentos em dia".
- Subtítulo: "Receita, permanência e faixas do ano."

**Seção:** Relatórios (sem segmentos).

## Ajustes (raiz)

`src/app/admin/academia/page.tsx`

**Objetivo.** Encontrar uma configuração.

**O usuário precisa conseguir**
1. Achar a configuração pelo nome.
2. Ver o que está no padrão e o que foi configurado.
3. Abrir os passos iniciais ou o histórico.

**Primário:** lista de configurações. **Secundário:** status de cada uma. **Terciário:** Histórico.

**Problemas**
- 6 cards grandes com "Abrir"; o status é a única informação.
- Título "Configurações da academia" e subtítulo "Os valores que antes ficavam fixos no sistema" falam da história do sistema, não do que dá para fazer.
- `headerActions` com Primeiros passos, Histórico e Locais de treino.
- Sistema e backup está fora, em `/admin/sistema`.

**Plano de ação**
- Lista agrupada: Academia · Dinheiro · Graduação · Sistema.
- Status à direita de cada linha, no estilo Ajustes do iOS.
- Subtítulo: "Identidade, regras e valores da academia."

**Seção:** Ajustes (rodapé).

## Ajustes › telas de configuração

`src/app/admin/academia/{identidade,financeiro,graduacoes,contratos,exames,regras,primeiros-passos,historico}/page.tsx`

**Objetivo.** Alterar uma regra da academia.

**O usuário precisa conseguir**
1. Editar a regra.
2. Ver o efeito (quem é afetado).
3. Voltar ao que estava antes.

**Primário:** formulário. **Secundário:** efeito. **Terciário:** histórico.

**Problemas**
- Títulos com "da academia" repetido: "Contratos da academia", "Exames da academia", "Financeiro da academia", "Graduações da academia", "Identidade da academia".
- `regras` tem abas (`Tabs`) sem URL; o texto com link para "Financeiro" é a única saída.
- `graduacoes` tem o botão "Regras de exame" no cabeçalho.
- `financeiro` junta 3 formulários (`BillingPolicyForm`, `PixSettingsForm`, `AccessPolicyForm`).

**Plano de ação**
- Títulos curtos: Identidade, Financeiro e PIX, Graduações, Contratos, Exames, Regras.
- Voltar: "‹ Ajustes".
- `regras` com sentence case nas abas.

**Seção:** Ajustes, pilha.

## Ajustes › Sistema e backup

`src/app/admin/sistema/page.tsx`

**Objetivo.** Ver se está tudo certo.

**O usuário precisa conseguir**
1. Ver o estado geral.
2. Ver a última rotina diária.
3. Ver o último backup.
4. Ver o espaço usado.

**Primário:** resumo. **Secundário:** rotinas. **Terciário:** armazenamento.

**Problemas**
- "Backup externo" aparece duas vezes (resumo e card).
- Título "Sistema e operação" é jargão.

**Plano de ação**
- Remover a duplicata.
- Título "Sistema e backup"; linha em Ajustes.

**Seção:** Ajustes, pilha.

---

# Aluno

## Início

`src/app/aluno/page.tsx`

**Objetivo.** Saber o próximo treino e o que está pendente.

**O usuário precisa conseguir**
1. Ver pendências (ficha, contrato, pagamento).
2. Ver o próximo treino.
3. Ver a faixa e o que falta.

**Primário:** pendências, se houver. **Secundário:** próximo treino. **Terciário:** faixa.

**Problemas**
- A lista "Dados e documentos" (Caminho da faixa, Guia de estudos, Carteirinha e saúde, Questionário de saúde, Meus dados, Documentos e contratos, Meus dependentes) repete o sidebar com 7 links.
- Título "Meu treino" (possessivo) diverge do sidebar ("Início").
- Frequência com gráfico, e a Frequência já tem tela própria.

**Plano de ação**
- Remover a lista.
- Frequência numa linha.
- Título "Início".
- Ordem: pendências → próximo treino → faixa.

**Seção:** Início.

## Treinos › Agenda

`src/app/aluno/calendario/page.tsx`

**Objetivo.** Saber quando e onde treinar.

**O usuário precisa conseguir**
1. Ver os próximos treinos.
2. Salvar na agenda do celular.
3. Ver exames e eventos próximos.

**Primário:** próximos treinos. **Secundário:** salvar na agenda. **Terciário:** exames.

**Problemas**
- O id do container e o subtítulo falam em "exames" mesmo na parte de treinos.
- Título "Calendário de treinos" difere do segmento "Agenda".
- O empty state leva a "Ver minha frequência", com possessivo.

**Plano de ação**
- Corrigir o id e o subtítulo.
- Título "Treinos".
- Empty state: "Ver frequência".

**Seção:** Treinos › Agenda.

## Treinos › Frequência

`src/app/aluno/frequencia/page.tsx`

**Objetivo.** Saber como está a assiduidade.

**O usuário precisa conseguir**
1. Ver a assiduidade do mês.
2. Navegar entre meses.
3. Ver a meta.

**Primário:** assiduidade do mês. **Secundário:** histórico. **Terciário:** meta.

**Problemas**
- A meta de 75% aparece em mais de um lugar.
- Título "Minha frequência" tem possessivo.

**Plano de ação**
- A meta aparece uma vez.
- Título "Treinos".

**Seção:** Treinos › Frequência.

## Faixa › Progresso

`src/app/aluno/evolucao/page.tsx`

**Objetivo.** Saber quanto falta para a próxima faixa.

**O usuário precisa conseguir**
1. Ver a faixa atual e a próxima.
2. Ver o que falta (tempo, presença).
3. Abrir os estudos da faixa.
4. Ver o próximo exame.

**Primário:** progresso para a próxima faixa. **Secundário:** exame e estudos. **Terciário:** histórico de faixas.

**Problemas**
- `StudentMonthlyProgressChart` e `EarnedBadges` aparecem aqui e em Conquistas.
- Título "Caminho da faixa" difere do segmento.
- O subtítulo não usa o `formLabel` da faixa.

**Plano de ação**
- Remover o gráfico mensal e as medalhas; ficam em Conquistas.
- Título "Faixa"; subtítulo com `formLabel`.

**Seção:** Faixa › Progresso.

## Faixa › Exames

`src/app/aluno/exames/page.tsx`

**Objetivo.** Ver e pagar o exame.

**O usuário precisa conseguir**
1. Ver o próximo exame e a taxa.
2. Pagar a taxa.
3. Ver resultados anteriores.

**Primário:** próximo exame. **Secundário:** taxa. **Terciário:** resultados.

**Problemas**
- Título "Meus exames" tem possessivo.

**Plano de ação**
- Manter o conteúdo; título "Faixa".

**Seção:** Faixa › Exames.

## Faixa › Estudos

`src/app/aluno/estudos/page.tsx`

**Objetivo.** Estudar para o próximo exame.

**O usuário precisa conseguir**
1. Rever o Poomsae da faixa.
2. Consultar comandos em coreano.
3. Fazer o teste.

**Primário:** Poomsae da faixa. **Secundário:** comandos. **Terciário:** teste.

**Problemas**
- Título "Guia de estudos"; subtítulo enumera tudo.

**Plano de ação**
- Manter; título "Faixa"; subtítulo curto.

**Seção:** Faixa › Estudos.

## Faixa › Conquistas

`src/app/aluno/conquistas/page.tsx`

**Objetivo.** Celebrar a constância.

**O usuário precisa conseguir**
1. Ver a sequência semanal.
2. Ver as medalhas.
3. Ver o mapa de presenças.

**Primário:** sequência. **Secundário:** medalhas. **Terciário:** mapa de presenças.

**Problemas**
- Título "Conquistas e constância" repete conceito.
- Seções internas repetem o termo "conquistas".
- O empty state pede "Ir para minha matrícula".

**Plano de ação**
- Título "Faixa"; seções renomeadas (Sequência, Medalhas, Presenças).
- Empty state: "Preencher ficha".

**Seção:** Faixa › Conquistas.

## Eventos

`src/app/aluno/eventos/page.tsx`

**Objetivo.** Inscrever-se em eventos.

**O usuário precisa conseguir**
1. Ver os eventos abertos.
2. Inscrever-se.
3. Enviar documentos e pagar.

**Primário:** eventos abertos. **Secundário:** minhas inscrições. **Terciário:** passados.

**Problemas**
- Nenhum relevante.

**Plano de ação**
- Manter.

**Seção:** Eventos.

## Cadastro › Carteirinha

`src/app/aluno/carteirinha/page.tsx`

**Objetivo.** Mostrar a carteirinha.

**O usuário precisa conseguir**
1. Mostrar a carteirinha.
2. Ver a validade do atestado.
3. Ver os contatos de emergência.

**Primário:** carteirinha. **Secundário:** validade. **Terciário:** contatos.

**Problemas**
- Os alertas do banner do layout repetem os da tela.
- O status do PAR-Q aparece em mais de um lugar (linhas 117 e 257).
- Título "Carteirinha e saúde" junta dois segmentos (Carteirinha e Saúde).

**Plano de ação**
- Tirar alertas duplicados.
- Status do PAR-Q uma vez.
- Título "Cadastro".

**Seção:** Cadastro › Carteirinha.

## Cadastro › Ficha

`src/app/aluno/matricula/page.tsx` · `EnrollmentWorkspace`

**Objetivo.** Ver e corrigir os dados.

**O usuário precisa conseguir**
1. Ver o status da ficha.
2. Preencher ou corrigir dados.
3. Enviar documentos.
4. Reenviar depois de uma devolução.

**Primário:** status e o que falta. **Secundário:** formulário. **Terciário:** histórico.

**Problemas**
- **Bug:** o menor vê o status cru em inglês.
- O nome varia: Ficha, Matrícula, Minha matrícula, Meus dados.

**Plano de ação**
- Traduzir o status.
- Título "Cadastro"; segmento "Ficha".

**Seção:** Cadastro › Ficha.

## Cadastro › Saúde

`src/app/aluno/parq/page.tsx` · `ParqForm`

**Objetivo.** Responder o PAR-Q anual.

**O usuário precisa conseguir**
1. Ver a validade.
2. Responder as 10 perguntas.
3. Assinar.

**Primário:** formulário. **Secundário:** validade. **Terciário:** —.

**Problemas**
- O empty state diz "Complete sua matrícula primeiro", e o termo é Ficha.

**Plano de ação**
- Texto "Preencha a ficha primeiro".

**Seção:** Cadastro › Saúde.

## Cadastro › Contratos

`src/app/aluno/contratos/page.tsx` e `[contractId]/page.tsx`

**Objetivo.** Assinar e consultar contratos.

**O usuário precisa conseguir**
1. Ver contratos pendentes.
2. Ler e assinar.
3. Ver os assinados.

**Primário:** contrato pendente. **Secundário:** assinados. **Terciário:** —.

**Problemas**
- **Bug:** o menor vê "Ver contrato" e é redirecionado, porque quem assina é o responsável.
- Título do detalhe "Contrato" sem voltar.

**Plano de ação**
- Esconder "Ver contrato" para o menor.
- Voltar: "‹ Contratos".

**Seção:** Cadastro › Contratos; detalhe em pilha.

## Pagamentos

`src/app/aluno/financeiro/page.tsx`

**Objetivo.** Pagar e enviar o comprovante.

**O usuário precisa conseguir**
1. Ver o que está em aberto.
2. Copiar a chave PIX.
3. Enviar o comprovante.
4. Ver o histórico.

**Primário:** cobrança em aberto. **Secundário:** PIX e comprovante. **Terciário:** histórico e ciclo de acesso.

**Problemas**
- Título "Financeiro e mensalidades" junta dois termos.
- O card do ciclo de acesso aparece também em outras telas.

**Plano de ação**
- Título "Pagamentos".
- O ciclo de acesso só aqui.

**Seção:** Pagamentos (só adulto).

## Configurações (perfil)

**Objetivo.** Ajustar perfil e notificações.

**O usuário precisa conseguir**
1. Editar o perfil.
2. Escolher as notificações.
3. Instalar o app.

**Primário:** perfil. **Secundário:** notificações. **Terciário:** instalação.

**Problemas**
- Abas com "&" e caixa mista.
- Não aparece nas tabelas de seções.

**Plano de ação**
- Abas em sentence case e sem "&". Acesso pelo menu da conta.

**Seção:** fora do sidebar (menu da conta).

---

# Responsável

## Família

`src/app/responsavel/page.tsx`

**Objetivo.** Ver o que cada filho precisa.

**O usuário precisa conseguir**
1. Ver a pendência mais urgente de cada filho.
2. Ver o próximo treino.
3. Abrir um dependente.
4. Gerenciar acessos.

**Primário:** pendência mais urgente. **Secundário:** próximo treino. **Terciário:** acessos.

**Problemas**
- Título "Minha família" (possessivo).
- Cada card repete 7 links que o dependente já oferece.
- A ação "Gerenciar dependentes" não cobre o que a tela faz: acessos e senha.

**Plano de ação**
- Card enxuto: pendência, próximo treino e "Abrir ›".
- Título "Família"; ação "Gerenciar acessos".

**Seção:** Família.

## Gerenciar acessos

`src/app/responsavel/dependentes/page.tsx` · `GuardianMinorsList`

**Objetivo.** Cadastrar dependentes e cuidar do acesso.

**O usuário precisa conseguir**
1. Cadastrar um dependente.
2. Redefinir a senha.
3. Encerrar acessos abertos.

**Primário:** lista. **Secundário:** cadastrar. **Terciário:** —.

**Problemas**
- Título "Gerenciar dependentes" e ação "Ver resumo" duplicam Família.
- O botão de cadastro some quando há 0 dependentes e fica só no empty state.

**Plano de ação**
- Título "Acessos"; voltar: "‹ Família".

**Seção:** Família, pilha.

## Dependente

`src/app/responsavel/dependentes/[profileId]/page.tsx` e sub-rotas `frequencia`, `exames`, `eventos`, `matricula`, `parq`, `contratos`, `financeiro`

**Objetivo.** Cuidar de tudo de um filho.

**O usuário precisa conseguir**
1. Ver pendências do filho.
2. Ver o próximo treino e a faixa.
3. Preencher ficha e PAR-Q.
4. Assinar contratos e pagar.
5. Trocar de dependente.

**Primário:** pendências. **Secundário:** treino e faixa. **Terciário:** acesso e senha.

**Problemas**
- A lista "Áreas de {nome}" (Link com `dependentSections`) repete 7 links no lugar de segmentos.
- **Bug:** a âncora "Acesso e senha" (`#dependen…`) não abre o `Collapsible`.
- Sub-rotas têm títulos soltos ("Financeiro", "Frequência", "Exames de faixa") sem dizer de quem; faltam voltar.
- O empty state do PAR-Q diz "matrícula", e o termo é Ficha.

**Plano de ação**
- Segmentos Treinos · Faixa · Eventos · Cadastro · Pagamentos no lugar da lista.
- Abrir o `Collapsible` pela âncora.
- Voltar: "‹ Família"; títulos com o nome do dependente.

**Seção:** Família, pilha com segmentos próprios.
