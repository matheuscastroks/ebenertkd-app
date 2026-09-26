# Fase 9 — Refinamento de UI/UX Implementation Plan

O plano vigente de revisão transversal está em [Revisão geral de produto e UX](./revisao-geral-produto-ux.md), com subfases R0–R6 e critérios de aceite por jornada. Ele complementa [Identidade e experiência de produto](./fase-9-produto-identidade-experiencia.md). Os problemas relatados pelo usuário autorizam priorizar essas correções antes do piloto geral. A base visual vigente é Neutral padrão do shadcn e Poppins. Checkboxes históricos abaixo não atestam que os novos critérios foram cumpridos.

> **For agentic workers:** seguir a ordem R0–R6 da revisão geral; a homologação humana encerra o trabalho, mas não impede corrigir problemas já identificados. Mudanças visuais não podem alterar regras de negócio aprovadas.

**Goal:** reduzir esforço e erros nos fluxos reais observados, melhorar acessibilidade e consolidar uma identidade visual adequada à academia.

**Architecture:** preservar serviços e contratos de domínio; concentrar mudanças em componentes, navegação e apresentação. Toda decisão deve responder a evidência do piloto ou a requisito de acessibilidade.

**Tech Stack:** React, Tailwind CSS, componentes existentes, Playwright, axe-core, Lighthouse.

**Contrato de componentes:** toda implementação ou alteração de tela deve seguir [Refinamento shadcn/ui](./refinamento-shadcn-ui.md). O gate da fase não permite controles HTML improvisados quando já existir uma primitive adequada no projeto.

---

## Critérios de qualidade UI/UX (referência transversal)

Estes critérios orientam toda alteração de interface nas subfases 9.1–9.4 e devem ser verificados na homologação. São complementares aos requisitos funcionais e de acessibilidade já existentes.

### Familiaridade e convenções — "como funciona"

- [ ] **Padrões esperados**: botões, menus, campos e navegação seguem convenções estabelecidas; o usuário não precisa aprender a usar a interface. Exemplos: `Select` para listas fechadas, `Calendar` para datas, `Dialog` para edição contextual, `AlertDialog` para confirmação destrutiva.
- [ ] **Causa e efeito (action/reaction)**: toda interação produz retorno visual imediato. Cliques registram estado de carregamento (`Spinner`, `aria-busy`); submissões mostram progresso (`FormSubmitButton`); transições entre telas mantêm contexto e não piscam conteúdo. Exemplos a corrigir: filtros via GET nativo que recarregam tudo; anchors nativos nas abas do pagador.
- [ ] **Consistência sistêmica**: a lógica visual é repetível entre telas. Se o botão de confirmar tem estilo X na matrícula, ele é idêntico no financeiro. Se filtros usam URL e navegação cliente em matrículas, o financeiro não pode usar formulário GET com recarga total. Verificar: `billing-filters.tsx` e filtros de matrícula seguem o mesmo padrão.
- [ ] **Sensação de segurança**: ações críticas (aprovar/rejeitar comprovante, cancelar contrato, estornar pagamento) mostram consequência antes da confirmação. Ações reversíveis permitem desfazer ou oferecem recuperação clara. O usuário explora sem medo de cometer erros irreversíveis.

### Identidade visual — evitar design genérico

- [ ] **Especificidade do conteúdo**: cada tela é moldada para seu conteúdo, não para um template. O dashboard do professor prioriza tarefas pendentes (matrículas, comprovantes), não métricas decorativas. O do aluno mostra próxima aula e faixa, não atalhos genéricos. Perguntar: "o formato desta tela faz sentido para este tipo específico de informação?"
- [ ] **Identidade visual reconhecível**: o app deve parecer funcional e familiar, mas ao mesmo tempo idiossincrásico. A decisão vigente usa Neutral/Poppins, porém a marca Ebener TKD possui identidade forte (`#F98E03`, Chakra Petch, universo de faixas). Avaliar se a decisão deve ser revisitada à luz da necessidade de diferenciação funcional — a cor da marca pode ser primary sem comprometer a usabilidade, desde que validada por contraste AA.
- [ ] **Equilíbrio pragmático vs. poético**: não fazer um design puramente funcional (entediante) nem abstrato (confuso). Elementos como a faixa do aluno, o progresso da matrícula e o calendário de frequência são oportunidades de dar personalidade sem sacrificar clareza.

### Checklist de análise por tela

Para cada tela alterada, responder antes de marcar concluída:

1. **Hierarquia**: o elemento mais importante ocupa o maior espaço ou tem mais destaque visual? Se há 4 MetricCards iguais, a pendência urgente deveria se diferenciar.
2. **Estrutura invisível**: o usuário consegue focar no conteúdo sem tentar entender como o sistema funciona? Cards aninhados, containers extras e gráficos sem pergunta operacional adicionam estrutura visível que compete com o conteúdo.
3. **Propósito de cada elemento**: há função clara para tudo na tela? Remover o que não ajuda a atingir o objetivo da jornada. Exemplos: gráfico de tendência sem pergunta definida, Card "Próximos passos" com links sempre iguais, coluna de push nos avisos.

---

## 9.1 Pesquisa e métricas

**Arquivos:** criar `docs/ux/pilot-findings.md`, `docs/ux/design-principles.md`; revisar componentes em `src/components/`.

- [ ] Consolidar observações do professor, adultos, responsáveis e menores por tarefa, frequência e impacto.
- [ ] Medir tempo e erros em: aprovar matrícula, conferir comprovante, fazer chamada, assinar contrato e localizar dívida.
- [ ] Priorizar problemas que bloqueiam ou geram erro antes de preferências estéticas.
- [ ] Definir princípios: linguagem direta, foco mobile, ações reversíveis, estado sempre visível e densidade maior no painel administrativo.

## 9.2 Sistema visual e navegação

- [x] Consolidar tokens de cor, tipografia, espaçamento, foco, elevação e estados em `src/app/globals.css`.
- [x] Criar componentes consistentes para status, filtros, tabelas responsivas, confirmação, erro, vazio, carregamento e sucesso.
- [x] Diferenciar claramente ação primária, destrutiva e administrativa; exigir confirmação apenas quando houver consequência real.
- [x] Reorganizar navegação por tarefas: alunos, financeiro, aulas, exames, avisos e sistema; manter contexto do filho selecionado no portal do responsável.
- [x] Manter alvos de toque adequados, contraste AA, foco visível, rótulos e navegação por teclado.

## 9.3 Fluxos prioritários

- [ ] Reduzir etapas e campos simultâneos do cadastro sem retirar validações obrigatórias.
- [x] Tornar fila de comprovantes operável com uma mão no celular; chamada permanece para a Fase 5 funcional.
- [x] Mostrar contexto e consequência antes de assinatura, aprovação financeira, reprovação e cancelamento.
- [x] Melhorar filtros persistentes, pesquisa, retorno ao item anterior e estados vazios orientativos.
- [x] Usar movimento apenas para transição e feedback, respeitando `prefers-reduced-motion`.

## 9.4 Adoção obrigatória do shadcn/ui

- [ ] Exibir a foto privada do aluno com `Avatar` no cadastro, listas, detalhes e seleção de dependente.
- [ ] Usar `Calendar + Popover` nos campos de data diária e preservar formato de domínio `YYYY-MM-DD`.
- [ ] Consolidar `InputGroup` com lupa para buscas e `Pagination` por URL para filas extensas.
- [ ] Aplicar `Accordion`/`Collapsible` somente à revelação progressiva, `Dialog` à edição contextual, `Switch` a booleanos imediatos e `Separator` à divisão visual sem containers extras.
- [ ] Usar `Tooltip` para ajuda curta e warnings não bloqueantes; alertas críticos permanecem visíveis e acessíveis sem hover.
- [ ] Completar a composição oficial da `Sidebar` por perfil, incluindo submenus apenas quando houver hierarquia real e badges apenas para contagens acionáveis.

## Testes e aceite

- [ ] Executar testes visuais nos breakpoints 360, 768, 1280 e 1536 px e em zoom de 200%.
- [ ] Executar axe/Lighthouse e resolver violações críticas; validar teclado e leitor de tela nos fluxos prioritários.
- [ ] Repetir métricas do piloto e registrar melhora ou justificativa para resultado neutro.
- [x] Rodar toda a regressão funcional; componentes não podem alterar autorização, valores ou estados.
- [ ] Gate: tarefas prioritárias ficam mais rápidas ou menos sujeitas a erro, acessibilidade crítica está aprovada e a identidade visual é coerente.
