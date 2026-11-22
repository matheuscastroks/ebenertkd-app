# Sistema de ilustrações — Ebener TKD

Coleção criada com a ferramenta integrada de geração de imagens, usando obrigatoriamente os dois avatares de `public/` como referências. Os arquivos finais estão em `public/illustrations/`: cinco cenas de eventos, dez marcos de progresso, seis reconhecimentos e seis estados vazios.

## Direção e uso

- Preservar rostos simples, cabelos escuros, dobok branco, detalhes em carvão e paleta quente. Personagens aparecem nas cenas; os objetos protagonizam as conquistas.
- As imagens são decorativas: títulos, tipos, estados, datas, metas e ações continuam em texto. Nenhuma palavra ou número deve ser incorporado à arte.
- Eventos: 80 px no celular e 112 px a partir de `sm`, à esquerda do cabeçalho. No celular, data e local usam a largura abaixo; no desktop, ficam à direita da arte. Valores, ocupação e ações compartilham um rodapé compacto. Histórico administrativo: 64 px.
- Marcos e reconhecimentos: até 64 px, ao lado do título e estado; estados vazios: 112–144 px. As grades se adaptam à largura do texto e igualam a altura dos cards de cada linha, alinhando datas, progresso e ações pela base. No celular, cada card mantém sua altura natural. As miniaturas respeitam a largura disponível com texto ampliado.
- Conquistas não obtidas usam a mesma imagem suavizada e o rótulo “Em progresso”, mantendo porcentagem e contagem.
- Uma cena principal por página vazia. Ausências secundárias, filtros e avisos operacionais continuam compactos.
- Não vincular personagens ao gênero do usuário. Não substituir desenhos de faixas oficiais nem gráficos por ilustrações.

## Cobertura revisada

| Área | Aplicação ou decisão |
| --- | --- |
| Agenda administrativa | Arte por tipo nos próximos eventos; arte compacta nos passados; vazio ilustrado quando a agenda geral está vazia. Filtro sem resultado continua discreto. |
| Eventos de aluno, menor e responsável | Componentes compartilhados preservam inscrição, condições, valores e permissões. Cena por tipo nos próximos eventos; cadastro ausente e agenda vazia ilustrados. Histórico e inscrições mantêm a densidade atual. |
| Exames | Cena de entrega de faixa nos próximos exames; agenda e início da jornada nos vazios; resultados e cobrança preservados. |
| Conquistas | Dez artes por identificador estável, com alternativa pela métrica; seis artes pelo tipo de reconhecimento. Expositor vazio apenas onde ainda não há reconhecimentos. |
| Família | Cena familiar nos vazios da visão geral e da gestão de dependentes, mantendo a ação de cadastrar. |
| Contratos | Pasta ilustrada quando nenhum contrato foi emitido, nas listas compartilhadas de aluno/responsável. Erros de carregamento mantêm alerta textual. |
| Turmas | Professor com tatame no primeiro cadastro de turma. Chamada e listas operacionais permanecem compactas. |
| Evolução, carteirinha e PAR-Q | Reutilizam início da jornada quando o cadastro ainda é necessário. |
| Início | Mantém a prioridade de pendências, próximo treino e faixa; evita repetir cenas nos indicadores. |
| Calendário e frequência | Calendário, presenças e histórico já são representações visuais; sem ilustração repetida por dia ou linha. |
| Estudos | Preserva os módulos e recursos didáticos; a coleção decorativa não demonstra técnicas de Taekwondo. |
| Matrícula | Preserva o formulário e seu resumo; a orientação ilustrada aparece nos pontos de entrada com cadastro ausente. |
| Financeiro e configurações | Preserva leitura de valores, filtros, regras e formulários; não acrescenta cenas às pendências nem aos resultados filtrados. |

## Componentes e contratos

`AppIllustration` recebe um nome do catálogo e um contexto de tamanho. A reserva de dimensões evita deslocamento de layout, as imagens carregam sob demanda e uma falha deixa o espaço reservado sem esconder o conteúdo. Arquivos WebP já comprimidos são servidos diretamente.

`EmptyState` aceita `illustration` opcional; sem ela, os ícones existentes continuam funcionando. O catálogo associa eventos pelo tipo, reconhecimentos por `kind` e marcos por identificador, recorrendo à métrica para IDs personalizados. `StudentBadge` passa a disponibilizar essa métrica apenas no modelo de apresentação. Não há migração ou mudança de permissões, pontuação ou concessão de conquistas.

## Revisão e reprodução

- Abrir `gallery.html` para comparar as 27 peças com os avatares, alternar tema e visualizar conquistas em progresso.
- Abrir `pilots.html` para a composição inicial dos três pilotos em desktop e celular.
- Consultar `prompts.json` para os prompts de produção e ajustes. Os originais de geração permanecem no diretório padrão da ferramenta; o app depende apenas dos WebP dentro do repositório.
- Exportar uma imagem: `node scripts/illustrations-export.cjs nome-do-asset caminho-do-original.png`.
- Auditar dimensões e transparência: `node scripts/illustrations-audit.cjs`.
- Exportar os componentes reais para inspeção local: definir `ILLUSTRATION_PREVIEW=1` e executar `npx vitest run --maxWorkers=2 src/components/shared/illustration-integration.test.tsx`.
- Depois, executar `node scripts/illustrations-visual-check.cjs`. Evidências ficam em `reports/illustrations/` (ignorado pelo Git); esse script usa Edge headless por padrão, substituível com `E2E_BROWSER_CHANNEL`.

A verificação visual usa dados sintéticos e componentes reais com o CSS do app, sem acessar contas ou dados de produção. Inclui 320 px e desktop nos dois temas, ampliação de texto a 200% e imagens indisponíveis. Isso não substitui homologação autenticada ou avaliação de compreensão com alunos e responsáveis.

## Páginas completas sem Appwrite

Quando a cota do backend estiver indisponível, `illustration-pages-preview.test.tsx` renderiza as páginas reais de eventos do aluno e do professor, exames e conquistas, dentro de `PortalFrame`/`DashboardShell`, nos estados com conteúdo e vazio. Somente serviços, sessão e o wrapper experimental de transição recebem substitutos locais. O teste bloqueia `fetch` e exige zero chamadas. O layout usa a fonte local Poppins; gráficos sem dados e recursos que dependem de hidratação não representam uma sessão interativa autenticada.

1. Definir `ILLUSTRATION_PREVIEW=1` e executar `npx vitest run --maxWorkers=1 src/components/shared/illustration-pages-preview.test.tsx`.
2. Executar `node scripts/illustrations-preview-server.cjs` e abrir `http://127.0.0.1:4317`.
3. Executar `node scripts/illustrations-pages-check.cjs`: verifica as oito páginas em 32 combinações de tamanho e tema, além dos rótulos dentro dos cards com texto a 200%. O navegador bloqueia qualquer requisição fora do servidor local.

O servidor atende apenas arquivos de prévia, imagens públicas e fontes, em loopback. Não serve `.env.local`, não inicializa clientes Appwrite e impede conexões de rede e envios de formulário por CSP. É uma ferramenta de validação, sem nova rota no aplicativo publicado.

Para executar build ou testes sem qualquer saída HTTP, definir `NODE_OPTIONS=--require=C:/Users/Matheus/Projects/ebenertkd-app/scripts/testing/offline-network.cjs` apenas no processo de validação. O guard usa `MockAgent.disableNetConnect()` para o SDK, bloqueia `fetch` e HTTP/HTTPS. O aplicativo normal não carrega esse guard. Um build offline pode usar os fallbacks locais já existentes para identidade, faixas e políticas; isso não comprova disponibilidade do backend.
