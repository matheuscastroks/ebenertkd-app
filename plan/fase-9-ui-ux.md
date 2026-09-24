# Fase 9 — Refinamento de UI/UX Implementation Plan

> **For agentic workers:** execute esta fase somente após o piloto. Mudanças visuais não podem alterar regras de negócio aprovadas.

**Goal:** reduzir esforço e erros nos fluxos reais observados, melhorar acessibilidade e consolidar uma identidade visual adequada à academia.

**Architecture:** preservar serviços e contratos de domínio; concentrar mudanças em componentes, navegação e apresentação. Toda decisão deve responder a evidência do piloto ou a requisito de acessibilidade.

**Tech Stack:** React, Tailwind CSS, componentes existentes, Playwright, axe-core, Lighthouse.

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

## Testes e aceite

- [ ] Executar testes visuais nos breakpoints 360, 768, 1280 e 1536 px e em zoom de 200%.
- [ ] Executar axe/Lighthouse e resolver violações críticas; validar teclado e leitor de tela nos fluxos prioritários.
- [ ] Repetir métricas do piloto e registrar melhora ou justificativa para resultado neutro.
- [x] Rodar toda a regressão funcional; componentes não podem alterar autorização, valores ou estados.
- [ ] Gate: tarefas prioritárias ficam mais rápidas ou menos sujeitas a erro, acessibilidade crítica está aprovada e a identidade visual é coerente.
