# Implantação da rotina diária — 20/11/2026

## Estado verificado

- Função `daily-operations`, runtime `node-22`, habilitada.
- Deployment ativo `6b00eabba46cdd2d7a59`, status `ready`.
- Intervalo de **1.440 minutos (24 horas)**; cron vazio. O horário é escolhido pelo Appwrite, sem compromisso de execução às 00h15.
- A criação e o deployment são permitidos no plano gratuito desta conta. A tentativa de cron foi recusada com `billing_feature_unsupported`, orientando usar intervalo; não houve upgrade de plano.
- Execução com 0,5 CPU/512 MB (`s-0.5vcpu-512mb`) e timeout de 60 segundos. Build com a especificação habilitada `s-2vcpu-2gb`.
- Sem execução pública (`execute: []`) ou gatilhos de eventos. Chave dinâmica por execução limitada a `rows.read` e `rows.write`.
- Variáveis de banco e push sincronizadas. `VAPID_PRIVATE_KEY` e `PUSH_SUBSCRIPTION_ENCRYPTION_KEY` estão marcadas como secretas. Nenhum valor secreto foi incluído neste registro.
- A atualização de metadados usada pelo script de deployment foi executada e seguida de leitura: o intervalo de 1.440 minutos e o estado habilitado permaneceram intactos.

## Ajustes no repositório

- O schema declara o intervalo diário gratuito. O setup envia `interval` pelo cliente HTTP autenticado, pois a versão instalada do SDK ainda não expõe esse parâmetro.
- A rotina considera o dia de Brasília no identificador diário e na recuperação de dias desde a última execução. Isso evita antecipar cobranças e lembretes para o dia seguinte quando UTC vira antes da data local.
- O script de deployment preserva cron existente ao atualizar escopos e verifica o diretório temporário antes da limpeza recursiva.
- Regressões reproduzidas antes das correções e aprovadas depois: preservação de agendamento, definição do intervalo gratuito e data/catch-up de Brasília.

## Validação e limites

- 39 testes focados passaram em seis arquivos: rotina diária, lembretes, push, consolidação de faltas, schema e script de deployment.
- Lint, typecheck e `node --check` da função passaram antes da ativação.
- A primeira rodada de testes foi interrompida por falha de inicialização de um worker Windows. A rodada final usou ambiente Node e pool de threads, apropriados a estes testes de servidor, sem aumentar limites de tempo das asserções.
- A configuração ativa foi conferida na API após o deployment. Não foi disparada execução manual para evitar cobranças, faltas e avisos extras em produção. A consulta inicial de execuções retornou lista vazia; a primeira execução automática ainda precisa produzir seu registro em `automation_runs`.
- O agendador não informou um horário fixo no retorno de metadados consultado. O intervalo diário está habilitado; as cotas gratuitas e limites de tempo continuam aplicáveis.
- A função `backup` não foi criada ou implantada. Sua definição de cron continua exigindo revisão separada para uso no plano gratuito.
