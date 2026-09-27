# Plano de Implementação: Onboarding Multi-Perfil e Refinamento da Hierarquia de Exames

> **Status:** Proposto / Em Planejamento  
> **Área:** Produto, UX/UI, Onboarding, Gestão de Exames de Faixa  
> **Data de Criação:** 26 de Setembro de 2026  
> **Documentos Relacionados:** [Plano de Refinamento de UI](./plano-refinamento-ui-profundidade-e-hierarquia.md), [Fase 9 — Identidade e Experiência de Produto](./fase-9-produto-identidade-experiencia.md), [Fase 10 — Jornada Gamificada](./fase-10-jornada-gamificada.md).

---

## 1. Visão Geral e Objetivos de Negócio

Este planejamento tem dois propósitos complementares que elevam o patamar de acabamento e engajamento do **Ebener TKD**:

1. **Onboarding Guiado e Contextual:** Substituir a entrada fria no sistema por uma jornada acolhedora de 3 etapas que conduz tanto o Administrador (Mestre/Gestor) quanto os Usuários (Aluno Maior, Responsável Familiar e Aluno Menor) diretamente ao seu **Aha! Moment** (Momento de Primeiro Valor), coletando preferências sem atrito e entregando um painel inicial imediatamente personalizado.
2. **Hierarquia Visual no Desktop e Redesign da Área de Exames (`/admin/exames`):** Resolver a atual tela de exames de graduação — diagnosticada como visualmente desorganizada, sem hierarquia espacial e com cores descalibradas — aplicando o sistema de elevação em camadas (L0 Canvas, L1 Surface, L2 Elevated), paleta semântica oficial das faixas de Taekwondo e ergonomia desktop assimétrica (2/3 operacional + 1/3 suporte).

---

## 2. Onboarding Multi-Perfil: Arquitetura da Jornada

### 2.1 Mapeamento do "Aha! Moment" por Persona

Todo o fluxo de onboarding deve convergir para uma ação concreta que prove que a plataforma resolve a dor primordial do usuário:

```
                    ┌────────────────────────────┐
                    │     PRIMEIRO ACESSO        │
                    └─────────────┬──────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          ▼                       ▼                       ▼
    [ ADMIN ]             [ ALUNO ADULTO ]          [ RESPONSÁVEL ]
   "Fazer chamada em      "Ver meta de presenças    "Ver se o filho
    10s e ver alunos       para a próxima faixa      treinou hoje e PIX
    elegíveis a exame"     e chave PIX em 1 toque"   unificado da família"
```

| Perfil | Dor Primordial | O "Aha! Moment" (Primeira Ação de Valor) | Destino de Conclusão do Onboarding |
| :--- | :--- | :--- | :--- |
| **Administrador** *(Mestre/Gestor)* | Perda de tempo em chamada de papel, planilhas paralelas e descontrole de quem pode graduar de faixa. | **Fazer a 1ª chamada da turma em 10 segundos** OU visualizar a lista de alunos elegíveis para exame calculada pelo sistema. | `/admin` com checklist de ativação da academia e atalho para a turma ativa. |
| **Aluno Adulto** | Desconhecimento de quantas presenças faltam para o exame, medo de perder aula e burocracia para pagar. | **Visualizar a barra de evolução de graduação (Faixa Atual ➔ Próxima Faixa)** e horário da próxima aula. | `/aluno` com widget de faixa em destaque e código PIX rápido. |
| **Responsável** | Insegurança se o dependente chegou à aula, esquecimento de vencimentos e múltiplos acessos confusos. | **Alternar entre os dependentes no topo e ver o carimbo de presença da última aula** com cobranças unificadas. | `/responsavel` com seletor de dependentes e resumo de frequência. |
| **Aluno Menor** | Telas corporativas com excesso de texto e menus complexos. | **Visualizar seu avatar, sua faixa colorida e a contagem de estrelas/aulas concluídas**. | `/aluno` (modo menor) lúdico e simplificado. |

---

### 2.2 Estrutura do Fluxo de Onboarding (4 Etapas)

```
┌────────────────────────────────────────────────────────────────────────┐
│ [Passo 1: Boas-vindas] ──► [Passo 2: Preferências] ──► [Passo 3: Push]  │
│      (10 seg)                    (30 seg)                  (15 seg)    │
│                                                                        │
│                      [Pular Onboarding (Skip)] ────────────────────────┼─► [Dashboard]
└────────────────────────────────────────────────────────────────────────┘
```

#### Etapa 1: Boas-vindas e Propósito (Impacto Rápido)
* **Tempo estimado de tela:** 10 segundos.
* **Componente:** `OnboardingWelcomeStep`.
* **Conteúdo:** Saudação calorosa com a insígnia da academia, nome do usuário em destaque e síntese em 1 frase do que o app entrega:
  * *Admin:* "Toda a gestão do dojang, chamadas, graduações e financeiro na palma da mão."
  * *Aluno:* "Sua jornada no Taekwondo: acompanhe sua evolução de faixa, frequência e treinos."
  * *Responsável:* "Acompanhe de perto o desenvolvimento, presença e segurança dos seus dependentes."
* **Controles:** Botão *"Iniciar experiência"* e link *"Pular apresentação"*.

#### Etapa 2: Coleta de Preferências Relevantes (Efeito Ikea)
* **Tempo estimado de tela:** 25 a 35 segundos.
* **Componente:** `OnboardingPreferencesStep`.
* **Mecânica:** 2 a 3 perguntas de múltipla escolha rápida (sem digitação), gerando apego imediato ao personalizar a tela:
  * **Perguntas para Aluno / Responsável:**
    1. *Qual seu principal foco no Taekwondo?*  
       `[Disciplina e Autocontrole]` • `[Condicionamento Físico]` • `[Defesa Pessoal]` • `[Graduações e Competição]`
    2. *Quando você prefere receber lembretes de aula?*  
       `[1 hora antes]` • `[No início do dia]` • `[Não preciso de lembretes]`
    3. *Qual turno de treino é o seu preferido?*  
       `[Manhã]` • `[Tarde]` • `[Noite]`
  * **Perguntas para Administrador:**
    1. *Qual seu foco prioritário hoje?*  
       `[Organizar chamadas e turmas]` • `[Cadastrar alunos e contratos]` • `[Organizar exame de faixa]`

#### Etapa 3: Permissões Contextualizadas (Push Sem Rejeição)
* **Tempo estimado de tela:** 15 segundos.
* **Componente:** `OnboardingPermissionStep`.
* **Regra de Ouro UX:** **Nunca** acionar o popup nativo de permissão do navegador sem um pré-card explicativo.
* **Copywriting:**
  > *"Quer receber um aviso no celular 1 hora antes do treino do seu filho e confirmação em tempo real de que ele fez o check-in na academia?"*
* **Ações:**
  * `[Ativar notificações no celular]` (dispara `Notification.requestPermission()`).
  * `[Lembrar mais tarde]` (prossegue sem bloquear nem marcar rejeição permanente).

#### Etapa 4: Entrega da Tela Inicial Personalizada (Combate ao Zero-State Vazio)
* As preferências coletadas persistem no perfil (`preferences` no Appwrite).
* A primeira tela renderizada pós-onboarding já reflete essas preferências:
  * Aluno recebe no topo: *"Seu próximo treino recomendado é Terça às 19:30 (Turma Noturna)!"*
  * Admin recebe um **Checklist Interativo de Ativação** colapsável:
    - [x] Conta do administrador criada
    - [ ] Realizar a primeira chamada de treino
    - [ ] Configurar chave PIX da academia
    - [ ] Agendar o primeiro exame de graduação

---

### 2.3 Regras de Design e Ergonomia de UX do Onboarding

1. **Botão "Pular" (Skip) Onipresente:** Presente no canto superior direito de cada etapa. Usuários que reinstalaram ou preferem explorar sozinhos jamais devem ser travados.
2. **Barra de Progresso Linear e Clara:** Exibição de indicador linear fino com micro-cópia: `Passo 1 de 3: Boas-vindas` ➔ `Passo 2 de 3: Personalização` ➔ `Passo 3 de 3: Alertas de Treino`.
3. **Persistência Sem Poluição:** Salvar `onboarding_completed: true` e `onboarding_dismissed_at` no banco de dados e cookie de sessão. Caso o usuário queira refazer, haverá a opção *"Repetir introdução ao aplicativo"* na página de [`Configurações`](file:///home/matheus/ebenertkd-app/src/app/configuracoes/page.tsx).
4. **Copywriting Orientado a Benefícios:**
   * ❌ *"Configure o serviço Web Push de notificações."*
   * ✔️ *"Fique sabendo no mesmo instante quando a chamada do treino for concluída."*
   * ❌ *"Cadastre o módulo financeiro."*
   * ✔️ *"Receba mensalidades via PIX com baixa automática em segundos."*

---

### 2.4 Métricas de Acompanhamento (Analytics de Produto)

Para mensurar a eficácia e os pontos de atrito do onboarding:

```
[Início Onboarding] ──► [Preferências] ──► [Permissão Push] ──► [1º Valor (Aha!)]
      100%                   88%                 76%                 64%
        │                     │                   │                   │
        └─► Drop-off 12%      └─► Drop-off 12%    └─► Drop-off 12%    └─► TTV Médio: 2.8 min
```

| Métrica | Definição | Meta de Sucesso |
| :--- | :--- | :--- |
| **Taxa de Conclusão** | % de novos usuários que atingem o último passo do fluxo. | **≥ 75%** |
| **Taxa de Drop-off por Etapa** | % de cliques em "Pular" ou abandono por tela específica. | **< 15% por etapa** |
| **Time-to-Value (TTV)** | Tempo em minutos do primeiro login até a primeira ação de valor (chamada feita ou graduação visualizada). | **< 3 minutos** |
| **Retenção D1 e D7** | % de usuários que retornam no dia seguinte e na primeira semana após o onboarding. | **D1 ≥ 60%, D7 ≥ 45%** |

---

## 3. Hierarquia Visual no Desktop e Redesign de Exames (`/admin/exames`)

### 3.1 Diagnóstico das Falhas Atuais

1. **Grid Plano e Pouco Inspirador:** A listagem de exames em [`/admin/exames`](file:///home/matheus/ebenertkd-app/src/app/admin/exames/page.tsx) renderiza apenas uma malha repetitiva de cards sem destaque entre o próximo exame imediato e eventos já concluídos ou cancelados.
2. **Cores e Contrastes Genéricos:** Os badges utilizam tons acinzentados ou azuis convencionais, ignorando a rica simbologia cromática do Taekwondo (Branca, Amarela, Verde, Azul, Vermelha, Ponta Preta e Preta).
3. **Subaproveitamento da Largura Desktop:** Na tela do exame ([`/admin/exames/[eventId]`](file:///home/matheus/ebenertkd-app/src/app/admin/exames/%5BeventId%5D/page.tsx)), todas as seções são empilhadas em uma única coluna vertical quilométrica, forçando rolagem excessiva para quem gerencia uma banca examinadora no notebook ou desktop.
4. **Ergonomia de Avaliação Fraca:** Para avaliar um candidato (Aprovar, Reprovar, Ausente), os botões disputam espaço visual de maneira desordenada com o cadastro de elegíveis.

---

### 3.2 Novo Padrão de Hierarquia e Elevação para Exames

#### Camadas de Profundidade no Desktop:
* **L0 — Canvas:** Fundo com profundidade controlada (`bg-background`).
* **L1 — Cards Estruturais:** Superfícies elevadas com `depth-raised` e bordas suaves de 1px.
* **L2 — Mesa de Avaliação e Painéis Flutuantes:** Card da banca examinadora e modais com `depth-floating` e iluminação superior (`--top-glow`).

---

### 3.3 Redesign da Página de Listagem: `/admin/exames`

#### 1. Barra de KPIs Operacionais (Topo da Página)
No topo da página, antes da lista de cards, uma faixa com 3 métricas consolidadas:
* **Próximo Exame de Faixa:** Data em formato de contagem regressiva (ex.: *"Faltam 14 dias — 28 de Outubro"*).
* **Total de Candidatos Inscritos:** Soma de alunos com inscrição confirmada aguardando exame.
* **Previsão de Taxas de Exame:** Total financeiro projetado com tipografia tabular (`font-mono`).

#### 2. Card de Evento com "Calendário Visual" e Hierarquia Rígida
Cada card de exame abandona o formato genérico e adota:
* **Bloco Visual de Calendário (Lado Esquerdo):** Quadrado com o mês abreviado em caixa alta e o dia em número grande (`text-2xl font-bold`).
* **Tag de Status do Exame com Cor Semântica:**
  * *Confirmado / Inscrições Abertas:* Badge verde/azul vibrante com pulso sutil.
  * *Planejado:* Badge neutro estruturado.
  * *Concluído:* Badge arquivado com ícone de troféu.
  * *Cancelado:* Badge atenuado.
* **Preço em Destaque:** Taxa padrão em evidência visual limpa e botão *"Gerenciar Banca"* posicionado com hierarquia clara.

---

### 3.4 Redesign da Página do Evento: `/admin/exames/[eventId]`

#### Layout Desktop Assimétrico (65% Operação + 35% Apoio)

```
┌────────────────────────────────────────────────────────────────────────┐
│ HEADER: [32º Exame de Faixas] · Sábado, 15 de Novembro · Dojang Central│
│ KPIS: 18 Inscritos | 12 Aptos | R$ 2.700,00 Taxas | Status: Confirmado │
├────────────────────────────────────────┬───────────────────────────────┤
│ COLUNA PRINCIPAL (65%)                 │ PAINEL LATERAL DE APOIO (35%) │
│                                        │                               │
│ [MESA DE AVALIAÇÃO DA BANCA]          │ [INSCREVER ALUNOS ELEGÍVEIS]  │
│ Agrupado por Faixa-Alvo:              │ Lista de alunos aptos com     │
│                                        │ 1 clique para adicionar à     │
│ 🟡 Candidatos a Faixa Amarela (8º Gub)│ banca.                        │
│ ├─ Carlos Silva (9º ➔ 8º Gub)         │                               │
│ │  [ ✓ Aprovar ] [ ✗ Reprovar ] [ — ] │ [DADOS DO EVENTO & BANCA]     │
│ └─ Ana Souza (9º ➔ 8º Gub)            │ Local, horário de início,     │
│    [ ✓ Aprovar ] [ ✗ Reprovar ] [ — ] │ examinadores responsáveis,    │
│                                        │ taxa e observações.           │
│ 🟢 Candidatos a Faixa Verde (6º Gub)  │                               │
│ └─ Lucas Mendes (7º ➔ 6º Gub)         │ [AÇÕES GERAIS DO EXAME]       │
│    [ ✓ Aprovado ] (Emissão diploma)   │ Cancelar evento, gerar lista  │
│                                        │ de chamada da banca em PDF.   │
└────────────────────────────────────────┴───────────────────────────────┘
```

#### Sistema de Cores Oficiais das Faixas no Taekwondo
Criar o componente especializado `BeltProgressionPill`:
* Faixa Branca (10º Gub) ➔ Cinza/Branco com borda nítida.
* Faixa Amarela / Ponta Amarela ➔ Amarelo solar com texto escuro de alto contraste.
* Faixa Verde / Ponta Verde ➔ Verde esmeralda rico.
* Faixa Azul / Ponta Azul ➔ Azul cobalto vivo.
* Faixa Vermelha / Ponta Vermelha ➔ Vermelho carmim enérgico.
* Faixa Ponta Preta / Faixa Preta (1º Dan) ➔ Preto profundo com borda metálica/dourada sutil.

#### Ergonomia de 1 Clique para a Banca Examinadora
Durante o exame de faixa, o professor/mestre está com tablet ou laptop no dojang:
* Cada candidato possui três botões tácteis de avaliação rápida:
  * `[✓ Aprovar]` ➔ Destaca o card em tom verde suave e grava a nova graduação.
  * `[✗ Reprovar]` ➔ Marca reprovação e abre campo opcional de feedback técnico.
  * `[— Ausente]` ➔ Marca ausência sem penalizar o histórico de elegibilidade.
* Ação com **Mutação Otimista** (atualiza a UI no milissegundo do clique, sem travar nem recarregar a página).

---

## 4. Plano de Execução em Fases

```
[FASE 1: Fundação & Modelos] ──► [FASE 2: Telas de Exames] ──► [FASE 3: Onboarding] ──► [FASE 4: Homologação]
```

### Fase 1: Fundação de Componentes de Suporte
- [ ] Criar o componente `BeltProgressionPill` com a paleta oficial das graduações do Taekwondo e suporte estrito a temas Claro e Escuro.
- [ ] Criar os utilitários de status e cores de faixas em `src/features/students/options.ts`.
- [ ] Adicionar suporte ao armazenamento de preferências de onboarding (`onboarding_preferences` e `onboarding_completed_at`) no schema de perfis.

### Fase 2: Redesign Completo da Gestão de Exames
- [ ] **`/admin/exames` (Listagem):**
  - [ ] Implementar a barra de KPIs no topo com métricas de eventos ativos e arrecadação.
  - [ ] Redesenhar os cards com calendário visual, data proeminente e hierarquia de taxa.
- [ ] **`/admin/exames/[eventId]` (Banca Examinadora):**
  - [ ] Implementar o layout desktop assimétrico de 2 colunas (65% banca / 35% apoio).
  - [ ] Agrupar candidatos por faixa-alvo de graduação.
  - [ ] Implementar a barra de avaliação ergonômica de 1 clique (`Aprovar`, `Reprovar`, `Ausente`).
  - [ ] Criar o painel lateral de alunos elegíveis com inclusão rápida.

### Fase 3: Desenvolvimento do Fluxo de Onboarding Multi-Perfil
- [ ] Criar os componentes modulares do onboarding em `src/features/onboarding/components/`:
  - [ ] `OnboardingModal` (container com barra de progresso, botão pular e persistência).
  - [ ] `OnboardingWelcomeStep` (boas-vindas personalizadas por papel).
  - [ ] `OnboardingPreferencesStep` (perguntas curtas com seleção de múltipla escolha).
  - [ ] `OnboardingPermissionStep` (card explicativo prévio para Push Notifications).
- [ ] Integrar o disparador do Onboarding nos layouts dos portais:
  - [ ] Portal do Administrador (`/admin`).
  - [ ] Portal do Aluno Maior (`/aluno`).
  - [ ] Portal do Responsável (`/responsavel`).
- [ ] Criar o componente `OnboardingChecklist` colapsável para o zero-state do painel inicial.
- [ ] Adicionar ação de *"Repetir Onboarding"* na página de [`Configurações`](file:///home/matheus/ebenertkd-app/src/app/configuracoes/page.tsx).

### Fase 4: Validação, Acessibilidade e Testes
- [ ] Testes unitários com Vitest para os novos componentes de onboarding e exames.
- [ ] Validação de foco, navegação por teclado (Tab/Escape/Enter) e leitores de tela nos modais.
- [ ] Inspeção visual nos temas Claro e Escuro via Chrome DevTools MCP.
- [ ] Execução de `npm run typecheck`, `npm run lint`, `npm test` e `npm run build`.

---

## 5. Critérios de Aceite e Definição de Pronto (DoD)

1. **Onboarding Fluido e Não-Bloqueante:** O usuário consegue pular a qualquer instante; as preferências respondidas customizam o painel inicial; nenhuma permissão push é disparada sem consentimento prévio contextualizado.
2. **Ergonomia e Hierarquia no Desktop:** A tela de exames aproveita telas amplas com divisão assimétrica inteligente, destacando a lista de avaliação sem rolagem excessiva.
3. **Fidelidade às Cores do Taekwondo:** Todas as transições de faixas utilizam contraste visual seguro (WCAG AA) e representam com exatidão a jornada marcial do praticante.
4. **Qualidade Técnica:** Cobertura de testes mantida em 100% dos fluxos modificados, zero erros de linter e compilação de produção do Next.js sem avisos.
