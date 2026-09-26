# Fase 9 — Identidade e experiência de produto Implementation Plan

**Goal:** transformar a aplicação funcional em um produto reconhecível, com linguagem natural, navegação consistente e fluxos eficientes para professor, aluno e responsável.

**Architecture:** preservar autorização e regras de negócio; reorganizar o shell persistente, consultas por região da tela e componentes de domínio. Preferências de notificações são uma extensão funcional com persistência no servidor.

**Tech Stack:** Next.js App Router, React, Appwrite, Tailwind, shadcn/ui instalado, next-themes, Sonner, Vitest e Playwright.

**Estado:** planejamento; nenhuma alteração funcional autorizada por este documento. Este detalhamento da Fase 9 passa a preceder a implementação da Fase 10.

## Evidências e limite da auditoria

Inspeção estática do repositório em 24/09/2026; ainda não houve avaliação visual no navegador nesta revisão.

| Problema | Evidência no código | Correção |
| --- | --- | --- |
| Cabeçalho parece card | `dashboard-shell.tsx` usa borda, fundo e padding no header | Título e descrição simples; barra global separada |
| Espaço horizontal desperdiçado | Frame com `max-w-7xl` e páginas com `max-w-5xl/3xl` adicionais | Um gutter comum; largura útil integral |
| Sidebar sem marca | `app-sidebar.tsx` renderiza letra E e badge PWA | Logo fornecida, respiro e hierarquia |
| Aluno sem grupos | Itens de aluno não têm `group` em `routes.ts` | Grupos por tarefas com divisores |
| Visão geral provisória | `PhaseOnePanel` mostra Segurança, Privacidade e Próxima etapa | Dados operacionais e ações reais por perfil |
| Tema incompleto | Provider existe, mas `globals.css` não define `.dark` | Tokens claros/escuros, inclusive sidebar |
| Recarregamento amplo | Formulário GET nativo no financeiro; anchors nativos nas abas do pagador | Navegação cliente e fronteiras locais de carregamento |
| Skeleton substitui conteúdo estático | `PageSkeleton` inclui título e containers inteiros | Skeleton em valores, linhas e calendário |
| Financeiro do aluno em cartões | `payer-billing.tsx` monta formulário em cada cobrança | Tabela filtrável e ação contextual |
| Frequência sem agenda | Serviço parte apenas de registros de chamada | Consultar aulas concretas e vínculo histórico |
| Avisos excessivamente pesados | Card por mensagem e coluna lateral de push | Lista compacta, composição em modal e preferências na conta |
| CSP no desenvolvimento | `script-src` idêntico para dev/prod em `headers.ts` | Permitir eval somente em desenvolvimento |

A logo existe em `src/assets/favicon.avif` e está em arquivos não rastreados do usuário. Preservar o arquivo original. A referência confirmada é https://ebenertkd.com.br/. HTML e CSS consultados identificam laranja `#F98E03`, Chakra Petch e fundo escuro `hsl(222 47% 11%)`. A matriz observada e sua adaptação estão em [Referência de marca](../docs/ux/brand-reference.md); validação visual e contraste fazem parte da implementação.

## Ordem e critérios gerais

Executar 9P.0 → 9P.1 → 9P.2 → 9P.3; então as telas 9P.4–9P.8; finalizar com 9P.9. A pesquisa de marca pode ocorrer em paralelo à correção do CSP.

Cada entrega deve produzir um commit independente. Antes de marcar concluída: revisar diff, executar verificações proporcionais e os checks exigidos pelo repositório. Registrar resultados reais, incluindo limites de validação. Não marcar esta fase concluída apenas porque as primitives foram adicionadas.

## 9P.0 — Diagnóstico e correção do CSP

**Alterar:** `src/lib/security/headers.ts`, `src/lib/security/headers.test.ts`, `next.config.ts` se necessário.

- [x] Reproduzir o erro em `npm run dev`, inspecionar cabeçalho efetivo e verificar se proxy/hosting adicionam uma segunda CSP.
- [x] Condicionar `unsafe-eval` a `production === false` em `script-src`; manter produção sem essa permissão. Não desabilitar a política inteira.
- [x] Verificar HMR e conexão WebSocket local; abrir apenas a origem necessária no desenvolvimento se houver bloqueio comprovado.
- [x] Testar explicitamente presença de `unsafe-eval` em dev e ausência em produção; manter testes existentes de framing e HSTS.
- [x] Reiniciar o servidor após alteração de configuração e verificar console dev e build servido em produção.

Achado adicional para a Fase 10: `Permissions-Policy` atualmente contém `geolocation=()`. O check-in exigirá habilitação deliberada de `geolocation=(self)`; os vídeos precisarão de CSP específica para embed. Registrar essa dependência, sem antecipar permissões nesta correção.

**Aceite:** reprodução deixa de ocorrer em dev, política de produção não recebe `unsafe-eval`.

## 9P.1 — Marca, tokens e linguagem

**Alterar:** `src/app/globals.css`, `src/app/layout.tsx`, `src/app/manifest.ts` e textos nas páginas/componentes.
**Criar:** `docs/ux/brand-reference.md`, `docs/ux/content-guidelines.md`, `src/components/shared/brand-mark.tsx`.

- [x] Identificar URL, fontes e tokens no HTML/CSS público; registrar valores e adaptações em `docs/ux/brand-reference.md`.
- [x] Completar inspeção visual do cabeçalho, logo, botões e estados e registrar capturas.
- [x] Montar matriz origem → token → uso: primary/foreground, accent, background, card, muted, border, ring, sidebar e estados ativos. Separar cores de marca de sucesso, atraso e erro.
- [x] Definir pares claros/escuros e validar contraste AA. Não apenas inverter cores nem deixar classe `.dark` sem variáveis.
- [x] Auditar aliases `@theme inline`, tokens de sidebar e variante dark segundo a configuração instalada. Adotar Chakra Petch em marca/títulos e Inter em controles/tabelas; remover Poppins/Geist redundantes.
- [x] Padronizar nome público como Ebener TKD, conforme referência; manter IDs técnicos e integrações estáveis.
- [x] Inspecionar a logo AVIF em tamanho real antes de usá-la; manter proporção, dimensões reservadas e fundo adequado nos dois temas. Conferir favicon/manifest e fallback compacto da sidebar.
- [x] Padronizar ícones Lucide: 16–20 px em navegação/ações, 20–24 px em indicadores; ícones decorativos ocultos de leitores de tela e botões sem texto com nome acessível.
- [x] Revisar linguagem de login, cadastro, dashboards, finanças, matrícula, turmas, exames, contratos, avisos e vazios.

| Atual | Proposta |
| --- | --- |
| Aluno adulto | Aluno |
| Operação registrada com sucesso | Pagamento confirmado / Turma atualizada, conforme ação |
| Identidade única para cadastro, treinos e financeiro | Remover; não ajuda uma tarefa |
| Visão operacional de cobranças | Acompanhe mensalidades e confira comprovantes. |
| aluno(s) distinto(s) | 1 aluno / 12 alunos, com pluralização |
| Transição para conta adulta | Atualizar acesso do aluno |
| Nenhuma cobrança nesta visão | Nenhum pagamento encontrado neste período. |

Frases curtas, verbos específicos e termos da academia. Não usar ID, capability, PWA, idempotência ou versão de comprovante como explicação principal ao usuário. Erros devem orientar uma ação possível; nunca prometer sucesso antes da confirmação do servidor. Sonner continua sendo o padrão de feedback transitório.

**Aceite:** marca rastreável à referência, temas coerentes, logo legível e glossário aplicado sem modificar regras.

### Critérios de identidade (referência do curso)

A marca existe e é forte (laranja `#F98E03`, Chakra Petch, universo de faixas), mas a decisão vigente mantém Neutral/Poppins. Ao implementar 9P.1, avaliar explicitamente:

- [x] **Especificidade do conteúdo**: os tokens escolhidos servem ao conteúdo da academia ou a qualquer SaaS genérico? Se o app não se diferencia visualmente de um template shadcn padrão, documentar o motivo da escolha e a eventual migração futura.
- [x] **Equilíbrio pragmático vs. poético**: onde o design puramente funcional pode incorporar elementos da identidade TKD sem sacrificar clareza? Candidatos: cor de progresso da matrícula, destaque da faixa do aluno, cor de ação na sidebar.
- [x] **Hierarquia tipográfica com propósito**: se uma fonte de marca (Chakra Petch) existir, ela comunica "este é o Ebener TKD" em títulos/marca, enquanto a fonte de conteúdo (Poppins ou Inter) mantém legibilidade operacional. Fonte única aplana a personalidade.

## 9P.2 — Estrutura, sidebar e conta

**Alterar:** `dashboard-shell.tsx`, `portal-shell.tsx`, `app-sidebar.tsx`, `active-sidebar.tsx` em `src/components/dashboard/`, `src/lib/navigation/routes.ts` e testes associados.
**Criar:** `src/components/dashboard/account-menu.tsx`, `src/components/shared/page-heading.tsx`, `src/components/settings/preferences-dialog.tsx`.

- [x] Manter `SidebarProvider` no layout persistente. Posicionar `SidebarTrigger` na barra superior do conteúdo, à esquerda do breadcrumb, em posição idêntica nas páginas.
- [x] Retirar o header em card; usar h1, descrição curta e ações alinhadas, sem duplicar o título em outro container.
- [x] Padronizar gutter de 16 px no celular, 24 px no tablet e 32 px no desktop; área principal `w-full min-w-0`, sem limite global artificial. Textos de contrato podem manter largura confortável de leitura.
- [x] Dar respiro de 20–24 px ao topo da sidebar, usar logo e nome da academia, retirar badge PWA e rótulos de papel repetidos.
- [x] Segmentar aluno: Geral (Visão geral, Avisos); Treinos (Frequência); Cadastro (Matrícula, Contratos); Financeiro quando permitido. Responsável mantém dependente selecionado e acesso familiar; admin conserva agrupamento operacional.
- [x] Usar `SidebarGroup`, `SidebarGroupLabel`, `SidebarSeparator` e submenus apenas para hierarquia real; comportamento consistente recolhido e no celular.
- [x] Transformar perfil no rodapé em `DropdownMenu` acionado por clique/toque: Configurações, Notificações e Sair. Não exigir clique direito. Evitar botão Sair duplicado no cabeçalho.
- [x] Configurações abrem `Dialog`/`Drawer`: modo escuro com `Switch`, opção de seguir sistema e acesso às preferências push. Persistir tema via provider existente e impedir flash/hidratação divergente.

**Aceite:** topo e navegação estáveis; menu acessível por teclado; papel menor conserva suas restrições; nenhuma tela reinicia sidebar ao filtrar.

## 9P.3 — Carregamento por região e filtros instantâneos

**Alterar:** `src/app/{admin,aluno,responsavel}/loading.tsx`, `src/components/shared/page-skeleton.tsx`, `metric-card.tsx`, `list-pagination.tsx`, páginas de listagem e respectivos serviços.
**Criar:** `src/components/shared/metric-value-skeleton.tsx`, `table-body-skeleton.tsx`, `src/hooks/use-query-filters.ts`.

- [x] Separar título, rótulos e controles síncronos das regiões assíncronas. Colocar `Suspense` ao redor de componentes que fazem a consulta; aguardar tudo na página antes da boundary impede streaming útil.
- [x] Métrica mantém ícone, rótulo e dimensões; somente valor fica em skeleton. Tabela mantém cabeçalho e filtros; fallback ocupa o corpo com altura reservada.
- [x] Remover uso de `PageSkeleton` genérico nas interações internas. No primeiro acesso, renderizar estrutura específica da rota, sem sessão ou dados privados fictícios.
- [x] Usar URL como fonte dos filtros, navegação cliente com `router.replace`, `scroll: false` e transição; selects atualizam imediatamente, texto usa debounce de aproximadamente 300 ms.
- [x] Resetar página ao mudar filtro, preservar demais parâmetros, limpar corretamente e restaurar filtros ao voltar/avançar.
- [x] Durante revalidação, manter resultados anteriores com indicador local e `aria-busy`; no carregamento inicial, usar skeleton local. Evitar alternância em branco a cada tecla.
- [x] Chaves de loading dependem apenas dos filtros da região. Buscar aluno/status não deve bloquear métricas mensais independentes; mudar mês atualiza valores e tabela quando ambos dependem dele.
- [x] Revalidar somente dados afetados após ações; modal com erro preserva entradas e permanece aberto. Fechar e notificar apenas após sucesso.
- [x] Consultas compartilhadas devem ser deduplicadas no escopo da requisição; não criar uma chamada completa por indicador nem cache global que misture perfis.

**Aceite:** em rede lenta, filtros não substituem título/sidebar/métricas não relacionadas; foco e rolagem permanecem; última pesquisa vence respostas anteriores.

## 9P.4 — Visões gerais úteis e administração de contas

**Alterar:** `src/app/admin/page.tsx`, `src/app/aluno/page.tsx`, `src/app/responsavel/page.tsx`, `src/components/dashboard/phase-one-panel.tsx`.
**Criar:** `src/features/dashboard/overview-service.ts`, componentes por perfil nesse módulo, `src/app/admin/alunos/acessos/page.tsx` e seletor de alunos menores.

- [x] Substituir `PhaseOnePanel`; remover mensagens provisórias de infraestrutura.
- [x] Professor: aulas de hoje com Abrir chamada, matrículas aguardando revisão, comprovantes pendentes, recebido no mês, valor em atraso e próximo exame. Cada bloco leva à tarefa correspondente.
- [x] Aluno: próxima aula real, faixa atual, frequência no mês, pendência de matrícula/contrato, próximo vencimento quando permitido e último aviso não lido.
- [x] Responsável: resumo por dependente com avatar, próxima aula, matrícula e cobrança pertinente, preservando contexto do filho.
- [x] Não exibir XP inventado ou links da Fase 10 ainda indisponíveis. Distinguir horário recorrente previsto de aula efetivamente criada.
- [x] Mover transição de conta para Alunos → Acessos. Seletor pesquisável carrega menores do banco, pagina resultados e mostra nome/turma; e-mail é informado pelo professor. ID fica interno.
- [x] Revalidar elegibilidade e autorização no servidor e apresentar consequência da troca de acesso antes da confirmação; preservar regras de vínculo familiar existentes.

**Aceite:** nenhuma configuração aleatória na visão geral; indicadores correspondem a dados reais; falha em um bloco não elimina os demais.

### Checklist de análise por tela (critérios do curso)

Aplicar a cada dashboard alterado antes de marcar concluído:

| Tela | Hierarquia (o mais importante tem mais destaque?) | Estrutura invisível (conteúdo > containers?) | Propósito (cada elemento tem função clara?) |
| --- | --- | --- | --- |
| Professor | Tarefas pendentes (matrículas, comprovantes) devem ter mais destaque que métricas informativas | Remover Card "Próximos passos" se os links forem sempre os mesmos — se não é contextual, é ruído | Gráfico de tendência não responde pergunta operacional; mover para relatório |
| Aluno | Próxima aula e faixa são a informação principal — devem liderar visualmente | "Tudo em dia" não pode estar no mesmo nível visual que uma dívida em aberto | Link "Cadastrar dependente" tem propósito mas pode confundir no contexto do treino |
| Responsável | Dependente selecionado + suas pendências — sem mistura entre irmãos | Avatar com foto diferencia irmãos; sem foto, a tela é ambígua | Resumo só mostra dados que levam a uma ação; dados decorativos são ruído |

## 9P.5 — Financeiro do professor, aluno e responsável

**Alterar:** `src/features/billing/report-service.ts`, `components/billing-table.tsx`, `components/payer-billing.tsx`, `src/app/admin/financeiro/page.tsx`, `configuracoes/page.tsx`, `src/app/actions/billing.ts` e páginas financeiras dos pagadores.
**Criar:** `src/features/billing/components/billing-filters.tsx`, `payer-billing-table.tsx`, `pix-settings-dialog.tsx`, `payment-proof-dialog.tsx`.

- [x] Professor: indicadores Recebido no mês, A receber, Em atraso e Comprovantes para conferir, com contagem de alunos/pagamentos explicitada. Distinguir recebimento por data de pagamento de cobrança por competência; não rotular soma filtrada como total geral.
- [x] Retirar gráfico de tendência da área principal. Priorizar fila de conferência e cobrança; só reintroduzir gráfico em relatório com pergunta operacional definida.
- [x] Tabela com avatar privado, nome, cobrança, vencimento em pt-BR, valor em reais, estado e ação. Buscar fotos em lote dos alunos da página e respeitar permissões.
- [x] Pagador: tabela desktop com Todos, Em aberto, Em análise, Pagos e Cancelados, período, busca e paginação. No celular usar linhas compactas ou tabela adaptada, sem formulário repetido por cobrança.
- [x] Abrir detalhe, PIX e envio de comprovante em ação contextual `Dialog`/`Drawer`.
- [x] Configurar PIX em modal da página financeira; remover link dedicado da sidebar, redirecionar URL antiga para a página com modal aberto e ajustar retorno da action para manter filtros.
- [x] Desacoplar resumo e listagem em consultas adequadas; evitar carregar todas as cobranças/fotos para mostrar vinte linhas. Total e paginação devem refletir conjunto completo autorizado.
- [x] Exportação respeita filtros e continua disponível durante navegação da tabela.

**Aceite:** filtrar pagos/em aberto funciona nas duas áreas; avatar tem fallback; PIX salva sem sair da página; nenhum valor muda de reais para centavos na entrada.

## 9P.6 — Frequência como calendário

**Alterar:** `src/features/classes/attendance-history-service.ts`, `components/attendance-history.tsx` e páginas de frequência do aluno/dependente.
**Criar:** `src/features/classes/components/attendance-calendar.tsx`, `attendance-day-details.tsx`.

- [x] Consultar aulas concretas do mês e vínculos válidos naquela data, além das chamadas; o serviço atual só retorna aulas com registro de presença.
- [x] Usar `Calendar` do projeto com marcadores: check para presença, indicador distinto para falta, justificada, aula prevista e cancelamento. Nunca transformar ausência de chamada em falta.
- [x] Clique no dia mostra turma, horário e estado; permitir múltiplas aulas no mesmo dia. Desktop combina calendário amplo e detalhes laterais; celular usa agenda abaixo ou drawer.
- [x] Navegação mensal atualiza calendário e resumo localmente. Rótulos acessíveis incluem data, quantidade de aulas e situação.
- [x] Resumo deriva do mesmo período e mantém a regra existente de frequência. Datas de negócio não devem mudar de dia por fuso.

**Aceite:** comparar calendário com chamada real; cobrir mês vazio, cancelamento, transferência e dia com duas aulas.

## 9P.7 — Matrícula, turmas e exames

**Alterar:** `src/features/students/components/enrollment-workspace.tsx`, `enrollment-form.tsx`, `review-panel.tsx`, `src/features/classes/components/class-manager.tsx`, `src/app/admin/turmas/page.tsx`, `src/app/admin/exames/page.tsx` e actions correspondentes.

- [x] Remover limites de largura aninhados da matrícula. Utilizar grade desktop de 12 colunas: nome 6, CPF 3, nascimento 3; WhatsApp 4 e contato do responsável 4; contato de emergência 5, parentesco 3, telefone 4.
- [x] Organizar faixa/GUB, início e turma em linhas coerentes; vencimento compacto; endereço e detalhes de saúde recebem espaço maior por justificativa de conteúdo.
- [x] Manter blocos semânticos com `FieldSet`, título e `Separator`; usar cards apenas onde agrupamento/ação os justifique. Foto com Avatar e upload perto da identificação.
- [x] Progresso compacto junto ao título; navegação de seções acessível em ficha extensa. Não recolher campo inválido sem abrir seção e levar foco até ele.
- [x] Celular usa uma coluna; grade se adapta a 768/1280/1536 px e zoom. Barra de salvar não cobre último campo.
- [x] Turmas: lista em largura útil, botão Criar turma abre modal. Editar permanece contextual; Abrir turma leva às aulas/chamada, não a modal sobrecarregado.
- [x] Exames: botão Criar exame abre modal; evento existente mantém página de participantes/resultados e edição contextual. Formulários persistem se falharem e fecham após sucesso.

**Aceite:** campos pequenos não ocupam linha inteira no desktop, seções claras e validação íntegra; listas não são empurradas por formulários de criação permanentes.

## 9P.8 — Avisos, indicador e preferências reais

**Alterar:** `src/app/avisos/page.tsx`, `src/features/notifications/notification-service.ts`, `push-service.ts`, `types.ts`, `components/announcement-form.tsx`, `components/push-permission-card.tsx`, `src/app/actions/notifications.ts`, `src/components/dashboard/portal-shell.tsx` e sidebar.
**Criar:** `src/features/notifications/preferences-service.ts`, `components/inbox-list.tsx`, `components/notification-indicator.tsx`, `components/notification-preferences.tsx`.
**Infraestrutura:** declarar preferências em `src/lib/appwrite/ids.ts` e `scripts/appwrite/schema.ts` antes de aplicar.

- [x] Caixa de entrada em lista: ícone, título, prévia, data e ponto não lido. Filtros Todos/Não lidos e tipo; abrir detalhe sem card gigante por mensagem.
- [x] Professor tem botão Novo aviso em modal e separação Recebidos/Enviados; lista enviada consulta autoria, não assume que professor recebeu a própria publicação.
- [x] Remover coluna permanente de configuração push e usar largura disponível. Preferências ficam no menu da conta.
- [x] Contagem de não lidos vem de consulta autorizada do conjunto completo, não apenas página atual. Atualizar após leitura/publicação e ao recuperar foco; sem recarregar shell.
- [x] Sino faz movimento discreto por poucos ciclos ao chegar novo aviso, sem repetição infinita; ponto permanece até leitura e possui descrição acessível. Respeitar movimento reduzido e não animar a cada render.
- [x] Persistir preferências por conta/categoria para Comunicados, Financeiro e Sistema conforme papel. Categorias da Fase 10 só aparecem quando implementadas.
- [x] Distinguir preferência da conta, permissão do navegador e inscrição deste dispositivo. Desativar categoria interrompe push daquela categoria, mantendo caixa interna; revogar dispositivo não modifica outros dispositivos.
- [x] Backend e Functions de envio devem consultar preferências antes de transmitir; defaults explícitos preservam comportamento das contas existentes. Não implementar switches meramente visuais.
- [x] Marcar como lido somente ao abrir efetivamente a mensagem ou por ação explícita, nunca por hover/prefetch.

**Aceite:** leitura remove ponto em todas as regiões, switches persistem e afetam entrega, menores não recebem opções financeiras indevidas.

## 9P.9 — Homologação visual e funcional (Baseline)

**Criar:** `tests/e2e/product-experience.spec.ts`, `docs/ux/product-review.md`.

- [x] Capturar antes/depois de admin, aluno e responsável em 360, 768, 1280 e 1536 px, nos dois temas.
- [x] Validar navegação por teclado, foco de modal, contraste e zoom 200%; datas/status não dependem só de cor.
- [x] Em rede lenta, observar primeira carga e filtro: shell/título/controles permanecem; apenas região de dados mostra espera. Medir deslocamento com DevTools e registrar resultado, sem declarar ausência de layout shift apenas pela existência de skeleton.
- [x] Fluxos prioritários: pesquisar aluno, confirmar pagamento, enviar comprovante, editar PIX, criar turma/exame, salvar matrícula, navegar frequência e ler aviso.
- [x] Testes de comportamento para URL dos filtros, restauração por voltar, resultado vazio, falha de rede, rascunho em modal e isolamento entre famílias.
- [x] Testes de dados para totais financeiros, fotos autorizadas, calendário sem chamada e preferências de notificação no envio.
- [x] Rodar `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` e Playwright com usuários de teste. Para schema, `npm run infra:plan` antes de qualquer aplicação.
- [x] Registrar pendências e evidências, atualizar checkboxes da Fase 9 apenas com validação.

---

## 9P.10 — Navegação móvel nativa e gestos (Concluído)

**Alterar:** `src/components/dashboard/dashboard-shell.tsx`, `src/features/students/components/enrollment-form.tsx`, `src/features/classes/components/attendance-sheet.tsx`.
**Criar:** `src/components/dashboard/mobile-bottom-nav.tsx`, `src/components/dashboard/mobile-gesture-detector.tsx`, testes unitários associados.

- [x] Barra inferior fixa (`MobileBottomNav`) visível apenas no mobile (`md:hidden`) com abas dinâmicas por papel: Início, Treinos/Turmas, Dependentes/Financeiro, Avisos (com badge de não lidos) e Menu lateral.
- [x] Detecção de gesto swipe da borda esquerda (`<= 40px`, horizontal > vertical * 1.3, <= 600ms) para abrir a gaveta lateral em dispositivos touch, e swipe para a esquerda para fechar (`MobileGestureDetector`).
- [x] Espaçamento inferior global (`pb-20 md:pb-6`) e elevação de barras fixas (`sticky bottom-20 md:bottom-3`) para evitar sobreposição de elementos na base da tela.
- [x] Submenus colapsáveis na sidebar para Matrículas, Turmas, Financeiro, Contratos e acesso direto e destacado para Responsáveis (`/responsavel`).

---

## 9P.11 — Inventário Completo e Cronograma de Revisão de UI/UX (Tela a Tela e Componente a Componente)

Para garantir que a aplicação atinja um padrão de excelência de produto em todas as suas vertentes (desktop e prioritariamente mobile), sem atalhos visuais e sem componentes esquecidos, este cronograma estabelece o checklist de revisão sistemática de **todas as telas e componentes do projeto** antes do avanço para a Fase 10.

### Diretrizes de Avaliação por Tela e Componente
Cada tela e componente listado abaixo deve ser auditado e refinado seguindo os seguintes critérios:
1. **Hierarquia Visual e Foco:** A informação mais crítica lidera a tela; ações primárias são evidentes; ruído e repetições são eliminados.
2. **Mobile First & Touch Targets:** Alvos de toque mínimos de 44×44 px; nada quebra ou requer rolagem horizontal em viewports estreitos (360px a 430px); formulários e barras de ação ficam desimpedidos da barra de navegação inferior.
3. **Estrutura Invisível:** Substituir cards aninhados e molduras desnecessárias por tipografia forte, respiro e separadores sutis.
4. **Linguagem Natural de Taekwondo:** Termos da academia em português claro ("Turmas", "Treinos", "Avisos", "Graduação", "Faixas", "Dojô", "Mensalidades").
5. **Feedback Imediato & Tratamento de Erros:** Estados de carregamento locais (skeletons específicos), mensagens de erro acionáveis junto aos campos, toasts confirmatórios e prevenção de duplo clique.

---

### Módulo 1: Autenticação, Onboarding e Entrada Pública
- [x] **1.1 Tela de Entrada / Login (`src/app/page.tsx`, `src/components/auth/auth-entry.tsx`, `login-card.tsx`, `register-card.tsx`):**
  - [x] Alternador de modo Adulto / Menor em destaque tátil ergonômico no topo.
  - [x] Campos de e-mail e senha com altura mínima de 44px e preenchimento automático de credenciais seguro (`autoComplete`).
  - [x] Tratamento amigável de erro de credenciais (ex: senha incorreta ou usuário não encontrado) sem recarregar a tela.
  - [x] Link visível e acessível para "Esqueci minha senha" e suporte a retorno limpo de erros via URL (`?error=...`).
- [x] **1.2 Recuperação de Senha (`src/app/recuperar/page.tsx`, `src/app/recuperar/confirmar/page.tsx`):**
  - [x] Tela de solicitação de redefinição com instrução clara de recebimento de e-mail.
  - [x] Tela de confirmação com validação de força da nova senha e retorno direto para login com toast de sucesso.

---

### Módulo 2: Turmas, Grade e Chamada Operacional
- [ ] **2.1 Gestão de Turmas do Professor (`src/app/admin/turmas/page.tsx`, `src/features/classes/components/class-manager.tsx`):**
  - [ ] Cards de turmas com chips de dias da semana (ex: Seg/Qua/Sex), faixa etária, horário e lotação atual.
  - [ ] Modal responsivo "Criar turma" / "Editar turma" com validação de horários de início e término.
  - [ ] No mobile, botão de ação "Criar turma" fixo ou acessível no topo, sem empurrar a lista de turmas ativas.
- [ ] **2.2 Detalhe da Turma e Lista de Alunos (`src/app/admin/turmas/[classId]/page.tsx`, `src/features/classes/components/class-status-toggle.tsx`, `class-attendance-summary.tsx`):**
  - [ ] Visualização limpa da lista de alunos matriculados com fotos, faixas atuais e frequência média.
  - [ ] Alternador de status da turma (ativa/inativa) com confirmação clara de impacto.
  - [ ] Histórico de aulas ministradas com atalho para abrir/revisar cada chamada.
- [ ] **2.3 Realização da Chamada (`src/app/admin/turmas/[classId]/aulas/[lessonId]/page.tsx`, `src/features/classes/components/attendance-sheet.tsx`):**
  - [ ] Otimização para uso com uma mão pelo professor no tatame (alvos grandes para Presente / Falta / Justificada).
  - [ ] Botão de "Marcar todos presentes" para agilidade operacional.
  - [ ] Barra flutuante de salvar chamada com clearance garantido sobre a bottom nav no celular (`sticky bottom-20 md:bottom-3`).
  - [ ] Campo de justificativa de auditoria exigido apenas ao corrigir chamadas já concluídas.

---

### Módulo 3: Frequência e Calendário (Aluno & Responsável)
- [ ] **3.1 Calendário de Frequência do Aluno (`src/app/aluno/frequencia/page.tsx`, `src/features/classes/components/attendance-history.tsx`):**
  - [ ] Calendário visual com adaptação perfeita em telas de 360px (células legíveis sem sobreposição dos indicadores de status).
  - [ ] Legenda compacta com ícones e cores acessíveis (Presença, Falta, Justificada, Prevista, Cancelada).
  - [ ] Ao tocar em um dia, exibir gaveta (`Drawer`) no mobile ou painel lateral no desktop com horário e status da aula.
  - [ ] Alternância entre meses rápida via URL sem recarregar o layout do shell.
- [ ] **3.2 Frequência do Dependente (`src/app/responsavel/dependentes/[profileId]/frequencia/page.tsx`):**
  - [ ] Mesma consistência visual de calendário, contextualizada com o nome e foto do dependente selecionado.

---

### Módulo 4: Gestão Financeira, PIX e Pagamentos
- [ ] **4.1 Painel Financeiro do Professor (`src/app/admin/financeiro/page.tsx`, `src/features/billing/components/billing-table.tsx`, `billing-filters.tsx`, `charge-actions.tsx`):**
  - [ ] Métricas de fluxo de caixa claras no topo: Recebido no mês, A receber, Em atraso, Comprovantes pendentes.
  - [ ] Fila prioritária de comprovantes aguardando conferência com modal/drawer de visualização do anexo e aprovação em 1 clique.
  - [ ] Tabela com versão adaptada para cards no mobile, busca por nome do aluno e filtro por competência.
- [ ] **4.2 Configurações de PIX (`src/app/admin/financeiro/configuracoes/page.tsx`, `src/features/billing/components/pix-settings-dialog.tsx`):**
  - [ ] Formulário modal para definir chave PIX (CPF/CNPJ, e-mail, telefone ou aleatória), nome do beneficiário e instruções.
  - [ ] Pré-visualização do QR Code e teste da cópia da chave.
- [ ] **4.3 Exportação Financeira (`src/app/admin/financeiro/exportar/page.tsx`):**
  - [ ] Filtro de período e seleção de formato (CSV/planilha) com indicação do total de registros a exportar.
- [ ] **4.4 Financeiro do Aluno / Responsável (`src/app/aluno/financeiro/page.tsx`, `src/app/responsavel/dependentes/[profileId]/financeiro/page.tsx`, `src/features/billing/components/payer-billing-view.tsx`, `copy-pix-button.tsx`):**
  - [ ] Abas de filtro: Em aberto, Em análise, Pagos, Todos.
  - [ ] Card de pagamento direto com chave PIX copia-e-cola e instruções da academia.
  - [ ] Envio fácil de comprovante (foto do comprovante ou PDF) via gaveta inferior móvel (`Drawer`).
  - [ ] Feedback visual imediato quando o comprovante for enviado e estiver em análise pelo professor.

---

### Módulo 5: Contratos e Assinatura Digital
- [ ] **5.1 Visão Geral de Contratos no Admin (`src/app/admin/contratos/page.tsx`):**
  - [ ] Lista de contratos emitidos com status (Pendente de assinatura, Assinado, Cancelado, Expirado).
  - [ ] Ação rápida para visualizar PDF gerado, reenviar solicitação ou registrar cancelamento.
- [ ] **5.2 Modelo de Contrato da Academia (`src/app/admin/contratos/modelo/page.tsx`):**
  - [ ] Editor dos termos de adesão e regras do dojang com inserção de tags dinâmicas ({nome_aluno}, {valor_mensalidade}, etc.).
  - [ ] Pré-visualização responsiva do documento formatado.
- [ ] **5.3 Fila de Cancelamentos e Rescisões (`src/app/admin/contratos/cancelamentos/page.tsx`):**
  - [ ] Lista de pedidos de encerramento com motivo informado pelo aluno/responsável.
  - [ ] Modal de homologação do cancelamento com cálculo de eventuais pendências e data de encerramento.
- [ ] **5.4 Assinatura Digital do Aluno e Responsável (`src/app/aluno/contratos/page.tsx`, `src/app/aluno/contratos/[contractId]/page.tsx`, `src/features/contracts/components/signature-pad.tsx`, páginas do responsável):**
  - [ ] Visualização confortável do contrato antes da assinatura em qualquer dispositivo.
  - [ ] Componente `SignaturePad`: desenho da assinatura suave no toque touch com alta resolução, botões "Limpar" e "Confirmar assinatura".
  - [ ] Opção de assinar digitalmente com carimbo de data/hora, IP e hash do documento.
  - [ ] Download imediato do contrato assinado em PDF.

---

### Módulo 6: Exames de Faixa e Graduação
- [ ] **6.1 Lista de Exames de Faixa (`src/app/admin/exames/page.tsx`):**
  - [ ] Cards dos próximos exames com data, local, taxa e quantidade de inscritos.
  - [ ] Modal "Criar novo exame de faixa" com campos de data, turmas elegíveis e avaliador.
- [ ] **6.2 Condução do Exame e Avaliação (`src/app/admin/exames/[eventId]/page.tsx`):**
  - [ ] Tabela/cards de candidatos com faixa atual e próxima faixa (GUB/Dan) destacada com as cores oficiais de Taekwondo.
  - [ ] Alternador de resultado Aprovado / Reprovado e notas de avaliação por disciplina (Kyorugui, Poomsae, Quebramento).
  - [ ] Botão de homologação em lote que atualiza automaticamente a graduação dos alunos no sistema.
- [ ] **6.3 Visualização da Graduação pelo Aluno (`src/features/students/components/graduation-card.tsx`, `belt-badge.tsx`):**
  - [ ] Card no dashboard do aluno destacando sua faixa atual, tempo de treino e requisitos para o próximo exame.

---

### Módulo 7: Gestão de Matrículas e Dependentes (Admin & Família)
- [ ] **7.1 Fila de Matrículas no Admin (`src/app/admin/matriculas/page.tsx`, `src/features/students/components/enrollment-table.tsx`, `enrollment-filters.tsx`):**
  - [ ] Abas por situação: Rascunhos, Aguardando análise, Aguardando assinatura, Ativas, Pausadas.
  - [ ] No mobile, cards responsivos com foto do aluno, faixa, turma e botão direto de "Analisar".
- [ ] **7.2 Acesso e Transição de Alunos Menores (`src/app/admin/matriculas/acessos/page.tsx`, `src/features/students/components/promote-minor-dialog.tsx`):**
  - [ ] Lista de alunos que atingiram a maioridade com ação de liberar acesso independente por e-mail próprio.
- [ ] **7.3 Gestão Familiar e Dependentes (`src/app/responsavel/dependentes/page.tsx`, `src/app/responsavel/dependentes/[profileId]/matricula/page.tsx`):**
  - [ ] Painel do responsável com cartões de cada dependente, indicando status de matrícula, próxima aula e situação financeira.
  - [ ] Fluxo simplificado de "Adicionar dependente" preenchendo automaticamente os dados do responsável.

---

### Módulo 8: Sistema, Preferências e Configurações
- [ ] **8.1 Painel do Sistema (`src/app/admin/sistema/page.tsx`, `src/components/appwrite/appwrite-connection-check.tsx`):**
  - [ ] Indicador de integridade dos bancos e buckets do Appwrite, status dos backups automáticos e jobs agendados.
  - [ ] Layout limpo sem termos excessivamente técnicos voltados a suporte.
- [ ] **8.2 Configurações de Conta e Notificações (`src/app/configuracoes/page.tsx`, `src/components/dashboard/account-menu.tsx`, `src/features/notifications/components/notification-preferences.tsx`, `push-permission-card.tsx`):**
  - [ ] Alternância de tema Claro / Escuro / Sistema com persistência imediata.
  - [ ] Gerenciamento de notificações push por categoria (Avisos, Mensalidades, Sistema) com feedback claro de permissão do navegador.
  - [ ] Acesso seguro de logout e alteração de senha.

---

## Resultado esperado

Todas as telas e componentes do sistema passam por um ciclo padronizado de validação visual e técnica, eliminando inconsistências estéticas e garantindo que o Ebener TKD App funcione de ponta a ponta como uma aplicação móvel moderna, fluida e eficiente para o professor, o aluno e a família.

