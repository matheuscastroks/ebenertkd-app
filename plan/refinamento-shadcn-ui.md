# Refinamento shadcn/ui Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `frontend-design` and execute each subphase with tests before implementation. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** tornar obrigatório e verificável o uso correto, acessível e racional dos componentes shadcn/ui nas telas administrativas, de aluno e de responsável.

**Architecture:** `src/components/ui/` permanece como camada de primitives sem regra de negócio. Padrões reutilizáveis ficam em `src/components/shared/`, enquanto composição e autorização permanecem nas features e Server Components. A escolha de um componente deve reduzir ambiguidade, passos ou layout shift; não basta substituir HTML por uma primitive visualmente equivalente.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, shadcn/ui Base UI, Appwrite, Vitest e Testing Library.

**Referência oficial:** [Sidebar — shadcn/ui Base UI](https://ui.shadcn.com/docs/components/base/sidebar).

---

## Diagnóstico em 24/09/2026

- Já utilizados adequadamente: `Field`, `Select`, `Progress`, `Badge` via `StatusBadge`, `Dialog`, `Drawer`, `AlertDialog`, `Table`, `Tabs`, `Skeleton`, `TooltipProvider` e a estrutura principal da `Sidebar`.
- Uso parcial: `Avatar` mostra iniciais, mas ainda não renderiza a foto privada do aluno; `Pagination` está instalada, porém não governa todas as filas; `Separator` e `Tooltip` aparecem mais como dependências do que como decisões de tela.
- Ainda não adotados nas telas: `Calendar + Popover`, `InputGroup`, `Accordion`, `Collapsible` e `Switch`.
- Problema de produto: a foto já é enviada como documento `profile_photo`, mas não possui um componente compartilhado que a transforme em identidade visual consistente.

## Contrato obrigatório para toda tela

Antes de criar HTML ou um componente próprio, conferir esta matriz. Exceções devem ser justificadas no PR.

| Necessidade | Componente obrigatório | Regra de uso |
| --- | --- | --- |
| Foto ou identidade do aluno | `Avatar`, `AvatarImage`, `AvatarFallback` | Foto privada quando autorizada; iniciais como fallback; nunca expor URL pública do Storage. |
| Status ou metadado curto | `Badge`/`StatusBadge` | Uma linha e sem interação; texto longo pertence a `Alert` ou ao conteúdo. |
| Blocos secundários expansíveis | `Accordion` | Histórico, revisão e grupos independentes; não esconder campo obrigatório ou erro. |
| Grupo único expansível | `Collapsible` | Filtros avançados e submenus; não usar como substituto de `Select`. |
| Data de negócio | `Popover + Calendar` dentro de `Field` | Exibir pt-BR e enviar `YYYY-MM-DD` em campo oculto; mês/competência pode manter controle nativo quando for mais eficiente. |
| Lista longa | `Pagination` com links | Estado na URL, consulta no servidor e preservação dos filtros; sem paginação apenas para listas comprovadamente pequenas. |
| Cadastro extenso | `Progress` | Percentual derivado de campos obrigatórios, com texto “N de total”; não representar aprovação administrativa. |
| Divisão sem novo container | `Separator` | Separar grupos relacionados; evitar empilhar `Card` apenas para criar bordas. |
| Estado booleano imediato | `Switch` | Ativo/inativo ou preferência que muda ao alternar; confirmação obrigatória se houver efeito operacional relevante. |
| Ajuda contextual curta | `Tooltip` | Complementar ícone, abreviação ou alerta não bloqueante. Informação crítica continua visível em `Alert`/`FieldError`. |
| Edição contextual | `Dialog`/`ResponsiveDialog` | Edição curta sem perder a lista; fluxo longo ou URL compartilhável recebe página própria. |
| Formulário | `Field`, `FieldLabel`, `FieldDescription`, `FieldError` | Todo controle possui `id`, `name`, rótulo e erro próximo. |
| Busca | `InputGroup` + ícone `Search` | Ícone decorativo com `aria-hidden`; botão de limpar nomeado; valor persistido na URL. |
| Navegação do portal | família `Sidebar` | Um único `SidebarProvider` no layout persistente e conteúdo em `SidebarInset`. |

`Tooltip` não pode ser o único lugar de uma advertência de segurança, erro, requisito ou informação necessária em touch/teclado. `Switch` não substitui botão “Salvar” em formulários com várias alterações. `Accordion` e `Collapsible` não são menus de opções.

## Contratos compartilhados

As subfases devem preservar estas APIs para evitar variantes incompatíveis entre telas:

```ts
type StudentAvatarProps = {
  name: string;
  photoDocumentId?: string | null;
  size?: "sm" | "md" | "lg";
};

type DateFieldProps = {
  id: string;
  name: string;
  label: string;
  defaultValue?: string; // YYYY-MM-DD
  min?: string;
  max?: string;
  required?: boolean;
  description?: string;
};

type SearchFieldProps = {
  id: string;
  name?: string;
  defaultValue?: string;
  placeholder: string;
  label: string;
};
```

`StudentAvatar` recebe somente o identificador autorizado, nunca URL do Appwrite. `DateField` envia um único valor ISO por input oculto. `SearchField` continua compatível com `<form method="get">` e não mantém uma segunda fonte de estado no cliente.

### Subfase 1: Foto e identidade do aluno

**Files:**
- Create: `src/features/students/components/student-avatar.tsx`
- Modify: `src/features/students/components/enrollment-form.tsx`
- Modify: `src/features/students/components/enrollment-table.tsx`
- Modify: `src/features/students/components/review-panel.tsx`
- Modify: `src/app/responsavel/dependentes/page.tsx`
- Test: `src/features/students/components/student-avatar.test.tsx`

- [x] Tornar `profile_photo` obrigatória para submissão, mantendo rascunho sem foto.
- [x] Criar `StudentAvatar` com `AvatarImage`, iniciais em `AvatarFallback`, tamanhos padronizados e endpoint autenticado já existente.
- [x] Exibir preview no cadastro e avatar nas listas, detalhes e seleção de dependente.
- [x] Testar foto disponível, carregamento quebrado, fallback e ausência de autorização.
- [x] Executar `npm test -- src/features/students/components/student-avatar.test.tsx && npm run typecheck`; teste e tipagem aprovados.
- [x] Commit: `feat: use student photos as profile identity`.

### Subfase 2: Formulários, datas e progresso

**Files:**
- Create: `src/components/shared/date-field.tsx`
- Modify: `src/features/students/components/enrollment-form.tsx`
- Modify: `src/features/students/components/review-panel.tsx`
- Modify: `src/features/contracts/components/contract-workspace.tsx`
- Modify: `src/app/admin/contratos/cancelamentos/page.tsx`
- Test: `src/components/shared/date-field.test.tsx`

- [ ] Compor `DateField` com `Field`, `Popover`, `Calendar`, botão com ícone e input oculto `YYYY-MM-DD`.
- [ ] Migrar nascimento, início no taekwondo, primeiro vencimento e vigência; preservar `type="month"` para competência e mês de saída.
- [ ] Manter `Progress` visível no cadastro e incluir foto/documentos no cálculo dos requisitos.
- [ ] Usar `Separator` entre ações, resumo e campos relacionados quando um novo `Card` não acrescentar hierarquia.
- [ ] Testar teclado, locale pt-BR, limites de data, valor enviado e retomada de rascunho.
- [ ] Executar `npm test -- src/components/shared/date-field.test.tsx src/features/students/components/enrollment-form.test.tsx && npm run lint`; esperar testes e lint aprovados.
- [ ] Commit: `refactor: standardize dates and enrollment progress`.

### Subfase 3: Busca, paginação e densidade administrativa

**Files:**
- Create: `src/components/shared/search-field.tsx`
- Modify: `src/app/admin/matriculas/page.tsx`
- Modify: `src/app/admin/financeiro/page.tsx`
- Modify: `src/features/students/service.ts`
- Modify: `src/features/billing/report-service.ts`
- Test: `src/components/shared/search-field.test.tsx`

- [ ] Substituir buscas soltas por `InputGroup` com `Search` e ação acessível de limpar.
- [ ] Implementar `Pagination` por URL nas filas de matrícula e financeiro, preservando busca, status, turma, competência e tipo.
- [ ] Exibir total, intervalo atual e estados vazio/última página; buscar somente a página necessária no Appwrite.
- [ ] Usar `Badge` para status e metadados curtos; não criar chips clicáveis sem semântica de botão/link.
- [ ] Testar serialização da URL, anterior/próxima, filtros combinados e viewport de 360 px.
- [ ] Executar `npm test -- src/components/shared/search-field.test.tsx src/features/students/components/enrollment-table.test.tsx src/features/billing/components/billing-table.test.tsx`; esperar paginação e filtros aprovados.
- [ ] Commit: `feat: add searchable paginated admin queues`.

### Subfase 4: Revelação progressiva e edição contextual

**Files:**
- Modify: `src/features/students/components/review-panel.tsx`
- Modify: `src/features/classes/components/class-manager.tsx`
- Modify: `src/features/contracts/components/contract-workspace.tsx`
- Modify: `src/features/billing/components/charge-actions.tsx`

- [ ] Usar `Accordion` para históricos, revisão por seção e conteúdo secundário independente.
- [ ] Usar `Collapsible` para filtros avançados e grupos da sidebar com dois ou mais destinos; manter ação principal visível.
- [ ] Mover edições curtas de turma e dados financeiros para `ResponsiveDialog`; manter criação extensa em página/card próprio.
- [ ] Trocar ativação de turma e preferências equivalentes por `Switch` somente após definir rollback, feedback e confirmação quando necessária.
- [ ] Substituir avisos curtos junto a ícones por `Tooltip`; manter bloqueios e consequências em `Alert` ou `AlertDialog`.
- [ ] Testar foco, Escape, retorno ao gatilho, toque e operação por teclado.
- [ ] Executar `npm test -- src/features/billing/components/charge-actions.test.tsx src/features/students/components && npm run lint`; esperar overlays, formulários e lint aprovados.
- [ ] Commit: `refactor: improve contextual admin interactions`.

### Subfase 5: Sidebar completa por perfil

**Files:**
- Modify: `src/components/dashboard/app-sidebar.tsx`
- Modify: `src/components/dashboard/active-sidebar.tsx`
- Modify: `src/components/dashboard/dashboard-shell.tsx`
- Modify: `src/lib/navigation/routes.ts`
- Test: `src/components/dashboard/app-sidebar.test.tsx`

- [ ] Manter `SidebarProvider` somente nos layouts persistentes e `SidebarInset` como wrapper do painel.
- [ ] Compor `SidebarHeader`, `SidebarContent`, `SidebarGroup`, `SidebarGroupLabel`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `SidebarFooter`, `SidebarRail` e `SidebarTrigger` conforme a documentação oficial.
- [ ] Adotar `SidebarMenuSub` e `Collapsible` apenas para hierarquia real: exemplo “Contratos” com “Modelo” e “Cancelamentos”.
- [ ] Usar `SidebarMenuBadge` para contagens acionáveis, como matrículas pendentes, sem buscar dados no Client Component.
- [ ] Garantir menus diferentes para professor, aluno adulto, menor e responsável; nenhum link apenas oculto pode substituir autorização de servidor.
- [ ] Testar item ativo em rotas filhas, modo ícone, tooltip, atalho, mobile/Sheet e persistência durante loading.
- [ ] Executar `npm test -- src/components/dashboard && npm run build`; esperar testes da navegação e build de produção aprovados.
- [ ] Commit: `refactor: complete role-based sidebar navigation`.

## Gate de aceite

- [ ] Nenhum formulário novo usa `<label>` solto ou erro distante do campo.
- [ ] Nenhuma busca nova usa `Input` sem `InputGroup` e nome acessível.
- [ ] Datas de dia usam `Calendar + Popover`; exceções estão documentadas no PR.
- [ ] Toda fila potencialmente longa possui paginação por URL e alternativa mobile.
- [x] A foto do aluno aparece com `Avatar` em cadastro, listas e detalhes, respeitando autorização.
- [ ] Sidebar permanece montada durante loading e contém apenas destinos permitidos ao perfil.
- [ ] Tooltip contém apenas informação complementar; avisos críticos continuam perceptíveis sem hover.
- [ ] Testes, `npm run lint`, `npm run typecheck` e `npm run build` passam ao final de cada subfase.
