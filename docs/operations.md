# Operação do Ebenert KD

## Configuração local

1. Copie `.env.example` para `.env.local`.
2. Preencha endpoint, projeto, chave administrativa, banco e bucket do Appwrite.
3. Revogue qualquer chave que tenha sido incluída anteriormente em arquivo versionável.
4. Execute `npm run infra:plan`; revise a lista e use `npm run infra:apply` para criar recursos ausentes.
5. Execute `npm run infra:smoke` para validar transação e arquivo privado. O script apaga seus próprios dados de teste.

O cliente público usa o projeto `6ab4c32e00317977eeb6` no endpoint `https://fra.cloud.appwrite.io/v1`. Execute `npm run appwrite:ping` para confirmar a conectividade sem chave administrativa. No navegador, o layout executa o mesmo ping uma única vez por carregamento e define `data-appwrite="connected"` no elemento `<html>` quando recebe resposta.

A chave administrativa precisa dos escopos de banco/tabelas/colunas/índices/linhas, bucket/arquivos e Functions. Ela é usada somente nos scripts e no servidor. O bucket e as tabelas começam sem permissões públicas.

## Functions

Os recursos `daily-operations` e `backup` são criados pelo setup com cron diário. O código fica em `appwrite/functions/`. Conecte o repositório ao Appwrite ou publique cada diretório como deployment, mantendo `src/main.js` como entrypoint e `npm install` como comando de build.

Ambas recebem uma chave dinâmica da execução com acesso a linhas e registram uma chave idempotente diária em `automation_runs`. Na Fase 0, a Function `backup` só comprova o agendamento; a exportação para Google Drive será implementada na Fase 7.

## PWA e Web Push

O push será validado com as chaves VAPID de `.env.local`. No Chrome/Android, a permissão deve ser solicitada após uma ação do usuário. No iOS/iPadOS 16.4 ou superior, o site precisa ser adicionado à Tela de Início antes de solicitar a permissão. Push será complementar à caixa interna de avisos e não será tratado como comprovante de leitura.

## Segurança e incidentes

- Nunca copie segredos para `.env.example`, logs, issues ou capturas de tela.
- Cookies de sessão são HTTP-only, `SameSite=Lax` e `Secure` em produção.
- A rota `/api/diagnostics/session` retorna apenas ID da conta e estado de verificação para uma sessão válida.
- Se uma chave administrativa for exposta, revogue-a, crie outra com os menores escopos necessários e atualize os secrets.
