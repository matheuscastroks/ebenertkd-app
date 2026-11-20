# Finalização de navegação mobile e check-in — 20/11/2026

## Escopo

Retomada das alterações deixadas pela revisão de telas: concluir alvos de toque, conferir navegação dos perfis e revisar a frente independente de check-in por localização. O PR #29 de cache também foi revisado, corrigido e integrado.

## Correções

- Links de configurações da academia usam uma caixa indivisível com linha de 24 px e expansão vertical de 10 px em cada lado: alvo de 44 px. No navegador, o texto “Editar texto do contrato” antes ocupava dois fragmentos e falhava no teste de toque acima/abaixo.
- O nome do dependente usa uma caixa real de 44 px. A ampliação anterior ficava recortada pelo `overflow: hidden` do título; o navegador confirmou que toques acima/abaixo não atingiam o link.
- A lista de envio de reajuste usa controles de pelo menos 44 px. Foi removido o botão redundante de voltar; permanece a navegação padrão da pilha.
- Aulas com menos de 30 minutos encerram check-in e justificativa no término da aula. O card não oferece ações quando o professor já concluiu a chamada.
- A política HTTP permite geolocalização somente na própria origem. Antes, `geolocation=()` bloqueava o check-in e o botão de localização mesmo com permissão concedida pelo navegador. Câmera e microfone continuam bloqueados.
- No PR #29, status, papel e capacidades de autorização são consultados no perfil atual, sem cache persistente. A deduplicação React por requisição permanece e os perfis de exibição continuam cacheados. Conflitos resolvidos preservando a main atual.
- A leitura atual do perfil também normaliza objetos do SDK antes da fronteira servidor/cliente. A validação no build encontrou um erro 500 em Configurações sem essa normalização; a regressão usa protótipos personalizados e confirma a conversão recursiva sem voltar ao cache de autorização.

## Evidências e limites

- Suíte completa: `npm test -- --maxWorkers=2` aprovou **1.143 testes em 208 arquivos**. Build de produção aprovado após as correções de perfil e geolocalização.
- `npm run lint`, `npm run typecheck` e `git diff --check` passaram no estado final, sem ignorar código de produção ou modificar limites de tempo dos testes.
- Navegação autenticada no Chromium: 45 combinações únicas de perfil, rota e largura, nos quatro perfis (admin, responsável, adulto e menor), incluindo as oito áreas do dependente, Configurações, duas chamadas e comparação das telas iniciais em 375 e 1280 px. Nenhum overflow horizontal nas verificações finais.
- Toques reais confirmados nos quatro links de Ajustes (um fragmento e alvo medido em 44 px), nome do dependente, voltar para Família, quatro filtros de avisos do responsável e menu mobile dos quatro perfis.
- No build final, o botão de localização preencheu latitude e longitude com GPS simulado. O formulário foi fechado sem salvar coordenadas no Appwrite.
- Regressões de check-in reproduzidas antes das correções; 63 testes focados passaram em oito arquivos, incluindo GPS negado, fora do raio, confirmação, justificativa sem GPS e registro existente.
- Quatro regressões de autorização reproduzidas antes da correção; 27 testes focados de sessão/cache/preferências/vínculos passaram. CI do PR #29 aprovou Quality checks e Public E2E smoke antes do merge.
- Componente real de envio de reajuste validado no Chromium em 360, 375, 768 e 1280 px, com nomes longos e pagador sem telefone, sem overflow horizontal e controles medidos em 44 px. Dados e ações desse cenário são simulados apenas no navegador.
- Componente real de check-in validado no Chromium com GPS negado e justificativa sem GPS; ações simuladas, sem gravação remota.
- A regressão da política de geolocalização falhou em desenvolvimento e produção antes da correção; os cinco testes de cabeçalhos passaram depois.
- A configuração local disponível aponta para produção. A navegação autenticada usa contas de teste e não cria campanhas, aulas, presenças ou alterações de política. A edição de coordenadas é conferida apenas em memória, fechando sem salvar. E2E autenticado com mutações depende de um projeto Appwrite isolado.
- Consulta de metadados confirmou as sete colunas do check-in disponíveis e compatíveis com o schema. A função `daily-operations` retorna `function_not_found` no projeto atual: a consolidação automática de faltas ainda depende da criação e implantação dessa função, com agendamento `15 3 * * *` (00h15 de Brasília). Essa rotina também gera cobranças e avisos; sua ativação em produção requer decisão específica do proprietário.
- Não houve implantação de função diária nem alteração das coordenadas dos locais. O cálculo de frequência para falta justificada foi preservado.

As capturas e os resultados detalhados do navegador ficam em `reports/mobile-2026-11-20/` (ignorado pelo Git, pois as telas autenticadas podem conter dados privados).
