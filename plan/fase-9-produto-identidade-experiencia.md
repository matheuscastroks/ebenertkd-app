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

- [ ] Reproduzir o erro em `npm run dev`, inspecionar cabeçalho efetivo e verificar se proxy/hosting adicionam uma segunda CSP.
- [ ] Condicionar `unsafe-eval` a `production === false` em `script-src`; manter produção sem essa permissão. Não desabilitar a política inteira.
- [ ] Verificar HMR e conexão WebSocket local; abrir apenas a origem necessária no desenvolvimento se houver bloqueio comprovado.
- [ ] Testar explicitamente presença de `unsafe-eval` em dev e ausência em produção; manter testes existentes de framing e HSTS.
- [ ] Reiniciar o servidor após alteração de configuração e verificar console dev e build servido em produção.

Achado adicional para a Fase 10: `Permissions-Policy` atualmente contém `geolocation=()`. O check-in exigirá habilitação deliberada de `geolocation=(self)`; os vídeos precisarão de CSP específica para embed. Registrar essa dependência, sem antecipar permissões nesta correção.

**Aceite:** reprodução deixa de ocorrer em dev, política de produção não recebe `unsafe-eval`.

## 9P.1 — Marca, tokens e linguagem

**Alterar:** `src/app/globals.css`, `src/app/layout.tsx`, `src/app/manifest.ts` e textos nas páginas/componentes.
**Criar:** `docs/ux/brand-reference.md`, `docs/ux/content-guidelines.md`, `src/components/shared/brand-mark.tsx`.

- [x] Identificar URL, fontes e tokens no HTML/CSS público; registrar valores e adaptações em `docs/ux/brand-reference.md`.
- [ ] Completar inspeção visual do cabeçalho, logo, botões e estados e registrar capturas.
- [ ] Montar matriz origem → token → uso: primary/foreground, accent, background, card, muted, border, ring, sidebar e estados ativos. Separar cores de marca de sucesso, atraso e erro.
- [ ] Definir pares claros/escuros e validar contraste AA. Não apenas inverter cores nem deixar classe `.dark` sem variáveis.
- [ ] Auditar aliases `@theme inline`, tokens de sidebar e variante dark segundo a configuração instalada. Adotar Chakra Petch em marca/títulos e Inter em controles/tabelas; remover Poppins/Geist redundantes.
- [ ] Padronizar nome público como Ebener TKD, conforme referência; manter IDs técnicos e integrações estáveis.
- [ ] Inspecionar a logo AVIF em tamanho real antes de usá-la; manter proporção, dimensões reservadas e fundo adequado nos dois temas. Conferir favicon/manifest e fallback compacto da sidebar.
- [ ] Padronizar ícones Lucide: 16–20 px em navegação/ações, 20–24 px em indicadores; ícones decorativos ocultos de leitores de tela e botões sem texto com nome acessível.
- [ ] Revisar linguagem de login, cadastro, dashboards, finanças, matrícula, turmas, exames, contratos, avisos e vazios.

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

## 9P.2 — Estrutura, sidebar e conta

**Alterar:** `dashboard-shell.tsx`, `portal-shell.tsx`, `app-sidebar.tsx`, `active-sidebar.tsx` em `src/components/dashboard/`, `src/lib/navigation/routes.ts` e testes associados.
**Criar:** `src/components/dashboard/account-menu.tsx`, `src/components/shared/page-heading.tsx`, `src/components/settings/preferences-dialog.tsx`.

- [ ] Manter `SidebarProvider` no layout persistente. Posicionar `SidebarTrigger` na barra superior do conteúdo, à esquerda do breadcrumb, em posição idêntica nas páginas.
- [ ] Retirar o header em card; usar h1, descrição curta e ações alinhadas, sem duplicar o título em outro container.
- [ ] Padronizar gutter de 16 px no celular, 24 px no tablet e 32 px no desktop; área principal `w-full min-w-0`, sem limite global artificial. Textos de contrato podem manter largura confortável de leitura.
- [ ] Dar respiro de 20–24 px ao topo da sidebar, usar logo e nome da academia, retirar badge PWA e rótulos de papel repetidos.
- [ ] Segmentar aluno: Geral (Visão geral, Avisos); Treinos (Frequência); Cadastro (Matrícula, Contratos); Financeiro quando permitido. Responsável mantém dependente selecionado e acesso familiar; admin conserva agrupamento operacional.
- [ ] Usar `SidebarGroup`, `SidebarGroupLabel`, `SidebarSeparator` e submenus apenas para hierarquia real; comportamento consistente recolhido e no celular.
- [ ] Transformar perfil no rodapé em `DropdownMenu` acionado por clique/toque: Configurações, Notificações e Sair. Não exigir clique direito. Evitar botão Sair duplicado no cabeçalho.
- [ ] Configurações abrem `Dialog`/`Drawer`: modo escuro com `Switch`, opção de seguir sistema e acesso às preferências push. Persistir tema via provider existente e impedir flash/hidratação divergente.

**Aceite:** topo e navegação estáveis; menu acessível por teclado; papel menor conserva suas restrições; nenhuma tela reinicia sidebar ao filtrar.

## 9P.3 — Carregamento por região e filtros instantâneos

**Alterar:** `src/app/{admin,aluno,responsavel}/loading.tsx`, `src/components/shared/page-skeleton.tsx`, `metric-card.tsx`, `list-pagination.tsx`, páginas de listagem e respectivos serviços.
**Criar:** `src/components/shared/metric-value-skeleton.tsx`, `table-body-skeleton.tsx`, `src/hooks/use-query-filters.ts`.

- [ ] Separar título, rótulos e controles síncronos das regiões assíncronas. Colocar `Suspense` ao redor de componentes que fazem a consulta; aguardar tudo na página antes da boundary impede streaming útil.
- [ ] Métrica mantém ícone, rótulo e dimensões; somente valor fica em skeleton. Tabela mantém cabeçalho e filtros; fallback ocupa o corpo com altura reservada.
- [ ] Remover uso de `PageSkeleton` genérico nas interações internas. No primeiro acesso, renderizar estrutura específica da rota, sem sessão ou dados privados fictícios.
- [ ] Usar URL como fonte dos filtros, navegação cliente com `router.replace`, `scroll: false` e transição; selects atualizam imediatamente, texto usa debounce de aproximadamente 300 ms.
- [ ] Resetar página ao mudar filtro, preservar demais parâmetros, limpar corretamente e restaurar filtros ao voltar/avançar.
- [ ] Durante revalidação, manter resultados anteriores com indicador local e `aria-busy`; no carregamento inicial, usar skeleton local. Evitar alternância em branco a cada tecla.
- [ ] Chaves de loading dependem apenas dos filtros da região. Buscar aluno/status não deve bloquear métricas mensais independentes; mudar mês atualiza valores e tabela quando ambos dependem dele.
- [ ] Revalidar somente dados afetados após ações; modal com erro preserva entradas e permanece aberto. Fechar e notificar apenas após sucesso.
- [ ] Consultas compartilhadas devem ser deduplicadas no escopo da requisição; não criar uma chamada completa por indicador nem cache global que misture perfis.

**Aceite:** em rede lenta, filtros não substituem título/sidebar/métricas não relacionadas; foco e rolagem permanecem; última pesquisa vence respostas anteriores.

## 9P.4 — Visões gerais úteis e administração de contas

**Alterar:** `src/app/admin/page.tsx`, `src/app/aluno/page.tsx`, `src/app/responsavel/page.tsx`, `src/components/dashboard/phase-one-panel.tsx`.
**Criar:** `src/features/dashboard/overview-service.ts`, componentes por perfil nesse módulo, `src/app/admin/alunos/acessos/page.tsx` e seletor de alunos menores.

- [ ] Substituir `PhaseOnePanel`; remover mensagens provisórias de infraestrutura.
- [ ] Professor: aulas de hoje com Abrir chamada, matrículas aguardando revisão, comprovantes pendentes, recebido no mês, valor em atraso e próximo exame. Cada bloco leva à tarefa correspondente.
- [ ] Aluno: próxima aula real, faixa atual, frequência no mês, pendência de matrícula/contrato, próximo vencimento quando permitido e último aviso não lido.
- [ ] Responsável: resumo por dependente com avatar, próxima aula, matrícula e cobrança pertinente, preservando contexto do filho.
- [ ] Não exibir XP inventado ou links da Fase 10 ainda indisponíveis. Distinguir horário recorrente previsto de aula efetivamente criada.
- [ ] Mover transição de conta para Alunos → Acessos. Seletor pesquisável carrega menores do banco, pagina resultados e mostra nome/turma; e-mail é informado pelo professor. ID fica interno.
- [ ] Revalidar elegibilidade e autorização no servidor e apresentar consequência da troca de acesso antes da confirmação; preservar regras de vínculo familiar existentes.

**Aceite:** nenhuma configuração aleatória na visão geral; indicadores correspondem a dados reais; falha em um bloco não elimina os demais.

## 9P.5 — Financeiro do professor, aluno e responsável

**Alterar:** `src/features/billing/report-service.ts`, `components/billing-table.tsx`, `components/payer-billing.tsx`, `src/app/admin/financeiro/page.tsx`, `configuracoes/page.tsx`, `src/app/actions/billing.ts` e páginas financeiras dos pagadores.
**Criar:** `src/features/billing/components/billing-filters.tsx`, `payer-billing-table.tsx`, `pix-settings-dialog.tsx`, `payment-proof-dialog.tsx`.

- [ ] Professor: indicadores Recebido no mês, A receber, Em atraso e Comprovantes para conferir, com contagem de alunos/pagamentos explicitada. Distinguir recebimento por data de pagamento de cobrança por competência; não rotular soma filtrada como total geral.
- [ ] Retirar gráfico de tendência da área principal. Priorizar fila de conferência e cobrança; só reintroduzir gráfico em relatório com pergunta operacional definida.
- [ ] Tabela com avatar privado, nome, cobrança, vencimento em pt-BR, valor em reais, estado e ação. Buscar fotos em lote dos alunos da página e respeitar permissões.
- [ ] Pagador: tabela desktop com Todos, Em aberto, Em análise, Pagos e Cancelados, período, busca e paginação. No celular usar linhas compactas ou tabela adaptada, sem formulário repetido por cobrança.
- [ ] Abrir detalhe, PIX e envio de comprovante em ação contextual `Dialog`/`Drawer`.
- [ ] Configurar PIX em modal da página financeira; remover link dedicado da sidebar, redirecionar URL antiga para a página com modal aberto e ajustar retorno da action para manter filtros.
- [ ] Desacoplar resumo e listagem em consultas adequadas; evitar carregar todas as cobranças/fotos para mostrar vinte linhas. Total e paginação devem refletir conjunto completo autorizado.
- [ ] Exportação respeita filtros e continua disponível durante navegação da tabela.

**Aceite:** filtrar pagos/em aberto funciona nas duas áreas; avatar tem fallback; PIX salva sem sair da página; nenhum valor muda de reais para centavos na entrada.

## 9P.6 — Frequência como calendário

**Alterar:** `src/features/classes/attendance-history-service.ts`, `components/attendance-history.tsx` e páginas de frequência do aluno/dependente.
**Criar:** `src/features/classes/components/attendance-calendar.tsx`, `attendance-day-details.tsx`.

- [ ] Consultar aulas concretas do mês e vínculos válidos naquela data, além das chamadas; o serviço atual só retorna aulas com registro de presença.
- [ ] Usar `Calendar` do projeto com marcadores: check para presença, indicador distinto para falta, justificada, aula prevista e cancelamento. Nunca transformar ausência de chamada em falta.
- [ ] Clique no dia mostra turma, horário e estado; permitir múltiplas aulas no mesmo dia. Desktop combina calendário amplo e detalhes laterais; celular usa agenda abaixo ou drawer.
- [ ] Navegação mensal atualiza calendário e resumo localmente. Rótulos acessíveis incluem data, quantidade de aulas e situação.
- [ ] Resumo deriva do mesmo período e mantém a regra existente de frequência. Datas de negócio não devem mudar de dia por fuso.

**Aceite:** comparar calendário com chamada real; cobrir mês vazio, cancelamento, transferência e dia com duas aulas.

## 9P.7 — Matrícula, turmas e exames

**Alterar:** `src/features/students/components/enrollment-workspace.tsx`, `enrollment-form.tsx`, `review-panel.tsx`, `src/features/classes/components/class-manager.tsx`, `src/app/admin/turmas/page.tsx`, `src/app/admin/exames/page.tsx` e actions correspondentes.

- [ ] Remover limites de largura aninhados da matrícula. Utilizar grade desktop de 12 colunas: nome 6, CPF 3, nascimento 3; WhatsApp 4 e contato do responsável 4; contato de emergência 5, parentesco 3, telefone 4.
- [ ] Organizar faixa/GUB, início e turma em linhas coerentes; vencimento compacto; endereço e detalhes de saúde recebem espaço maior por justificativa de conteúdo.
- [ ] Manter blocos semânticos com `FieldSet`, título e `Separator`; usar cards apenas onde agrupamento/ação os justifique. Foto com Avatar e upload perto da identificação.
- [ ] Progresso compacto junto ao título; navegação de seções acessível em ficha extensa. Não recolher campo inválido sem abrir seção e levar foco até ele.
- [ ] Celular usa uma coluna; grade se adapta a 768/1280/1536 px e zoom. Barra de salvar não cobre último campo.
- [ ] Turmas: lista em largura útil, botão Criar turma abre modal. Editar permanece contextual; Abrir turma leva às aulas/chamada, não a modal sobrecarregado.
- [ ] Exames: botão Criar exame abre modal; evento existente mantém página de participantes/resultados e edição contextual. Formulários persistem se falharem e fecham após sucesso.

**Aceite:** campos pequenos não ocupam linha inteira no desktop, seções claras e validação íntegra; listas não são empurradas por formulários de criação permanentes.

## 9P.8 — Avisos, indicador e preferências reais

**Alterar:** `src/app/avisos/page.tsx`, `src/features/notifications/notification-service.ts`, `push-service.ts`, `types.ts`, `components/announcement-form.tsx`, `components/push-permission-card.tsx`, `src/app/actions/notifications.ts`, `src/components/dashboard/portal-shell.tsx` e sidebar.
**Criar:** `src/features/notifications/preferences-service.ts`, `components/inbox-list.tsx`, `components/notification-indicator.tsx`, `components/notification-preferences.tsx`.
**Infraestrutura:** declarar preferências em `src/lib/appwrite/ids.ts` e `scripts/appwrite/schema.ts` antes de aplicar.

- [ ] Caixa de entrada em lista: ícone, título, prévia, data e ponto não lido. Filtros Todos/Não lidos e tipo; abrir detalhe sem card gigante por mensagem.
- [ ] Professor tem botão Novo aviso em modal e separação Recebidos/Enviados; lista enviada consulta autoria, não assume que professor recebeu a própria publicação.
- [ ] Remover coluna permanente de configuração push e usar largura disponível. Preferências ficam no menu da conta.
- [ ] Contagem de não lidos vem de consulta autorizada do conjunto completo, não apenas página atual. Atualizar após leitura/publicação e ao recuperar foco; sem recarregar shell.
- [ ] Sino faz movimento discreto por poucos ciclos ao chegar novo aviso, sem repetição infinita; ponto permanece até leitura e possui descrição acessível. Respeitar movimento reduzido e não animar a cada render.
- [ ] Persistir preferências por conta/categoria para Comunicados, Financeiro e Sistema conforme papel. Categorias da Fase 10 só aparecem quando implementadas.
- [ ] Distinguir preferência da conta, permissão do navegador e inscrição deste dispositivo. Desativar categoria interrompe push daquela categoria, mantendo caixa interna; revogar dispositivo não modifica outros dispositivos.
- [ ] Backend e Functions de envio devem consultar preferências antes de transmitir; defaults explícitos preservam comportamento das contas existentes. Não implementar switches meramente visuais.
- [ ] Marcar como lido somente ao abrir efetivamente a mensagem ou por ação explícita, nunca por hover/prefetch.

**Aceite:** leitura remove ponto em todas as regiões, switches persistem e afetam entrega, menores não recebem opções financeiras indevidas.

## 9P.9 — Homologação visual e funcional

**Criar:** `tests/e2e/product-experience.spec.ts`, `docs/ux/product-review.md`.

- [ ] Capturar antes/depois de admin, aluno e responsável em 360, 768, 1280 e 1536 px, nos dois temas.
- [ ] Validar navegação por teclado, foco de modal, contraste e zoom 200%; datas/status não dependem só de cor.
- [ ] Em rede lenta, observar primeira carga e filtro: shell/título/controles permanecem; apenas região de dados mostra espera. Medir deslocamento com DevTools e registrar resultado, sem declarar ausência de layout shift apenas pela existência de skeleton.
- [ ] Fluxos prioritários: pesquisar aluno, confirmar pagamento, enviar comprovante, editar PIX, criar turma/exame, salvar matrícula, navegar frequência e ler aviso.
- [ ] Testes de comportamento para URL dos filtros, restauração por voltar, resultado vazio, falha de rede, rascunho em modal e isolamento entre famílias.
- [ ] Testes de dados para totais financeiros, fotos autorizadas, calendário sem chamada e preferências de notificação no envio.
- [ ] Rodar `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` e Playwright com usuários de teste. Para schema, `npm run infra:plan` antes de qualquer aplicação.
- [ ] Registrar pendências e evidências, atualizar checkboxes da Fase 9 apenas com validação. Alterações de identidade seguem para Fase 10, substituindo sugestões estéticas que conflitem com a marca aprovada.

## Resultado esperado

Professor encontra o que precisa fazer hoje; aluno encontra próxima aula, frequência e pagamentos; responsável acompanha cada dependente. A marca aparece consistentemente no shell e nas ações, textos descrevem tarefas concretas e carregar dados não desmonta a interface.
