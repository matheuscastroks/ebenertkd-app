# Planejamento: Estratégia de Skeleton Granular e Streaming por Componente (Padrão de UI/UX)

> **Objetivo:** Eliminar a substituição completa da interface durante navegações e carregamentos. Toda a estrutura estática (cabeçalhos, títulos, subtítulos, breadcrumbs, abas, botões de ação e molduras de cards) deve carregar imediatamente, exibindo animações de skeleton **apenas nos componentes dinâmicos internos** que aguardam dados assíncronos do backend.

---

## 1. Diagnóstico da Arquitetura Atual e Problemas

### 1.1 O Bloqueio por `loading.tsx` no App Router
- Atualmente, as pastas principais possuem arquivos de carregamento no nível de rota:
  - `src/app/admin/loading.tsx`
  - `src/app/aluno/loading.tsx`
  - `src/app/responsavel/loading.tsx`
- Todos eles invocam `<PageSkeleton />`, que desenha um esqueleto genérico cobrindo título, subtítulo, botões e tabelas.
- **Efeito colateral:** Quando o usuário clica em qualquer link da sidebar (ex: Turmas, Financeiro, Exames, Matrículas), o Next.js suspende **toda a página**, apagando a UI existente e mostrando um bloco cinza piscando. Ao carregar, a tela dá um "pulo" de layout (CLS elevado) para renderizar a página real.

### 1.2 O Bloqueio no Topo das Funções `page.tsx`
- Nas páginas atuais, todas as requisições de banco de dados são executadas via `await Promise.all([...])` logo nas primeiras linhas da função `page.tsx`, antes de qualquer retorno de JSX.
- **Efeito colateral:** O React Server Component não consegue fazer *streaming* de nenhum pedaço de HTML até que a consulta mais lenta termine.

---

## 2. Nova Arquitetura Padrão: "Shell Estático Imediato + Suspense Granular"

A nova estratégia divide cada tela em três camadas claras:

```
┌──────────────────────────────────────────────────────────┐
│ 1. Shell Estático Imediato (Renderiza no 1º milissegundo) │
│    - PortalShell (Título, Subtítulo, Breadcrumbs)        │
│    - Botões de Ação no Topo ("Novo Exame", "Filtros")    │
│    - Barra de Abas / Filtros Visuais                     │
│    - Moldura Externa dos Cards (CardHeader com Título)   │
└──────────────────────────┬───────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│ 2. Limite React <Suspense fallback={<SlotSkeleton />}>   │
│    - Encapsula APENAS a região que consome dados         │
│    - Preserva o container intacto (Zero Layout Shift)    │
└──────────────────────────┬───────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│ 3. Componente Assíncrono de Dados (Streaming RSC)        │
│    - Executa a query de dados isoladamente               │
│    - Renderiza o conteúdo dinâmico final no slot         │
└──────────────────────────────────────────────────────────┘
```

### Vantagens Desta Abordagem:
1. **Sensação de Aplicativo Nativo Instantâneo:** Ao tocar em uma aba ou menu, o usuário vê a página abrir imediatamente com todos os títulos e controles no lugar.
2. **Zero Layout Shift (CLS = 0):** O skeleton possui exatamente as mesmas dimensões, paddings e estrutura de grade do componente que irá substituí-lo.
3. **Carregamento Paralelo Progressivo:** Se as métricas do topo responderem em 50ms e a tabela demorar 200ms, as métricas aparecem primeiro enquanto apenas a tabela continua pulsando suavemente.

---

## 3. Biblioteca Central de Skeletons Contextuais

Criaremos um módulo unificado em `src/components/skeletons/` contendo fallbacks especializados:

1. **`MetricCardsSkeleton`:**
   - Grade responsiva (1 a 4 colunas) com cards no tamanho exato de `<MetricCard>` (rótulo, valor grande e texto auxiliar).
2. **`TableRowsSkeleton`:**
   - Linhas de tabela com colunas proporcionais (avatar, nome, badge, valor, botão de ação) e versão alternativa em cards empilhados para mobile (`md:hidden`).
3. **`CardGridSkeleton`:**
   - Grade de cards para Turmas e Exames, com espaço reservado para chips de dias da semana, horário e botão inferior.
4. **`CalendarSkeleton`:**
   - Grade mensal de 7 colunas (Seg a Dom) com células pulsando de forma sutil, preservando os botões de avançar/voltar mês no topo.
5. **`ListItemsSkeleton`:**
   - Lista vertical para Avisos e Solicitações de Cancelamento com ícone, prévia e data.

---

## 4. Plano de Execução por Módulo e Telas

### Fase 1: Fundação & Remoção dos Bloqueios Globais
- [x] **1.1 Ajustar `loading.tsx` dos Portais:**
  - Remover a substituição de tela inteira em `src/app/admin/loading.tsx`, `src/app/aluno/loading.tsx` e `src/app/responsavel/loading.tsx`.
  - Transformá-los em fallbacks transparentes ou barras de progresso superiores discretas que não ocultem o shell da rota.
- [x] **1.2 Criar a Biblioteca de Skeletons Contextuais:**
  - Criar `src/components/skeletons/metric-cards-skeleton.tsx`
  - Criar `src/components/skeletons/table-rows-skeleton.tsx`
  - Criar `src/components/skeletons/card-grid-skeleton.tsx`
  - Criar `src/components/skeletons/list-items-skeleton.tsx`

---

### Fase 2: Painéis Administrativos (`/admin`)

- [x] **2.1 Dashboard do Professor (`src/app/admin/page.tsx`):**
  - **Estático imediato:** Título "Visão geral", subtítulo, atalhos rápidos e molduras dos cards principais.
  - **Suspense 1 (Métricas):** `<Suspense fallback={<MetricCardsSkeleton count={4} />}> <AdminDashboardMetrics /> </Suspense>`
  - **Suspense 2 (Turmas de Hoje):** `<Suspense fallback={<CardGridSkeleton count={2} />}> <TodayClassesSection /> </Suspense>`
  - **Suspense 3 (Fila de Matrículas e Comprovantes):** `<Suspense fallback={<ListItemsSkeleton count={3} />}> <PendingReviewsSection /> </Suspense>`

- [x] **2.2 Turmas (`src/app/admin/turmas/page.tsx`):**
  - **Estático imediato:** Título "Turmas e horários", botão "Nova turma" com modal, cabeçalho da seção.
  - **Suspense:** `<Suspense fallback={<CardGridSkeleton count={4} />}> <ClassesGrid /> </Suspense>`

- [x] **2.3 Fila de Matrículas (`src/app/admin/matriculas/page.tsx`):**
  - **Estático imediato:** Título "Matrículas", botão "Acessos dos alunos", formulário de busca e filtros (`EnrollmentFilters`).
  - **Suspense:** `<Suspense fallback={<TableRowsSkeleton columns={6} rows={5} />}> <EnrollmentTableData /> </Suspense>`

- [x] **2.4 Painel Financeiro (`src/app/admin/financeiro/page.tsx`):**
  - **Estático imediato:** Título "Painel financeiro", botões "Configurar PIX" e "Exportar", filtros de competência e abas de status.
  - **Suspense 1 (Métricas de Caixa):** `<Suspense fallback={<MetricCardsSkeleton count={4} />}> <BillingMetrics /> </Suspense>`
  - **Suspense 2 (Fila de Comprovantes):** `<Suspense fallback={<ListItemsSkeleton count={2} />}> <PendingProofsQueue /> </Suspense>`
  - **Suspense 3 (Tabela de Mensalidades):** `<Suspense fallback={<TableRowsSkeleton columns={5} rows={6} />}> <BillingTableData /> </Suspense>`

- [x] **2.5 Exames de Faixa (`src/app/admin/exames/page.tsx` e `[eventId]/page.tsx`):**
  - **Lista (`/admin/exames`):** Título e botão "Novo exame" imediatos; grade de exames dentro de Suspense.
  - **Detalhe (`/admin/exames/[eventId]`):** Banner com nome do exame e data imediatos; lista de alunos elegíveis e participantes dentro de Suspenses independentes.

- [x] **2.6 Contratos e Cancelamentos (`src/app/admin/contratos/page.tsx` e `cancelamentos/page.tsx`):**
  - Título e navegação imediatos; dados de versões e solicitações de rescisão em Suspense.

- [x] **2.7 Sistema e Diagnóstico (`src/app/admin/sistema/page.tsx`):**
  - Título e cards externos imediatos; gauges de armazenamento e status de rotinas em Suspense.

---

### Fase 3: Portal do Aluno (`/aluno`)

- [x] **3.1 Dashboard do Aluno (`src/app/aluno/page.tsx`):**
  - **Estático imediato:** Saudação "Olá, [Nome]", BeltBadge de graduação, links de navegação rápida e dados cadastrais.
  - **Suspense 1 (Próximo Treino):** `<Suspense fallback={<TrainingHeroSkeleton />}> <NextTrainingSection /> </Suspense>`
  - **Suspense 2 (Situação Financeira):** `<Suspense fallback={<BillingBannerSkeleton />}> <StudentBillingBanner /> </Suspense>`
  - **Suspense 3 (Jornada de Graduação):** `<Suspense fallback={<GraduationCardSkeleton />}> <StudentGraduationSection /> </Suspense>`

- [x] **3.2 Frequência do Aluno (`src/app/aluno/frequencia/page.tsx`):**
  - **Estático imediato:** Título, legenda de presença/falta e seletor de mês.
  - **Suspense:** `<Suspense fallback={<AttendanceCalendarSkeleton />}> <CalendarData /> </Suspense>`

- [x] **3.3 Financeiro do Aluno (`src/app/aluno/financeiro/page.tsx`):**
  - **Estático imediato:** Título, instruções de PIX e abas de filtro (Em aberto, Em análise, Pagos).
  - **Suspense:** `<Suspense fallback={<PayerBillingSkeleton />}> <PayerBillingData /> </Suspense>`

- [x] **3.4 Contratos do Aluno (`src/app/aluno/contratos/page.tsx`):**
  - **Estático imediato:** Título e subtítulo; lista de termos em Suspense.

---

### Fase 4: Portal do Responsável (`/responsavel`)

- [x] **4.1 Gestão de Dependentes (`src/app/responsavel/dependentes/page.tsx`):**
  - **Estático imediato:** Título "Meus dependentes", botão "Adicionar dependente" com modal.
  - **Suspense:** `<Suspense fallback={<CardGridSkeleton count={2} />}> <MinorsList /> </Suspense>`

- [x] **4.2 Páginas de Dependente (Frequência, Financeiro, Contratos):**
  - Mesma padronização: o contexto do aluno e controles de filtro aparecem na hora; o miolo da tabela ou calendário pulsa localmente enquanto busca.

---

### Fase 5: Central de Avisos (`/avisos`)

- [x] **5.1 Feed de Avisos (`src/app/avisos/page.tsx`):**
  - **Estático imediato:** Título "Avisos da academia", botão "Novo aviso" (para admin), abas de filtro (Todos / Não lidos).
  - **Suspense:** `<Suspense fallback={<ListItemsSkeleton count={4} />}> <AnnouncementsList /> </Suspense>`

---

## 5. Critérios de Homologação e Qualidade

1. **Teste Visual de Navegação (Zero Flash & Zero CLS):**
   - Ao trocar de rota na barra lateral ou na navegação inferior móvel, os títulos e containers não piscam em branco nem somem.
   - O skeleton ocupa exatamente a mesma altura e largura que o card ou tabela final.
2. **Desempenho com Rede Lenta (DevTools Throttle "Fast 3G"):**
   - O frame e os controles aparecem instantaneamente (< 100ms).
   - Apenas o slot de dados mostra o pulsar cinza até a conclusão da requisição.
3. **Integridade Funcional:**
   - 100% dos testes unitários e de integração existentes (240 testes) continuam passando.
   - `npm run lint`, `npm run typecheck` e `npm run build` limpos e sem quebra de tipagem.
