# Especificação Técnica: Ordenação Interativa de Tabelas (Client-Side)

**Data:** 2026-09-26  
**Status:** Aprovado  
**Escopo:** Painel Administrativo (`/admin/matriculas`, `/admin/financeiro`, `/admin/alunos/acessos`)

---

## 1. Visão Geral

Permitir que usuários administradores ordenem dados exibidos nas tabelas principais do sistema diretamente nos cabeçalhos das colunas com um único clique (toggle cíclico: `Neutro` → `Crescente (↑)` → `Decrescente (↓)` → `Neutro`).

A ordenação é executada **no cliente** (0ms de latência), proporcionando agilidade instantânea na navegação, sem exigir recarregamento de página nem tráfego de rede.

---

## 2. Arquitetura da Solução

### 2.1 Hook Reutilizável: `useTableSort<T, K extends string>`
Local: `src/hooks/use-table-sort.ts`

- **Estado:**
  - `sortKey`: Chave da coluna atualmente ordenada (`K | null`).
  - `sortDirection`: Direção da ordenação (`"asc" | "desc" | null`).
- **Configuração:**
  - `items: T[]`: Dados recebidos como entrada.
  - `comparators: Record<K, (a: T, b: T) => number>`: Funções puras de comparação para cada coluna suportada.
  - `defaultDirection?: Partial<Record<K, "asc" | "desc">>`: Direção inicial por coluna (ex: datas podem preferir decrescente `"desc"` no 1º clique).
- **Retorno:**
  - `sortedItems: T[]`: Array ordenado com `useMemo`. Retorna a ordem original quando inativo.
  - `sortKey: K | null`
  - `sortDirection: "asc" | "desc" | null`
  - `toggleSort(key: K)`: Alterna o ciclo `Neutro` → `asc` (ou `defaultDirection`) → `desc` → `null`.
  - `resetSort()`: Restaura a ordem padrão.

### 2.2 Componente UI: `<SortableTableHead>`
Local: `src/components/shared/sortable-table-head.tsx`

- Substitui `<TableHead>` para colunas ordenáveis.
- Renderiza botão acessível integrado ao cabeçalho.
- **Atributos de Acessibilidade:**
  - `aria-sort`: `"ascending" | "descending" | "none"`.
  - `role="button"` / `<button type="button">`.
  - Label acessível para leitores de tela indicando a ação de alternância.
- **Ícones Indicadores:**
  - Inativo: `ChevronsUpDown` (estilo discreto com opacidade suave `text-muted-foreground/50`).
  - Ascendente (`asc`): `ArrowUp` (destaque com cor `text-primary font-bold`).
  - Descendente (`desc`): `ArrowDown` (destaque com cor `text-primary font-bold`).

---

## 3. Implementação por Tabela

### 3.1 Tabela de Matrículas (`EnrollmentTable`)
Arquivo: `src/features/students/components/enrollment-table.tsx`

- **Colunas Ordenáveis:**
  1. `student`: Nome completo em ordem alfabética (`localeCompare("pt-BR")`).
  2. `belt`: Hierarquia de graduação do Taekwondo (GUB 10 = Branca até 0 = Preta/Dan).
  3. `class`: Nome da turma (alfabético).
  4. `due_day`: Dia de vencimento (numérico 1..31).
  5. `status`: Estado da matrícula (`under_review`, `submitted`, `active`, etc.).
- **Visualização Mobile:**
  - As linhas ordenadas alimentam tanto a tabela desktop quanto os cards mobile, garantindo coerência visual e de busca entre dispositivos.

### 3.2 Tabela Financeira de Cobranças (`BillingTable`)
Arquivo: `src/features/billing/components/billing-table.tsx`

- **Colunas Ordenáveis:**
  1. `student`: Nome do aluno associado à cobrança (alfabético).
  2. `competence`: Mês/ano da competência (`YYYY-MM`).
  3. `due_date`: Data de vencimento (ordem cronológica de timestamp).
  4. `amount`: Valor da cobrança em centavos (numérico).
  5. `status`: Situação do pagamento (`pending`, `paid`, `overdue`, etc.).

### 3.3 Tabela de Acessos dos Alunos (`StudentAccessTable`)
Arquivo: `src/features/students/components/student-access-table.tsx`  
Página: `src/app/admin/alunos/acessos/page.tsx`

- Extração da tabela da página para um componente cliente dedicado `StudentAccessTable`.
- **Colunas Ordenáveis:**
  1. `student`: Nome do aluno (alfabético).
  2. `role`: Tipo de acesso (`minor_student` vs `adult_student`).
  3. `login`: E-mail ou username de login.
  4. `status`: Situação da conta (ativo, pendente, etc.).

---

## 4. Testes e Validação

1. **Testes Unitários do Hook (`use-table-sort.test.ts`):**
   - Testa alternância cíclica (`null` → `asc` → `desc` → `null`).
   - Testa ordenação numérica, textual com acentuação e personalizada.
   - Testa preservação de array quando nenhum critério está ativo.
2. **Testes de Componente:**
   - `<SortableTableHead />`: Renderização, disparo de clique e acessibilidade (`aria-sort`).
   - `EnrollmentTable.test.tsx`: Verifica que o clique na coluna Aluno reordena a lista.
   - `BillingTable.test.tsx`: Verifica que o clique na coluna Valor reordena os valores.
3. **Validação Geral:**
   - `npm run test` (todos os testes passando).
   - `npm run typecheck` (zero erros).
   - `npm run lint` (zero warnings/erros).
   - `npm run build` (build Next.js bem sucedido).
