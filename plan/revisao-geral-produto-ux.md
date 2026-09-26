# Revisão geral de produto e UX — Plano de implementação

> **For agentic workers:** Use `superpowers:subagent-driven-development` ou `superpowers:executing-plans` quando disponíveis, executando pelos checkboxes. Se indisponíveis, executar diretamente com revisão por subfase. Usar `frontend-design` nas alterações de interface. Este documento planeja o trabalho; sua criação não inicia a implementação.

**Goal:** tornar as jornadas da academia claras, eficientes e consistentes para professor, aluno, responsável e menor, com critérios verificáveis de experiência e acessibilidade.

**Architecture:** preservar autorização, regras de negócio e serviços Appwrite. Alterar composição das páginas e consultas somente quando necessário à tarefa do usuário. Reutilizar primitives em `src/components/ui/`, composições em `src/components/shared/` e comportamentos específicos em `src/features/`.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind, shadcn/ui Radix Nova, Appwrite, Sonner, Vitest, Testing Library e Playwright.

---

## 1. Estado, escopo e precedência

Análise em 26/09/2026, sobre o commit `bb06e41`: código e documentação. Não representa auditoria visual completa nem homologação com usuários. As funcionalidades já implementadas devem ser preservadas.

Esta revisão complementa a Fase 9 e precede a Fase 10. Não substitui os gates operacionais das fases 7–8: Drive, restauração, dispositivos reais, contrato e piloto continuam necessários para lançamento.

**Decisões vigentes:** tokens base Neutral padrão do shadcn, fonte única Poppins, ícones Lucide, logo existente, Sonner para feedback transitório e View Transition respeitando movimento reduzido. As propostas anteriores de azul profundo, laranja como primary, zinc personalizado e Chakra Petch foram substituídas. Não iniciar outra personalização estética nesta revisão.

**Dentro do escopo:** jornadas, navegação contextual, hierarquia das telas, componentes, feedback, acessibilidade, linguagem e avaliação com usuários.

**Fora do escopo:** gamificação, integração bancária/WhatsApp, recriação do app, novos mecanismos de autenticação e alterações de contrato/cobrança. Migração do banco somente com necessidade demonstrada e plano separado.

## 2. Diagnóstico e rastreabilidade

| Critério | Situação observada | Correção ou validação | Subfase |
| --- | --- | --- | --- |
| Objetivo da jornada | Fluxos de negócio existem; evidências ponta a ponta ainda incompletas | Mapas por perfil e próximo passo contextual | R1, R6 |
| Eficiência | Ação de acesso próprio não seleciona aluno; matrícula tem envio manual de filtros | Preservar contexto e atualizar listagem localmente | R1, R4 |
| Wireframing | Sem conjunto consolidado de esboços das jornadas | Esboços de baixa fidelidade por tarefa | R2 |
| Função das páginas | Acessos lista contas, mas só oferece transição de menores | Alinhar promessa da tela e ação contextual | R1, R2 |
| Design system | Tokens/primitives existem, com controles e envios fora do padrão | Contrato de composições e revisão dos consumidores | R3 |
| Hierarquia visual | Dashboards têm atalhos genéricos; matrícula mantém card inicial grande | Pendências reais e menos containers | R2, R4 |
| Contraste e equilíbrio | Testes de botões não homologam todas as telas | Estados renderizados, toque, foco, zoom e layout | R5 |
| Feedback e simplicidade | Sonner/loading usados de forma desigual; estados técnicos expostos | Linguagem de produto e recuperação consistente | R3, R4 |

## 3. Arquivos e responsabilidades

| Arquivo existente | Responsabilidade |
| --- | --- |
| `src/lib/navigation/routes.ts` | URLs e navegação por perfil |
| `src/components/dashboard/dashboard-shell.tsx` | Cabeçalho, gutter e hierarquia compartilhados |
| `src/app/admin/page.tsx`, `src/app/aluno/page.tsx`, `src/app/responsavel/page.tsx` | Prioridades e ações de cada visão geral |
| `src/app/admin/alunos/acessos/page.tsx` | Consulta de contas e acesso independente |
| `src/app/admin/matriculas/acessos/page.tsx` | Entrada estática da gestão de acessos |
| `src/app/admin/matriculas/page.tsx` | Filtros, tabela e largura da revisão |
| `src/features/students/components/enrollment-form.tsx` | Cadastro, progresso, foto, documentos e estados |
| `src/features/students/components/review-panel.tsx` | Revisão e avanço administrativo da matrícula |
| `src/features/billing/components/billing-filters.tsx` e `payer-billing-view.tsx` | Filtros e ações de pagamentos |
| `src/components/shared/form-submit-button.tsx`, `operation-toast.tsx`, `status-badge.tsx` | Submissão, feedback e estados legíveis |
| `src/app/globals.css`, `src/app/layout.tsx`, `src/lib/color-contrast.test.ts` | Paleta/fonte vigentes e regressão de contraste |
| `src/lib/theme-transition.ts` e `theme-transition.test.ts` | Troca de tema, fallback e movimento reduzido |
| `docs/pilot-script.md`, `docs/ux/product-review.md` | Roteiro humano e evidências anteriores |

**Criar durante a execução:** `docs/ux/user-flows.md`, `docs/ux/wireframes.md`, `docs/ux/component-contract.md` e `docs/ux/general-review.md`. Adicionar testes de comportamento junto das composições alteradas. Não criar tabela ou formulário universal para tarefas com contratos diferentes.

## 4. Subfases de execução

Ordem: R0 → R1 → R2 → R3 → R4 → R5 → R6. Marcar concluído somente com evidência. Os commits abaixo são propostas para a implementação futura.

### Critérios transversais de qualidade UI/UX

Estes critérios devem ser verificados em cada subfase. Derivam de princípios de design centrado no usuário e complementam os requisitos funcionais.

**Familiaridade e convenções:**
- Padrões esperados: o usuário traz bagagem de interações do mundo real e digital. Cada controle deve ser intuitivo sem manual — botões são botões, menus são menus, campos comportam-se como campos.
- Causa e efeito: toda interação produz retorno imediato. Clique → mudança visual; filtro → atualização sem perda de contexto; submissão → progresso visível. Nunca "nada acontece".
- Consistência sistêmica: se um padrão de interação existe em uma tela, ele é idêntico em todas. Filtros, feedback, confirmações e navegação seguem a mesma lógica.
- Sensação de segurança: o usuário explora sem medo. Ações reversíveis permitem desfazer; ações irreversíveis mostram consequência antes de confirmar. Incluir opções de confirmação com contexto ("Rejeitar matrícula de João — documentos precisam de correção").

**Identidade — evitar design genérico:**
- Especificidade de conteúdo: o layout é moldado pelo conteúdo, não o contrário. Perguntar: "este formato faz sentido para esta informação específica?"
- Identidade visual reconhecível: funcional e familiar, mas com voz própria. Paleta, tipografia e elementos visuais devem comunicar "este é o Ebener TKD", não "este é qualquer app".
- Equilíbrio pragmático vs. poético: nem puramente funcional (entediante), nem abstrato (confuso). Elementos como faixa do aluno, progresso de matrícula e calendário de frequência são oportunidades de personalidade sem sacrificar clareza.

**Checklist por tela alterada:**
1. Hierarquia: o mais importante ocupa mais espaço ou tem mais destaque?
2. Estrutura invisível: o usuário foca no conteúdo, não na interface?
3. Propósito: cada elemento tem função clara que ajuda o objetivo da jornada?


### R0 — Baseline e inventário

- [ ] Registrar commit, ambiente, perfis disponíveis e limites de autenticação em `docs/ux/general-review.md`.
- [ ] Inventariar rotas por perfil com objetivo, ação principal, estado vazio, erro e próximo passo, usando `src/lib/navigation/routes.ts`.
- [ ] Capturar estado inicial de matrícula, revisão, acessos, financeiro, frequência e avisos nos dois temas. Usar dados de teste; não versionar CPF, saúde, e-mail ou fotos identificáveis nas capturas.
- [ ] Classificar achados: bloqueia tarefa; induz erro operacional; exige ajuda; acabamento. Registrar tela e reprodução, separando fato, hipótese e pendência.

**Aceite:** inventário reproduzível, sem nota percentual subjetiva nem alegação de validação não executada. Commit sugerido: `docs: baseline product UX review`.

### R1 — Jornadas e navegação contextual

- [ ] Documentar em `docs/ux/user-flows.md` entrada, objetivo, passos, resultado, falhas recuperáveis e retorno de cada perfil.
- [ ] Adulto: login → rascunho → documentos → envio → correção solicitada → contrato → assinatura → cobrança → comprovante → conferência.
- [ ] Professor: pendência → revisão de documentos → condições financeiras → contrato; financeiro → comprovante → decisão; turma → aula → chamada → correção; exame → participantes → resultado.
- [ ] Responsável: escolher dependente antes de editar/assinar/pagar e mantê-lo ao retornar. Menor: login por usuário → graduação/frequência/avisos, conforme permissões existentes.
- [ ] Corrigir “Configurar acesso próprio”: a ação da linha abre o formulário com aquele aluno identificado. Validar no servidor menor ativo, e-mail e capacidade administrativa. Reutilizar `promoteMinorAction`, sem alterar regras de transição.
- [ ] Alinhar a gestão de acessos ao que oferece: consulta de contas e configuração de acesso independente. Explicar situações sem ação. Não prometer bloquear contas ou redefinir senhas enquanto essas operações não existirem; eventual expansão é outro escopo.
- [ ] Preservar filtro/página/aluno ao abrir/fechar modal, salvar e voltar. Cobrir ação na segunda página de uma lista filtrada.

**Teste de comportamento:** listar dois menores, abrir a ação na linha do segundo, verificar identificação e ID enviado. No servidor, rejeitar ID de adulto/menor desativado. Validar opções de manutenção do vínculo do responsável.

**Aceite:** próxima ação não exige selecionar novamente a entidade. Commit sugerido: `fix: preserve student context across management actions`.

### R2 — Wireframes e hierarquia

- [ ] Criar `docs/ux/wireframes.md` antes de reorganizar telas, com esboços desktop/360 px, ação principal e estados vazio/carregando/erro.
- [ ] Professor: cabeçalho → tarefas pendentes reais → indicadores → próximas aulas/exames. A quantidade de matrículas acompanha o atalho de análise; tarefa inexistente não aparece como pendência.
- [ ] Aluno: situação da matrícula → ação necessária → treino/frequência → pagamento autorizado. “Tudo em dia” no financeiro não significa matrícula concluída.
- [ ] Responsável: dependente selecionado → pendências e ações desse dependente, sem mistura entre irmãos.
- [ ] Matrícula: título/progresso compactos → seções semânticas → foto/documentos → rascunho/envio. Remover card decorativo duplicado do cabeçalho sem perder estado.
- [ ] Listagens usam o gutter; campos recebem largura proporcional ao conteúdo. Evitar `max-w-*` aninhado. Texto contratual extenso pode manter limite de leitura.
- [ ] Acessos: busca → contas → ação contextual. Converter a transição de menores em modal responsivo, retirando o formulário permanente da área principal.

**Aceite:** objetivo e ação principal claros; wireframes cobrem mobile e falhas. Aplicar checklist por tela: hierarquia (destaque proporcional à importância), estrutura invisível (conteúdo > containers), propósito (nenhum elemento sem função clara). Commit sugerido: `docs: define task-oriented page wireframes`.

### R3 — Componentes e linguagem

- [ ] Documentar em `docs/ux/component-contract.md`: `Field` para formulários; `Select` para opções; `DateField` para datas; `SearchField`/`InputGroup` para busca; `Avatar` para foto; `Badge` para estado; `Separator` para divisão; modal responsivo para ação contextual.
- [ ] Usar `Switch` em preferências imediatas e `Checkbox` em opções enviadas com formulário, incluindo manutenção do acesso do responsável. Reutilizar primitives instaladas.
- [ ] Padronizar envio com `FormSubmitButton`: rótulo, espera e bloqueio de duplo envio. Botão de navegação não simula submissão.
- [ ] Traduzir estados por mapas explícitos. Documentos: `pending` → “Aguardando análise”, `approved` → “Aprovado”, `rejected` → “Precisa de correção”; conferir os valores em `src/features/students/types.ts` antes de codificar.
- [ ] Em `enrollment-form.tsx`, substituir inferência de tom por `message.includes(...)` por resultado/tom explícito da operação.
- [ ] Sonner comunica retorno transitório; erros de campo permanecem próximos, com foco e orientação. Informação essencial não existe apenas em toast/tooltip.
- [ ] Manter Neutral/Poppins/Lucide. Cards exigem agrupamento funcional; ícones decorativos usam `aria-hidden`; controles só com ícone têm nome acessível.

**Teste de comportamento:** envio atrasado mostra espera e impede segundo envio; falha preserva valores e orienta correção; documento recusado exibe estado em português e motivo intacto.

**Aceite:** operações equivalentes têm controles e feedback equivalentes. Verificar causa e efeito: toda interação produz retorno visual imediato. Verificar consistência: mesma lógica visual em todas as telas — se um padrão existe em matrículas, ele é idêntico no financeiro. Commit sugerido: `refactor: unify forms and user-facing feedback`.

### R4 — Telas e carregamento local

- [ ] Aplicar R2 nos dashboards, matrícula e acessos usando serviços atuais e preservando autorização por perfil.
- [ ] Filtros de matrículas atualizam URL: busca com debounce, seleção imediata, reset da página ao mudar critério e restauração por voltar. Evitar consulta a cada tecla.
- [ ] Usar `billing-filters.tsx` como referência de interação. Compartilhar composição somente quando os contratos forem equivalentes.
- [ ] Tabela, indicador e calendário possuem espera própria. Filtro não desmonta sidebar, título ou controles. Preservar espaço dos dados para reduzir deslocamento.
- [ ] Distinguir falta de registros de resultado vazio por filtros: orientar primeira ação ou oferecer “Limpar filtros”, conforme o caso.
- [ ] Falha de rede mantém contexto e valores, explica a recuperação e permite repetição segura. Confirmação financeira não anuncia sucesso antes da action concluir.

**Testes de comportamento:** filtro troca URL/linhas sem remover sidebar; voltar restaura filtro; vazio permite limpar; modal com erro preserva rascunho; duplo clique não duplica operação crítica. Usar ambiente de teste, sem enviar avisos/recuperação a usuários operacionais.

**Aceite:** fluxos principais sem perda de contexto, com carregamento restrito às regiões dinâmicas. Commit sugerido: `feat: refine task-oriented dashboard workflows`.

### R5 — Acessibilidade e QA visual

- [ ] Avaliar 360, 768, 1280 e 1536 px, nos dois temas, e zoom 200%. Conferir tabela, modal, barra de salvar e calendário. Observar deslocamento real; skeleton sozinho não prova estabilidade.
- [ ] Medir texto normal (4,5:1), texto grande e elementos essenciais de controle (3:1), considerando transparências e estados hover/foco/erro. Tema padrão não certifica acessibilidade global.
- [ ] Manter `src/lib/color-contrast.test.ts` e avaliar separadamente badges, links, ícones funcionais e textos secundários renderizados.
- [ ] Percorrer por teclado: ordem, abertura, Escape quando aplicável, foco inicial e retorno ao acionador. Erro abre seção recolhida e aponta para o campo.
- [ ] Verificar área clicável efetiva de pelo menos 24×24 px ou exceção de espaçamento justificada; preferir 44×44 px para controles frequentes no celular. Não avaliar só o tamanho do ícone.
- [ ] Validar leitor de tela, nomes/rótulos, seleção e mensagens. Cor não é a única indicação de falta, dívida ou documento recusado.
- [ ] Conferir View Transition em ambos os sentidos, seguir dispositivo, movimento reduzido e navegador sem suporte; registrar verificação visual além do fallback unitário.
- [ ] Executar axe/Lighthouse no ambiente de teste, guardar relatório sanitizado e revisar violações com impacto na tarefa.

**Aceite:** sem impedimento de tarefa por teclado, foco, toque, contraste ou zoom; evidências e limitações registradas. Verificar sensação de segurança: ações destrutivas mostram consequência com nome/valor/contexto; ações reversíveis oferecem opção de desfazer. Verificar identidade: o app é reconhecível como Ebener TKD, não como template genérico. Commit sugerido: `fix: address product accessibility findings`.

### R6 — Piloto e encerramento

- [ ] Executar `docs/pilot-script.md` com professor, adulto e família com responsável/dois menores. Participante realiza tarefa sem orientação; qualquer ajuda é registrada.
- [ ] Medir antes/depois: conclusão sem ajuda, tempo, correções, perda de contexto e comentários. Não estabelecer melhoria percentual sem baseline.
- [ ] Comparar tarefas equivalentes nas mesmas condições; registrar resultados neutros e justificar manter/reverter mudanças.
- [ ] Classificar problemas, corrigir bloqueadores e erros operacionais induzidos pela interface, repetir casos afetados.
- [ ] Executar E2E autenticado em Appwrite isolado. Ausência de `E2E_*` deixa o gate pendente; não equivale a aprovação.
- [ ] Atualizar `docs/ux/general-review.md` e Fase 9, distinguindo implementação, automação e homologação humana.

**Aceite:** professor e famílias concluem tarefas prioritárias sem console técnico, com recuperação clara. Commit sugerido: `docs: record general UX review results`.

## 5. Verificações e evidências

Para alterações de comportamento, escrever primeiro o teste de regressão e confirmar que falha pelo comportamento desejado; implementar a correção e confirmar aprovação. Não criar testes que apenas repetem classes CSS. Revisões de texto/layout usam inspeção proporcional ao impacto.

Antes da entrega de código:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e -- --grep-invert @authenticated
npm run test:e2e:auth
git diff --check
```

Esperado: sem erro de lint/tipagem/build/whitespace e testes aprovados. Se o Chromium empacotado estiver ausente, usar Chrome disponível: no PowerShell, `$env:E2E_BROWSER_CHANNEL='chrome'` antes de executar E2E. Testes autenticados exigem credenciais `E2E_*` do projeto isolado; registrar testes não executados.

O relatório registra versão/ambiente, perfil/tarefa, passos, esperado/observado, captura sanitizada, resultado automatizado, observação humana e pendências. Não marcar acessibilidade ou piloto como concluídos apenas com build verde.

## 6. Gate geral

- [ ] Mapas e wireframes cobrem professor, adulto, responsável e menor.
- [ ] Ações preservam aluno/dependente/filtros; gestão de acessos não colide com ID dinâmico.
- [ ] Títulos e objetivos correspondem às capacidades reais de cada tela.
- [ ] Neutral, Poppins e componentes shadcn seguem contrato documentado.
- [ ] Estados em português, submissões seguras e recuperação sem perder dados.
- [ ] Carregamento local e layout estável observados nos fluxos prioritários.
- [ ] Acessibilidade automatizada/manual tem evidência e limitações explícitas.
- [ ] Piloto e E2E autenticado possuem resultados; gates pendentes não são marcados como aprovados.
- [ ] Autorização, dados privados e regras contratuais/financeiras preservados.
- [ ] Toda interação produz retorno visual imediato (causa e efeito verificado).
- [ ] Padrões de interação são idênticos entre telas equivalentes (consistência sistêmica).
- [ ] Ações destrutivas mostram consequência com contexto; ações reversíveis permitem desfazer (sensação de segurança).
- [ ] Cada tela é moldada para seu conteúdo específico, não para um template genérico (especificidade de conteúdo).
- [ ] O app é visualmente reconhecível como Ebener TKD (identidade verificada).
- [ ] Hierarquia, estrutura invisível e propósito verificados por tela (checklist de análise aplicado).

**Primeiro bloco recomendado:** R0 e R1. Jornadas orientam wireframes; reorganização visual começa após R2.
