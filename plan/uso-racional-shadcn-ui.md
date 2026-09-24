# Uso Racional do shadcn/ui — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: use `frontend-design` and an execution workflow task-by-task. Mark each checkbox only after validation. Preserve business rules and Appwrite authorization.

**Goal:** consolidar os componentes shadcn/ui em um sistema de interface consistente, acessível e mobile-first para os portais de administração, aluno e responsável.

**Architecture:** manter `src/components/ui/` como primitives geradas e sem regras de negócio. Composições reutilizáveis ficam em `src/components/shared/`; componentes específicos permanecem em `src/features/<dominio>/components/`. Server Components continuam buscando dados e Client Components são introduzidos apenas quando a interação exigir estado, Radix ou Recharts.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, shadcn/ui (`radix-nova`), Radix UI, TanStack Table, Recharts, React Hook Form, Zod, Vitest e Testing Library.

---

## 1. Diagnóstico e princípios

Hoje a aplicação usa bem `Sidebar`, `Card`, `Button`, `Badge`, `Input` e `Textarea`, mas ainda possui selects nativos com estilos distintos, feedback em `<p>`, progresso manual, ações financeiras em `<details>` e listas administrativas formadas por muitos cards. O cadastro é longo e semanticamente baseado em `<label>` customizado, sem um contrato único para descrição e erro.

Princípios para a migração:

1. **Tarefa antes do componente:** cada primitive precisa reduzir esforço, erro ou ambiguidade.
2. **Servidor por padrão:** filtros, paginação e busca ficam na URL e no servidor; hidratar somente controles interativos.
3. **Mobile primeiro:** o professor operará pelo celular. Tabelas devem ter uma representação compacta legível, e ações devem manter alvos de toque de pelo menos 44 px.
4. **Estado explícito:** sucesso, erro, vazio, carregando e ação destrutiva devem ter padrões visuais e texto claros.
5. **Acessibilidade:** `FieldLabel`, `aria-invalid`, `FieldError`, foco visível e títulos/descrições obrigatórios em overlays.
6. **Sem decoração gratuita:** gráficos só respondem perguntas; dialogs só interrompem quando a decisão exige atenção.

Fontes oficiais: [Components](https://ui.shadcn.com/docs/components), [Field](https://ui.shadcn.com/docs/components/aria/field), [Data Table](https://ui.shadcn.com/docs/components/aria/data-table), [Sidebar](https://ui.shadcn.com/docs/components/aria/sidebar), [Chart](https://ui.shadcn.com/docs/components/aria/chart), [Dialog](https://ui.shadcn.com/docs/components/base/dialog), [Drawer](https://ui.shadcn.com/docs/components/radix/drawer) e [Alert Dialog](https://ui.shadcn.com/docs/components/base/alert-dialog).

## 2. Matriz de adoção

| Categoria | Componentes | Uso aprovado |
|---|---|---|
| Base transversal | `Button`, `Badge`, `Card`, `Separator`, `Tooltip` | Ações, status, agrupamento e ajuda curta; tooltip nunca contém informação essencial. |
| Formulários | `Field`, `Label`, `Input`, `Textarea`, `Select`, `Checkbox` | Todos os formulários. `Select` para listas fechadas; `Checkbox` para consentimento/seleção independente. |
| Feedback | `Alert`, `Progress`, `Skeleton`, `Spinner` | Alertas persistentes, progresso de matrícula, carregamento estrutural e espera dentro de ações. |
| Navegação | `Sidebar`, `Breadcrumb`, `Tabs`, `Pagination`, `Avatar` | Sidebar global, caminho em páginas profundas, visões irmãs e paginação por URL. |
| Dados | `Table`, TanStack Table, `Chart` | Filas administrativas e tendências financeiras; cards continuam para resumo e mobile. |
| Revelação | `Accordion`, `Collapsible`, `Dialog`, `Drawer`, `AlertDialog` | Detalhes secundários, edição contextual responsiva e confirmação de ações irreversíveis. |
| Arquivos | `Attachment`, `AspectRatio` | Anexos enviados; `AspectRatio` somente em preview de imagem/documento. |
| Uso condicional | `Popover`, `Calendar`, `ButtonGroup`, `Switch` | Date picker não nativo, ações realmente acopladas e preferências booleanas com efeito imediato. |
| Adiar | `InputOTP`, `HoverCard` | Somente quando houver autenticação por código; evitar hover como requisito em uma PWA touch-first. |

`Sheet` já é dependência interna da sidebar no mobile e não deve criar uma segunda navegação. `Tabs` não substitui URLs nem esconde etapas obrigatórias do cadastro.

---

### Fase 1: Estabilizar primitives e criar contratos compartilhados

**Files:**
- Create: `src/components/shared/status-badge.tsx`
- Create: `src/components/shared/feedback-alert.tsx`
- Create: `src/components/shared/empty-state.tsx`
- Create: `src/components/shared/page-breadcrumb.tsx`
- Create: `src/components/shared/metric-card.tsx`
- Create: `src/components/shared/shared-components.test.tsx`
- Modify: `src/app/globals.css`

- [ ] **1.1 Validar a instalação sem reescrever arquivos gerados**

Run: `npm run typecheck && npm run lint && npm test`

Expected: todos os componentes recém-adicionados compilam; qualquer falha preexistente é registrada antes da migração. Não formatar em massa `src/components/ui/`.

- [ ] **1.2 Fixar os contratos das composições compartilhadas**

```ts
type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

type FeedbackAlertProps = {
  tone: Exclude<StatusTone, "neutral">;
  title: string;
  description?: string;
};

type EmptyStateProps = {
  title: string;
  description: string;
  action?: React.ReactNode;
};
```

`StatusBadge` recebe label já traduzida; não traduz enums internamente. `MetricCard` recebe `label`, `value`, `helper` e `tone`, sem conhecer financeiro.

- [ ] **1.3 Testar semântica e acessibilidade básica**

Em `shared-components.test.tsx`, verificar `role="alert"` para erros, heading e ação do estado vazio, `aria-current="page"` no breadcrumb e texto visível do status.

Run: `npm test -- src/components/shared/shared-components.test.tsx`

Expected: PASS.

- [ ] **1.4 Consolidar tokens sem redesenhar a marca**

Adicionar em `globals.css` tokens semânticos para sucesso, aviso, informação e séries de gráfico. Manter contraste AA, `--radius` atual e as fontes existentes. Não codificar cores de status diretamente nas páginas.

- [ ] **1.5 Commit**

```bash
git add src/components/shared src/app/globals.css
git commit -m "feat: establish shared UI patterns"
```

### Fase 2: Padronizar formulários e anexos

**Files:**
- Create: `src/components/shared/form-submit-button.tsx`
- Create: `src/components/shared/file-field.tsx`
- Modify: `src/features/students/components/enrollment-form.tsx`
- Modify: `src/features/students/components/graduation-fields.tsx`
- Modify: `src/features/classes/components/class-manager.tsx`
- Modify: `src/features/students/components/review-panel.tsx`
- Modify: `src/components/auth/login-card.tsx`
- Modify: `src/components/auth/register-card.tsx`
- Modify: `src/app/admin/financeiro/configuracoes/page.tsx`
- Test: `src/features/students/components/enrollment-form.test.tsx`

- [ ] **2.1 Escrever testes dos valores submetidos**

Cobrir `account_type`, GUB/faixa, turma, condição de saúde, vencimento e consentimentos. O teste deve provar que cada `Select` mantém seu atributo `name` e produz o mesmo `FormData` aceito pelas Server Actions atuais.

- [ ] **2.2 Migrar labels para a composição acessível**

Usar `Field > FieldLabel + controle + FieldDescription/FieldError`; grupos usam `FieldSet` e `FieldLegend`. Cada controle recebe `id`, `name`, `autoComplete` quando aplicável e `aria-invalid` quando houver erro retornado.

- [ ] **2.3 Substituir listas fechadas por `Select`**

Migrar tipo de conta, GUB/faixa, turma, saúde, vencimento e tipo de chave PIX. Manter `Input type="date"` e `type="month"`: `Calendar + Popover` só entra depois de teste real demonstrar problema no navegador móvel.

- [ ] **2.4 Melhorar upload com `FileField` e `Attachment`**

O input de arquivo continua nativo para compatibilidade. `Attachment` representa arquivo selecionado/enviado, tamanho, tipo, status e ação de remover; foto usa preview com texto alternativo. Erros de 5 MB e MIME inválido aparecem no próprio `FieldError`.

- [ ] **2.5 Exibir estado pendente de submissão**

`FormSubmitButton` usa `useFormStatus`, desabilita duplo envio e mostra `Spinner` com texto (“Salvando…”, “Enviando…”). Não usar spinner sem rótulo acessível.

- [ ] **2.6 Validar e commitar**

Run: `npm test -- src/features/students/components && npm run typecheck && npm run lint`

Expected: valores enviados e regras de graduação permanecem idênticos.

```bash
git add src/components/shared src/features src/components/auth src/app/admin/financeiro/configuracoes/page.tsx
git commit -m "refactor: standardize forms with shadcn fields"
```

### Fase 3: Refinar shell e navegação contextual

**Files:**
- Modify: `src/components/dashboard/dashboard-shell.tsx`
- Modify: `src/components/dashboard/app-sidebar.tsx`
- Modify: `src/components/dashboard/portal-shell.tsx`
- Modify: `src/lib/navigation/routes.ts`
- Test: `src/components/dashboard/app-sidebar.test.tsx`

- [ ] **3.1 Adicionar breadcrumb dirigido por dados**

`PortalShell` recebe opcionalmente `breadcrumbs: Array<{ label: string; href?: string }>`; páginas de detalhe exibem, por exemplo, `Matrículas / Camila Ferreira`. O último item não é link e usa `aria-current="page"`.

- [ ] **3.2 Organizar a sidebar por tarefas**

Admin: “Visão geral”, “Alunos” (`Matrículas`, futuramente cadastro), “Operação” (`Turmas`, aulas/exames futuros), “Financeiro” e “Documentos” (`Contratos`). Aluno/responsável mantêm somente destinos permitidos. Usar `Collapsible` apenas quando um grupo tiver dois ou mais links.

- [ ] **3.3 Adicionar identidade da sessão**

No `SidebarFooter`, mostrar `Avatar` com iniciais, nome, papel e logout. Manter o bloco de avisos apenas quando houver aviso acionável; remover texto genérico sobre funcionalidades futuras.

- [ ] **3.4 Testar navegação**

Verificar link ativo, grupos por papel, nomes acessíveis dos ícones e comportamento recolhido. Testar teclado e sidebar móvel, que já usa `Sheet` internamente.

Run: `npm test -- src/components/dashboard && npm run build`

- [ ] **3.5 Commit**

```bash
git add src/components/dashboard src/lib/navigation/routes.ts
git commit -m "feat: improve portal navigation hierarchy"
```

### Fase 4: Transformar filas administrativas em ferramentas operacionais

**Files:**
- Create: `src/features/students/components/enrollment-table.tsx`
- Create: `src/features/billing/components/billing-table.tsx`
- Create: `src/components/shared/responsive-data-view.tsx`
- Modify: `src/app/admin/matriculas/page.tsx`
- Modify: `src/app/admin/financeiro/page.tsx`
- Modify: `src/features/students/service.ts`
- Modify: `src/features/billing/report-service.ts`
- Test: `src/features/students/components/enrollment-table.test.tsx`
- Test: `src/features/billing/components/billing-table.test.tsx`

- [ ] **4.1 Manter filtros e paginação na URL**

Criar filtros com `Field`, `Input`, `Select` e `ButtonGroup` apenas para “Aplicar/Limpar”. `Pagination` gera links preservando todos os parâmetros atuais. Não transferir consultas Appwrite para o browser.

- [ ] **4.2 Criar tabelas específicas, não um DataTable universal**

Conforme a recomendação oficial, cada tabela define suas próprias colunas e filtros. Matrículas: aluno, graduação, turma, vencimento, status e ação. Financeiro: aluno, competência, vencimento, valor, status e ação. TanStack controla apenas ordenação/visibilidade local quando isso não contradiz a ordenação do servidor.

- [ ] **4.3 Oferecer leitura responsiva**

Em telas `md+`, renderizar `Table` com cabeçalhos semânticos. Em celular, `ResponsiveDataView` renderiza itens compactos com a mesma informação principal e uma ação evidente; não forçar scroll horizontal para operações diárias.

- [ ] **4.4 Criar estados vazios orientativos**

Exemplos: “Nenhuma matrícula aguardando análise” e “Nenhuma cobrança neste filtro”, com ação “Limpar filtros” quando aplicável.

- [ ] **4.5 Validar e commitar**

Run: `npm test -- src/features/students/components/enrollment-table.test.tsx src/features/billing/components/billing-table.test.tsx && npm run build`

Expected: filtros sobrevivem à paginação; todas as ações existentes continuam alcançáveis em 360 px.

```bash
git add src/app/admin src/features/students src/features/billing src/components/shared
git commit -m "feat: add responsive admin data views"
```

### Fase 5: Tornar ações críticas seguras e progressivas

**Files:**
- Create: `src/components/shared/responsive-dialog.tsx`
- Create: `src/features/billing/components/charge-actions.tsx`
- Modify: `src/app/admin/financeiro/page.tsx`
- Modify: `src/features/students/components/review-panel.tsx`
- Modify: `src/features/contracts/components/contract-workspace.tsx`
- Modify: `src/app/admin/contratos/cancelamentos/page.tsx`
- Test: `src/features/billing/components/charge-actions.test.tsx`

- [ ] **5.1 Criar overlay responsivo**

`ResponsiveDialog` usa `Dialog` em desktop e `Drawer` em mobile, ambos com o mesmo `title`, `description`, corpo e rodapé. Usar para registrar/ajustar pagamento e revisar detalhes sem perder o contexto da lista.

- [ ] **5.2 Reservar `AlertDialog` para consequências reais**

Exigir confirmação ao estornar pagamento, rejeitar comprovante, rejeitar matrícula e confirmar cancelamento com taxa. A descrição informa aluno, valor e consequência; o foco inicial fica em cancelar.

- [ ] **5.3 Substituir `<details>` por padrões acessíveis**

Usar `Accordion` para histórico e conteúdo secundário; usar `ResponsiveDialog` para formulários de ação. `Collapsible` fica restrito a filtros avançados sem consequência.

- [ ] **5.4 Testar foco e submissão única**

Cobrir abertura, Escape, retorno do foco ao gatilho, cancelamento sem chamada da action e confirmação com os hidden fields corretos.

Run: `npm test -- src/features/billing/components/charge-actions.test.tsx && npm run typecheck`

- [ ] **5.5 Commit**

```bash
git add src/components/shared src/features src/app/admin
git commit -m "feat: add safe responsive action flows"
```

### Fase 6: Melhorar os fluxos de aluno e responsável

**Files:**
- Modify: `src/features/students/components/enrollment-form.tsx`
- Modify: `src/features/students/components/enrollment-workspace.tsx`
- Modify: `src/features/billing/components/payer-billing.tsx`
- Modify: `src/features/contracts/components/contract-workspace.tsx`
- Modify: `src/app/responsavel/dependentes/page.tsx`
- Test: `src/features/students/components/enrollment-workspace.test.tsx`

- [ ] **6.1 Trocar a barra manual por `Progress`**

Fornecer `value`, `aria-label` e texto “N de 9 itens essenciais”. O cálculo continua baseado nos mesmos campos e nunca representa aprovação administrativa.

- [ ] **6.2 Usar `Accordion` apenas para revisão**

No cadastro, manter as seções abertas para não esconder pendências. Após envio, apresentar resumo em accordion por “Dados pessoais”, “Saúde”, “Taekwondo”, “Pagamento” e “Documentos”.

- [ ] **6.3 Organizar financeiro do pagador**

Usar `Tabs` somente para “Em aberto” e “Histórico”, preservando `?visao=aberto|historico` na URL. PIX fica em card de destaque; comprovantes usam `Attachment`; status usa `StatusBadge`.

- [ ] **6.4 Tornar dependentes reconhecíveis**

Usar `Avatar` com foto autorizada ou iniciais, faixa e status. Ações sensíveis de senha/sessão usam `AlertDialog`; acesso à matrícula, contrato e financeiro continua por links claros.

- [ ] **6.5 Validar e commitar**

Run: `npm test -- src/features/students/components/enrollment-workspace.test.tsx && npm run build`

```bash
git add src/features src/app/responsavel
git commit -m "feat: refine student and guardian portal UX"
```

### Fase 7: Dashboard financeiro com visualização útil

**Files:**
- Create: `src/features/billing/components/billing-trend-chart.tsx`
- Create: `src/features/billing/chart-data.ts`
- Create: `src/features/billing/chart-data.test.ts`
- Modify: `src/features/billing/report-service.ts`
- Modify: `src/app/admin/financeiro/page.tsx`

- [ ] **7.1 Definir a pergunta do gráfico**

Exibir uma única série de seis competências: recebido, pendente e inadimplente. KPIs atuais permanecem em `MetricCard`; o gráfico mostra tendência, não repete números sem contexto.

- [ ] **7.2 Testar transformação de dados**

Cobrir competências sem movimento, ordenação cronológica e valores em centavos. `chart-data.ts` recebe registros e retorna dados serializáveis, sem importar Recharts.

- [ ] **7.3 Implementar chart acessível**

Usar `ChartContainer` com altura mínima, `BarChart accessibilityLayer`, labels em pt-BR, tooltip em reais e legenda. Abaixo do gráfico, fornecer resumo textual para não depender de cor ou hover.

- [ ] **7.4 Validar e commitar**

Run: `npm test -- src/features/billing/chart-data.test.ts && npm run build`

```bash
git add src/features/billing src/app/admin/financeiro/page.tsx
git commit -m "feat: add accessible billing trends"
```

### Fase 8: Loading states, responsividade e aceite

**Files:**
- Create: `src/app/admin/loading.tsx`
- Create: `src/app/aluno/loading.tsx`
- Create: `src/app/responsavel/loading.tsx`
- Create: `src/components/shared/page-skeleton.tsx`
- Modify: `plan/fase-9-ui-ux.md`

- [ ] **8.1 Criar skeletons proporcionais ao conteúdo**

Usar `Skeleton` para cabeçalho, métricas e linhas; não simular conteúdo que nunca aparecerá. `Spinner` continua reservado a ações curtas dentro de botões.

- [ ] **8.2 Auditar os 27 componentes**

Run: `rg 'components/ui/' src --glob '*.tsx'`

Registrar no fim deste documento quais primitives foram adotadas, adiadas ou removidas. Componente sem caso de uso pode permanecer instalado, mas não deve ser forçado na UI.

- [ ] **8.3 Executar matriz de QA**

Validar admin, aluno adulto, responsável e menor em 360, 768, 1280 e 1536 px; zoom de 200%; teclado; leitor de tela; tema atual; estados vazio, erro e carregando. Confirmar que dialogs têm título/descrição, campos têm label e charts têm alternativa textual.

- [ ] **8.4 Executar regressão completa**

Run: `npm test && npm run lint && npm run typecheck && npm run build`

Expected: todos passam; nenhuma regra de matrícula, contrato, pagamento ou permissão muda.

- [ ] **8.5 Atualizar a Fase 9 e commitar**

Marcar os itens correspondentes em `plan/fase-9-ui-ux.md` e registrar achados que dependem do piloto.

```bash
git add src/app/*/loading.tsx src/components/shared/page-skeleton.tsx plan
git commit -m "docs: complete shadcn UI adoption plan"
```

## Critérios finais de aceite

- O usuário identifica página, estado e ação principal sem depender de cor.
- Formulários têm rótulo, ajuda, erro próximo ao campo e bloqueio de duplo envio.
- Filas administrativas são utilizáveis em 360 px e eficientes em desktop.
- Ações irreversíveis mostram consequência e podem ser canceladas com segurança.
- Sidebar, breadcrumb e URLs concordam sobre a localização atual.
- Gráficos complementam — não substituem — valores e explicações textuais.
- Nenhuma primitive contém regra de domínio, acesso ao Appwrite ou texto específico de aluno.
- Testes, lint, typecheck e build passam ao fim de cada fase relevante.

