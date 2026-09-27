# Plano de Refinamento de UI: Profundidade, Iluminação e Hierarquia Visual

> **Objetivo:** Transformar a interface do Ebener TKD de um layout plano e genérico ("boring") em um produto refinado, moderno e com sensação tátil física. O sistema é baseado em **estratificação de luminosidade (Layering via HSL/OKLCH)**, **sombras composicionais com luz direcional**, **profundidade negativa (inset shadows)** e **deênfase estratégica**, eliminando o excesso de bordas duras e organizando a hierarquia visual.

---

## 1. Diagnóstico do Estado Atual vs. Visão Alvo

| Aspecto | Estado Atual ("Boring / Flat") | Visão Alvo (Profundidade & Hierarquia) |
| :--- | :--- | :--- |
| **Camadas de Fundo** | Background e Cards possuem a mesma luminosidade pura (ex.: ambos branco 100% no light), forçando separação por bordas cinzas. | Escala com 3 a 4 níveis de luminosidade (+8% a +10% de Lightness a cada camada). O contraste tonal separa os planos sem esforço. |
| **Sombras** | Sombras únicas padrão (`shadow-xs`, `shadow-sm`) difusas e cinzas, sem direção de luz identificável. | **Sombras combinadas**: Luz vindo de cima (*top glow / rim light* de 1px) + sombra difusa de oclusão inferior (*bottom shadow*). |
| **Bordas** | Bordas duras e repetitivas em praticamente todos os containers (`border border-border/80`), poluindo a tela. | **Bordas orgânicas/mínimas**: Bordas eliminadas onde o contraste de camadas atua; bordas translúcidas de 1px apenas para destacar relevo. |
| **Campos & Barras** | Inputs e barras de progresso no mesmo plano superficial dos cartões. | **Profundidade Invertida**: Uso de sombras *inset* (sombra escura no topo interno e luz na base interna) para criar efeito escavado/embutido. |
| **Hierarquia de Cards** | Todos os cartões parecem ter o mesmo peso e importância, competindo pela atenção. | **Elevação Escalonada**: Cards de tarefas urgentes e heróis com elevação pronunciada; dados secundários deênfatizados e rebaixados. |
| **Espaçamento e Tipografia** | Paddings por vezes comprimidos; contrastes tipográficos uniformes. | Respiro generoso (paddings confortáveis), micro-tipografia expressiva (pesos semânticos e contrastes calibrados). |

---

## 2. Pilares Técnicos de Design System

### Pilar 1: Sistema de Camadas (Layering) via Luminosidade (Lightness)
A luminosidade é manipulada progressivamente do fundo até o elemento mais elevado.

```
[ Camada 3: Modais, Popovers, Dropdowns, Tooltips ]  -> Luminosidade Máxima (Mais próximo da luz)
[ Camada 2: Cards de Ação Primária & Heróis ]         -> Luminosidade Alta (+10% sobre L1)
[ Camada 1: Surface Cards & Containers Estruturais ]  -> Luminosidade Base (+8% a +10% sobre L0)
[ Camada 0: Canvas Background da Página ]             -> Luminosidade Mínima (Fundo mais profundo)
```

#### Valores de Cores (OKLCH / HSL):
- **Modo Claro (Light Mode):**
  - **L0 (Canvas Base):** `oklch(0.965 0.005 240)` ou `hsl(220 14% 96%)` — Um tom suavemente acinzentado/azulado neutro.
  - **L1 (Surface Cards):** `oklch(1.0 0 0)` ou `hsl(0 0% 100%)` — Branco puro. O contraste de 96.5% para 100% cria o recorte imediato sem borda.
  - **L2 (Elevated / Modais):** `oklch(1.0 0 0)` com sombra composicional ampla (elevação física).
  - **L3 (Sub-containers / Seções Internas de Cards):** `oklch(0.975 0.003 240)` ou `hsl(220 12% 97.5%)`.
- **Modo Escuro (Dark Mode):**
  - **L0 (Canvas Base):** `oklch(0.125 0.012 260)` ou `hsl(222 18% 9%)` — Preto profundo com matiz refinado.
  - **L1 (Surface Cards):** `oklch(0.185 0.012 260)` ou `hsl(222 15% 15%)` — (+8% de lightness).
  - **L2 (Elevated / Modais):** `oklch(0.245 0.015 260)` ou `hsl(222 14% 21%)` — (+8% de lightness sobre L1).
  - **L3 (Floating / Destaques):** `oklch(0.300 0.018 260)` ou `hsl(222 13% 27%)`.

---

### Pilar 2: Sombras Composicionais (Depth & Directional Light System)
Simulação física de uma fonte de luz zenital (vindo de cima e levemente inclinada para a frente).

```
   ☀️ [ Luz Física Superior ]
         │
         ▼
 ┌──────────────────────┐  ─── Linha / Glow de Luz Superior (Top Highlight)
 │                      │
 │     Elemento UI      │
 │                      │
 └──────────────────────┘  ─── Sombra Difusa Projetada (Bottom Ambient Shadow)
   ░░░░░░░░░░░░░░░░░░░░
```

#### Tokens de Sombra Composicional:
1. **`shadow-raised` (Cards de conteúdo padrão):**
   - **Top Glow:** `inset 0 1px 0 0 rgba(255, 255, 255, 0.08)` (dark) / `inset 0 1px 0 0 rgba(255, 255, 255, 0.8)` (light).
   - **Bottom Shadow:** `0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.04)`.
2. **`shadow-floating` (Cards Hero, Avisos importantes, Seleções ativas):**
   - **Top Glow:** `inset 0 1px 0 0 rgba(255, 255, 255, 0.15)` (dark) / `inset 0 1px 0 0 rgba(255, 255, 255, 1)`.
   - **Bottom Shadow:** `0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.06)`.
3. **`shadow-overlay` (Modais, Sheets, Dialogs e Popovers):**
   - **Bottom Shadow:** `0 20px 35px -10px rgba(0, 0, 0, 0.25), 0 10px 15px -5px rgba(0, 0, 0, 0.1)`.

---

### Pilar 3: Profundidade Invertida (Inset Shadows)
Para áreas onde o usuário interage ou insere dados (campos, controles deslizantes, trilhas de progresso e badges recuadas), inverte-se o relevo para dar a sensação de que o elemento está "esculpido" na superfície.

```
 ┌──────────────────────┐  ─── Sombra Interna Escura no Topo (Oclusão da reentrância)
 │ ▼ Sombra Inset       │
 │   Área de Entrada    │
 │ ▲ Reflexo Claro      │  ─── Reflexo Claro na Base Interna
 └──────────────────────┘
```

#### Especificação Técnica:
- **`shadow-recessed` (Inputs, Textareas, Search, Select):**
  - **Topo interno:** `inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)`.
  - **Base interna:** `inset 0 -1px 0 0 rgba(255, 255, 255, 0.08)` (dark) / `inset 0 -1px 0 0 rgba(255, 255, 255, 0.6)` (light).
- **`shadow-track` (Trilhas de Barras de Progresso e Sliders):**
  - `inset 0 2px 5px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(0, 0, 0, 0.1)`.

---

### Pilar 4: Hierarquia Visual & Deênfase Estratégica
- **Eliminação de Bordas Pesadas:**
  - Em cards com contraste tonal L0/L1 definido, a borda cinza opaca `border border-border` é substituída por borda translúcida sutil (`border border-white/5` no dark ou `border-black/5` no light) ou dispensada inteiramente.
- **Hierarquia de Elevação:**
  - **Alta prioridade (Heróis & Ações Urgentes):** Ganham `shadow-floating` e luminosidade L2, destacando-se imediatamente na visão periférica.
  - **Média prioridade (Métricas informativas e turmas):** Ganham `shadow-raised` e luminosidade L1.
  - **Baixa prioridade (Tabelas de histórico, rodapés, metadados):** Fundo ligeiramente rebaixado, sombra nula e tipografia atenuada.

---

### Pilar 5: Refinamento de Tipografia e Espaçamento
- **Paddings Internos:** Cartões principais ganham padding generoso (`p-5` a `p-6` no desktop, `p-4` no mobile) para permitir que os blocos de dados respirem.
- **Relação de Contraste Tipográfico:**
  - Títulos com `tracking-tight` e peso marcante (`font-bold` / `font-semibold`).
  - Textos de suporte e metadados com cor `text-muted-foreground` calibrada para legibilidade sem competir com os dados numéricos.
  - Valores e datas com `tabular-nums font-mono` onde aplicável.

---

## 3. Fases de Execução

### Fase A: Fundação de Tokens e Classes Utilitárias (`globals.css`)
- [x] **A.1** Atualizar variáveis de luminosidade em `:root` e `.dark` no `src/app/globals.css`:
  - Calibrar `--background` (L0) e `--card` (L1) para haver um delta de luminosidade constante de 8% a 10%.
  - Definir `--card-elevated` (L2) e `--surface-recessed` (para campos escavados).
- [x] **A.2** Criar utilitários de sombras combinadas no Tailwind `@theme`:
  - `shadow-raised`: top glow sutil + bottom shadow de elevação.
  - `shadow-floating`: top glow mais pronunciado + bottom shadow ampla.
  - `shadow-recessed`: inset superior escuro + inset inferior claro.
  - `shadow-track`: profundidade negativa para progress bars e switchs.
- [x] **A.3** Criar tokens de bordas chanfradas translúcidas para dar acabamento suave aos componentes.

---

### Fase B: Atualização dos Componentes Primitivos (`src/components/ui/`)
- [x] **B.1 `Card` (`src/components/ui/card.tsx`):**
  - Aplicar `shadow-raised` como padrão; substituir bordas pesadas por bordas orgânicas/luminosas.
  - Adicionar suporte a variante `variant="floating"` e `variant="flat"`.
- [x] **B.2 `Input`, `Textarea` e `Select` (`src/components/ui/input.tsx`, `textarea.tsx`):**
  - Aplicar profundidade negativa `shadow-recessed`.
  - Melhorar estados de foco com anel suave que simula iluminação direta no contorno.
- [x] **B.3 `Progress` (`src/components/ui/progress.tsx`):**
  - Trilha com `shadow-track` (escavada); barra preenchida com gradiente sutil e highlight superior.
- [x] **B.4 `Badge` e `StatusBadge` (`src/components/ui/badge.tsx`, `src/components/shared/status-badge.tsx`):**
  - Badges secundárias com estilo *recessed*; badges de destaque com sutil elevação e luz.
- [x] **B.5 `Dialog` e `Sheet` (`src/components/ui/dialog.tsx`, `sheet.tsx`):**
  - Aplicar `shadow-overlay` e fundo L2 para garantir destaque total sobre o backdrop.

---

### Fase C: Painéis Administrativos (`/admin`)
- [x] **C.1 Dashboard do Professor (`src/app/admin/page.tsx`):**
  - Card de **Tarefas Urgentes**: destaque como elemento mais elevado da página (`shadow-floating`), atraindo a atenção instantânea.
  - Grade de **Métricas**: elevação equilibrada (`shadow-raised`), com números nítidos e ícones sobre fundos com profundidade.
  - **Turmas de Hoje**: cards organizados em camadas sem excesso de linhas divisórias.
- [x] **C.2 Gestão de Turmas (`src/app/admin/turmas/page.tsx`):**
  - Cards de turmas com profundidade tátil; badges de dias da semana embutidas suavemente.
- [x] **C.3 Fila de Matrículas e Financeiro (`src/app/admin/matriculas/`, `src/app/admin/financeiro/`):**
  - Filtros e barras de pesquisa com profundidade negativa (`shadow-recessed`).
  - Cards de faturamento e comprovantes com hierarquia visual clara entre pendências e quitados.
- [x] **C.4 Exames de Faixa e Contratos:**
  - Banners de exames com destaque de luz superior; lista de participantes com deênfase em itens já avaliados.

---

### Fase D: Portal do Aluno (`/aluno`)
- [x] **D.1 Card Hero do Próximo Treino (`src/app/aluno/page.tsx`):**
  - Elevação máxima (`shadow-floating`) com gradiente sutil direcional; quando "Hoje tem treino!", adicionar glow de acento temático.
- [x] **D.2 Situação Financeira do Aluno:**
  - Se houver mensalidade em atraso ou aberta, card flutuante destacado; se estiver em dia, card discreto sem alarmismo.
- [x] **D.3 Card de Jornada de Graduação (`GraduationCard`):**
  - Barra de progresso com profundidade negativa (`shadow-track`); faixas com efeito chanfrado de acabamento.
- [x] **D.4 Frequência e Histórico (`src/app/aluno/frequencia/page.tsx`):**
  - Dias com presença em relevo sutil; dias sem aula integrados ao fundo do calendário.

---

### Fase E: Portal do Responsável (`/responsavel`) e Central de Avisos (`/avisos`)
- [x] **E.1 Cards de Dependentes (`src/app/responsavel/dependentes/page.tsx`):**
  - Cartões de cada filho com elevação tátil e separação suave de seções de frequência, financeiro e matrícula.
  - Ações rápidas de credenciais organizadas com deênfase visual.
- [x] **E.2 Central de Avisos (`src/app/avisos/page.tsx`):**
  - Cards de comunicados não lidos com elevação e destaque; comunicados lidos deênfatizados e integrados à lista.

---

### Fase F: Homologação e Qualidade
- [x] **F.1 Validação de Contraste WCAG AA:**
  - Garantir que todas as camadas de texto mantêm contraste mínimo de 4.5:1 (texto normal) e 3:1 (texto grande e ícones).
- [x] **F.2 Validação em Telas OLED/Dark Mode e Telas Claras:**
  - Verificar que o contraste não causa ofuscamento no tema claro nem perda de detalhe no tema escuro.
- [x] **F.3 Integridade Funcional:**
  - Executar `npm run typecheck`, `npm run lint`, `npm test` (240 testes verdes) e `npm run build`.

---

## 4. Ordem Recomendada de Implementação
1. **Fase A (Fundação no globals.css):** Estabelecer a paleta de luminosidade (L0 a L3) e as classes de sombras combinadas/inset.
2. **Fase B (Componentes Primitivos):** Atualizar `Card`, `Input`, `Progress` e `Dialog`.
3. **Fase C & D (Dashboards Admin e Aluno):** Aplicar nos painéis principais onde o impacto visual é máximo.
4. **Fase E (Responsável e Avisos):** Estender aos fluxos secundários.
5. **Fase F (Auditoria de Contraste e Testes):** Validação técnica completa.
