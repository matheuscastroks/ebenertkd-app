# Diretrizes Apple HIG para Web — Ebener TKD

Adaptação dos princípios de **Design Principles** e **Layout** das *Human Interface Guidelines (HIG)* da Apple para a aplicação web Next.js + Tailwind CSS do **Ebener TKD**. Este guia complementa o [Contrato de Design](./contrato-de-design.md), os [Princípios de Design](./design-principles.md), as [Diretrizes de Carga Cognitiva](./diretrizes-carga-cognitiva.md) e o [Contrato de Componentes](./component-contract.md).

> Em caso de conflito entre qualquer referência externa e o [Contrato de Design](./contrato-de-design.md), **o Contrato de Design vence** (Poppins exclusivo, pesos `400`/`500`/`600`, tokens semânticos de cor, três níveis de superfície e zero exceções de estilo proibidas).

---

## 1. Princípios Fundamentais (HIG Design Principles → Web)

### 1.1 Hierarquia Visual e Clareza (*Clarity*)
- **Foco imediato na ação primária**: cada tela destaca no máximo uma ação principal em `bg-primary text-primary-foreground` (laranja da marca). Ações secundárias usam `outline` ou `ghost`.
- **Leitura natural**: informações mais importantes aparecem no topo e à esquerda (ordem de leitura de cima para baixo, da esquerda para a direita), com títulos em `text-2xl font-semibold tracking-tight` e seções em `text-base font-semibold`.
- **Tipografia legível e escaneável**: somente fonte Poppins (`text-sm` para corpo e ações; `text-xs` apenas para metadados e selos), números alinhados com `tabular-nums` e contraste mínimo de 4,5:1 nos temas claro e escuro.
- **Uso contido de cor semântica**: `StatusBadge` aplica pares opacos de alto contraste (`bg-success-soft`, `bg-warning-soft`, `bg-info-soft`, `bg-danger-soft`, `bg-muted`), evitando cores literais de paleta fora da representação real de faixas (`BeltBadge`).

### 1.2 Deferência ao Conteúdo (*Deference*)
- **Interface silenciosa em três planos (`L0 / L1 / L2`)**:
  - `L0` (`bg-background`): tela base.
  - `L1` (`bg-card`): blocos de conteúdo e listas agrupadas.
  - `L2` (`bg-popover`): popovers, menus e modais.
- **Zero "card dentro de card"**: dentro de um `<Card>`, separe seções por respiro (`space-y-4`/`space-y-6`) e divisores finos (`divide-y divide-border`, `border-t border-border`, `<Separator />`), nunca por novos cards com borda e sombra empilhados.
- **O dado do aluno e do dojang no centro**: remova caixas decorativas, ícones em quadrados coloridos ou textos redundantes que disputam atenção com horários de treino, situação financeira ou pendências de matrícula.

### 1.3 Profundidade com Contenção (*Depth*)
- **Separação por contraste tonal e borda sutil**: planos se distinguem pela diferença de luminosidade entre `background`, `card` e `popover` somada a `border border-border` de 1 px (sem opacidades arbitrárias como `/30`, `/50` ou `/80`).
- **Sombras restritas**: apenas `shadow-xs` (opcional em cards e inputs) e `shadow-md` (em overlays como popovers, dialogs e drawers). Sombras pesadas (`shadow-lg`, `shadow-2xl`) e classes `depth-*` são proibidas.
- **Camadas modais apenas para consequência real**: use `AlertDialog` para ações irreversíveis (aprovar pagamento, estornar, reprovar documento, aprovar rescisão, publicar contrato) exibindo quem, quanto, quando e o impacto para o aluno.

### 1.4 Consistência e Harmonia (*Consistency & Harmony*)
- **Tokens e proporções previsíveis**: raios padronizados (`rounded-lg` para botões, inputs e badges; `rounded-xl` para cards e listas agrupadas; `rounded-2xl` para modais e gavetas), espaçamentos em múltiplos de 4 (`gap-2/3/4/6`, `p-4/5/6`) e movimento orientado pela escala compartilhada de tokens em `src/app/globals.css` (sempre propriedades explícitas — nunca `transition-all` — e com suporte a `prefers-reduced-motion: reduce`).
- **Experiência uniforme entre portais**: Admin (`/admin`), Aluno (`/aluno`) e Responsável (`/responsavel`) compartilham os mesmos padrões de cabeçalho (`DashboardShell`), tabela/cartão (`ResponsiveDataView`), campos (`Field`, `DateField`, `PhoneField`) e retorno (`OperationToast`).
- **Linguagem direta do dojang**: português do Brasil sem termos técnicos internos (nunca expor nomes de banco, IDs internos ou jargão de infraestrutura).

### 1.5 Divulgação Progressiva (*Progressive Disclosure*)
- **Essencial na primeira leitura**: itens de fila, cobranças e histórico exibem na primeira linha apenas o necessário para decidir (quem, estado e ação direta).
- **Detalhes sob demanda**: observações longas, históricos de análise, edições cadastrais e filtros avançados ficam recolhidos em `Accordion`, `Dialog`, `Drawer` ou na tela de detalhe (`/admin/matriculas/[studentId]`).

---

## 2. Diretrizes de Layout para Web (HIG Layout → Tailwind / React)

### 2.1 Superfícies e Listas Agrupadas (*Inset Grouped Lists*)
Para coleções homogêneas (alunos, candidatos de exame, parcelas, lançamentos de frequência e históricos), agrupe os itens em um único container com divisores internos em vez de criar N `<Card>` separados:

```tsx
<div className="divide-y divide-border rounded-xl border border-border bg-card shadow-xs">
  {items.map((item) => (
    <div key={item.id} className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
        <p className="text-sm text-muted-foreground">{item.subtitle}</p>
      </div>
      <StatusBadge tone={item.tone}>{item.statusLabel}</StatusBadge>
    </div>
  ))}
</div>
```

- Quando houver cabeçalho de seção, mantenha o mesmo container `rounded-xl border border-border bg-card` com título acima da lista dividida por `divide-y divide-border`.

### 2.2 Ritmo de Viewport (`100dvh`) e Sem Scroll Horizontal Acidental
- **Fluxos de entrada em `min-h-dvh`**: telas de login, cadastro e recuperação de senha devem caber confortavelmente em `min-h-dvh` sem cortes em barras de navegador mobile nem rolagem horizontal.
- **Tabelas desktop dimensionadas para `1280px`**: considerando a barra lateral fixa (`256px`) e o padding do conteúdo (`md:p-6`, `48px`), a área útil da tabela em `1280×800` é de ~`974px`.
  - Use `ResponsiveDataView` para entregar `<Table>` no desktop (`md+`) e cartões verticais no mobile (`< md`).
  - Limite células textuais variáveis com `min-w-0` e larguras máximas explícitas em elementos de bloco internos (ex.: `max-w-44 whitespace-normal line-clamp-2` no nome do aluno e `max-w-36 whitespace-normal` na coluna de turma), pois `max-w-*` aplicado isoladamente em `<td>` pode ser ignorado pelo cálculo automático de tabela.
  - Preserve a última coluna de ação em linha única (`whitespace-nowrap text-right`) para que o botão (`Analisar` / `Ver`) nunca seja cortado na borda direita.

### 2.3 Alinhamento de Formulários
- Em grades de duas colunas (`grid gap-3 sm:grid-cols-2`), rótulos mais extensos podem quebrar em duas linhas em painéis laterais estreitos enquanto o campo vizinho permanece em uma linha.
- Aplique `items-end` na grade (`className="grid gap-3 sm:grid-cols-2 items-end"`) quando os campos contiverem apenas rótulo e controle de altura equivalente (`h-10` em `<Input>` e no gatilho de `<DateField>`): as bases dos controles alinham horizontalmente e o rótulo curto permanece ancorado junto ao seu campo.
- **Atenção a erros inline (`FieldError`)**: se os campos da mesma linha puderem renderizar mensagens de erro variáveis abaixo do controle, prefira rótulos concisos de mesma altura ou alinhamento consistente que não desloque o controle irmão para cima quando apenas um campo falhar.

### 2.4 Alvos de Toque, Áreas Seguras e Espaçamento
- **Mínimo de `44×44 px` (`h-11` / `min-h-11`)**: todo botão ou link acionável no mobile e nos fluxos operacionais do professor no tatame deve atingir ao menos `44px` de altura (ou `min-h-11 sm:min-h-9` quando a densidade de barra desktop pedir `36px`).
- **Espaçamento de células e controles**: mantenha o respiro padrão de `src/components/ui/table.tsx` (`px-4 py-3 first:pl-5 last:pr-5`) ou ajustes simétricos entre `<SortableTableHead>` e `<TableCell>` para preservar alinhamento vertical entre cabeçalho e dados.
- **Safe areas no mobile**: respeite `env(safe-area-inset-bottom)` acima da navegação inferior para não cobrir botões de envio ou paginação.

### 2.5 Escala de Movimento e Transições (`transitions.dev`)

Todas as transições e animações seguem os tokens compartilhados definidos em `:root` de `src/app/globals.css`, proibindo valores soltos e `transition-all`:

- **Durações**: `--duration-stagger` (`40ms`), `--duration-micro` (`80ms`), `--duration-quick` (`150ms`), `--duration-fast` (`250ms`), `--duration-medium` (`350ms`), `--duration-slow` (`400ms`), `--duration-very-slow` (`500ms`).
- **Curvas (*Easings*)**: `--ease-smooth-out` (`cubic-bezier(0.22, 1, 0.36, 1)` padrão de superfícies), `--ease-out` (`ease-out` para tooltips), `--ease-in-out` (`ease-in-out` para trocas de ícone/texto), `--ease-linear` (`linear`), `--ease-bounce` (`cubic-bezier(0.34, 1.36, 0.64, 1)` para *overshoot* de entrada em badges e *thumb* do `Switch`) e `--ease-bounce-strong` (`cubic-bezier(0.34, 3.85, 0.64, 1)`).
- **Distâncias, escalas e desfoque**: `--distance-micro` (`4px`), `--distance-small` (`6px`), `--distance-base` (`8px`), `--distance-medium` (`12px`), `--distance-large` (`30px`); `--scale-large` (`0.96`), `--scale-medium` (`0.97`), `--scale-small` (`0.98`), `--scale-tiny` (`0.99`); `--blur-small` (`2px`), `--blur-medium` (`3px`), `--blur-large` (`8px`).
- **Assimetria abrir vs. fechar** (*abrir convida; fechar sai do caminho*):
  - **Modais e diálogos** (`Dialog`, `AlertDialog`): abrem em `--duration-fast` (`250ms`, escala `0.96 → 1`) e fecham em `--duration-quick` (`150ms`, `1 → 0.96`) com `--ease-smooth-out`.
  - **Menus e popovers** (`Select`, `DropdownMenu`, `Popover`, `HoverCard`): abrem em `--duration-fast` (`250ms`, escala `0.97 → 1`) e fecham em `--duration-quick` (`150ms`, `1 → 0.99`).
  - **Gavetas e painéis** (`Sheet`): conteúdo abre em `--duration-slow` (`400ms`) e fecha em `--duration-medium` (`350ms`); *overlay* entra em `--duration-fast` (`250ms`) e sai em `--duration-quick` (`150ms`).
  - **Notificações** (`Sonner`): entram em `--duration-medium` (`350ms`) e saem em `--duration-fast` (`250ms`) com `--ease-smooth-out`.
  - **Tooltips** (`Tooltip`): atraso de intenção (`delayDuration={180}`) na entrada em `--duration-quick` (`150ms`, `--ease-out`, escala `0.98 → 1`) e saída imediata sem atraso em `--duration-micro` (`80ms`).
  - **Controles reversíveis simétricos**: `Tabs` (indicador deslizante), `Accordion` e `Collapsible` (expansão e giro `-scale-y-100` da seta) usam `--duration-fast` (`250ms`) nos dois sentidos; `Checkbox`, `Button`, `Input` e linhas interativas usam `--duration-quick` (`150ms`); `Switch` usa `--duration-medium` (`350ms`) com `--ease-bounce` no *thumb*.
- **Entrada escalonada (*stagger*) e sem FOIC**: `.t-page-enter`, `.t-panel-enter`, `.t-stagger`, `.t-interactive-row`, `.t-badge-pop` e `.t-icon-swap` utilizam `animation-fill-mode: backwards` para nunca ocultar conteúdo no SSR nem prender `transform`/`filter` após concluir. Listas com `.t-stagger` aplicam `--duration-stagger` (`40ms`) por item com teto no índice 6 (`<= 240ms` no total, sempre abaixo de `300ms`).
- **Movimento reduzido obrigatório**: toda transição/animação declara `motion-reduce:transition-none` / `motion-reduce:animate-none` no JSX e é zerada no bloco `@media (prefers-reduced-motion: reduce)` em `src/app/globals.css`.

### 2.6 Feedback Imediato e Optimistic UI (`useOptimistic` + `useTransition`)

Para que a interface responda ao toque e ao clique com **latência percebida de `0ms`** antes mesmo de o servidor concluir a navegação ou persistência, utilize `useOptimistic` combinado com `useTransition`:

- **Filtros e paginação por URL** (`BillingFilters`, `EnrollmentFilters`, `AttendanceHistory`): derive o estado otimista a partir de `searchParams` ou da prop `month` e dispare `setOptimistic(...)` junto com `router.replace(...)` dentro de `startTransition(...)`. `<Select>`, chips de remoção e mês visível atualizam na hora enquanto o contêiner expõe `aria-busy={pending}` com transição sutil (`transition-opacity duration-(--duration-quick) motion-reduce:transition-none aria-busy:opacity-80`).
- **Seletor de contexto/navegação** (`DependentSwitcher`): aplique `useOptimistic(currentProfileId)` com `startTransition(() => { setOptimisticProfileId(value); router.push(...); })` e `aria-busy={pending}` para que o gatilho reflita o dependente escolhido imediatamente.
- **Alternâncias (`Switch`)**:
  - Controles independentes por linha (`NotificationPreferences`): atualizam em `0ms` via `useOptimistic` sem travar o controle (`disabled`), permitindo alternar várias categorias seguidas sem sensação de atraso.
  - Controle único com risco de condição de corrida (`ClassStatusToggle`): mantém `disabled={pending}` para impedir duplo clique concorrente, preservando a legibilidade visual (`disabled:opacity-95 data-disabled:opacity-95`) enquanto `useOptimistic` muda o estado em `0ms`.
- **Confirmações de consequência e desativação de push** (`ConsequenceDialog`, `PushPermissionCard`): forneça feedback imediato (`<Spinner aria-hidden="true" />` no botão em envio ou atualização otimista do estado ativo) e exponha ganchos (`onOptimisticStart` / `onOptimisticReset`) quando uma lista ou item pai precisar refletir a mudança otimista durante a confirmação.
- **Reversão automática e notificação de erro**: toda atualização otimista mantém o estado confirmado separado e reverte automaticamente no `catch` ou ao término da transição sem sucesso, acompanhada de `toast.error(...)` ou mensagem inline `role="alert"`.

---

## 3. Antes vs. Depois (Fazer vs. Evitar)

| Aspecto | Evitar (Quebra HIG / Contrato) | Fazer (Padrão Ebener TKD) |
| :--- | :--- | :--- |
| **Listas de itens** | N `<Card>` empilhados com `gap-4`, borda e sombra repetidos, ou card dentro de card | Um container `rounded-xl border border-border bg-card divide-y divide-border` |
| **Células de tabela (`1280px`)** | Nome e turma sem quebra (`whitespace-nowrap`), empurrando a coluna de ação para fora da viewport | `min-w-0 max-w-44 whitespace-normal line-clamp-2` no nome, `max-w-36 whitespace-normal` na turma e `whitespace-nowrap text-right` na ação |
| **Inputs lado a lado** | `<div className="grid gap-3 sm:grid-cols-2">` padrão (`stretch`), desalinhando inputs quando um `<FieldLabel>` quebra em 2 linhas | `<div className="grid gap-3 sm:grid-cols-2 items-end">` mantendo as bases dos inputs alinhadas |
| **Pesos e tipografia** | `font-bold`, `font-black`, `text-[11px]`, `text-[0.8rem]`, textos sem `tabular-nums` | `font-normal` (400), `font-medium` (500), `font-semibold` (600), escala `text-xs`..`text-3xl` e `tabular-nums` em números/datas |
| **Cores e bordas** | `emerald-600`, `amber-500`, `red-600`, `border-border/50`, `bg-muted/20` | Tokens semânticos (`StatusBadge`, `text-primary-text`, `border-border`, `bg-card`, `bg-muted`) |
| **Sombras e movimento** | `shadow-lg`, `shadow-2xl`, `depth-*`, `transition-all`, durações soltas sem `motion-reduce` | `shadow-xs` / `shadow-md`, tokens `--duration-*` + `--ease-*` com propriedades explícitas e `motion-reduce:transition-none` |
| **Alvos de toque** | Botões compactos de `32px` em fluxos mobile ou listas operacionais | `min-h-11` (`44px`) em ações móveis e operacionais com espaçamento mínimo `gap-2` |
