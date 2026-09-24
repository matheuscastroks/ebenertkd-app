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

Ambas recebem uma chave dinâmica da execução e registram uma chave idempotente diária em `automation_runs`. `daily-operations` processa cobranças e lembretes às 03:15; `backup` exporta e cifra os dados às 03:45. Publique com `npm run appwrite:deploy-function -- backup` somente depois de configurar os segredos exigidos.

## Backup cifrado no Google Drive

Use uma conta Google dedicada, pasta privada e credencial OAuth limitada a `drive.file`. Coloque a tela de consentimento em produção: refresh tokens emitidos para aplicativos em teste podem expirar em sete dias. Configure `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, `GOOGLE_DRIVE_REFRESH_TOKEN`, `GOOGLE_DRIVE_FOLDER_ID` e uma `BACKUP_ENCRYPTION_KEY` aleatória de 32 bytes em base64.

A chave cifra cada objeto com AES-256-GCM antes do upload e não deve ficar no Drive nem somente no Appwrite. Mantenha uma cópia em um gerenciador de senhas ou cofre externo. A política mantém sete cópias diárias e quatro semanais completas. O RPO esperado é de 24 horas; uma pasta incompleta nunca é considerada restaurável.

Após publicar, execute manualmente a Function e confira no Drive a pasta diária marcada como `complete`. Também confira a execução `backup` em `automation_runs`. Nunca inclua tokens, chave de cifra ou conteúdo do backup em logs e tickets.

## Ensaio de restauração

Crie um projeto Appwrite separado e aplique nele o mesmo schema e bucket, sem usuários, linhas ou arquivos. Configure as variáveis `RESTORE_APPWRITE_*`, `RESTORE_STORAGE_QUOTA_BYTES` e `RESTORE_GOOGLE_DRIVE_FOLDER_ID` em `.env.local`.

Primeiro faça somente a verificação:

```bash
npm run backup:restore -- --folder-id=ID_DA_PASTA
```

O comando baixa todos os objetos, autentica AES-GCM, compara hashes, valida a versão, verifica a cota e comprova que o destino está vazio antes de qualquer gravação. Depois de revisar o resultado, aplique com uma confirmação literal:

```bash
npm run backup:restore -- --folder-id=ID_DA_PASTA --apply --confirm-target=ID_DO_PROJETO_DE_TESTE
```

O script bloqueia o projeto de origem e o projeto configurado como produção. IDs, linhas, permissões e arquivos são preservados. Senhas e sessões não são copiadas: as contas recebem senhas aleatórias, e o relatório local em `reports/restore-*.json` lista os e-mails que precisam passar pelo fluxo normal de recuperação. O script não envia mensagens automaticamente.

No ensaio trimestral, compare as contagens do relatório e abra fotos, atestados e comprovantes. Registre duração e divergências. Só considere o procedimento aprovado quando um conjunto com aluno adulto, responsável, menor, contrato, cobrança, presença e exame puder ser consultado no projeto separado.

## Painel operacional

Administradores acessam `/admin/sistema` pela seção **Sistema** da sidebar. A tela apresenta a última rotina diária, o último backup, falhas recentes, prontidão das configurações e uso do bucket. Configure `APPWRITE_STORAGE_QUOTA_BYTES` com a cota real em bytes: abaixo de 70% o estado é normal, de 70% a 84,9% exige atenção e a partir de 85% é crítico. Backup ou rotina sem sucesso há mais de 24 horas também aparecem como críticos.

## PWA e Web Push

O push será validado com as chaves VAPID de `.env.local`. No Chrome/Android, a permissão deve ser solicitada após uma ação do usuário. No iOS/iPadOS 16.4 ou superior, o site precisa ser adicionado à Tela de Início antes de solicitar a permissão. Push será complementar à caixa interna de avisos e não será tratado como comprovante de leitura.

## Segurança e incidentes

- Nunca copie segredos para `.env.example`, logs, issues ou capturas de tela.
- Cookies de sessão são HTTP-only, `SameSite=Lax` e `Secure` em produção.
- A rota `/api/diagnostics/session` retorna apenas ID da conta e estado de verificação para uma sessão válida.
- Se uma chave administrativa for exposta, revogue-a, crie outra com os menores escopos necessários e atualize os secrets.
- Se o backup falhar ou não houver cópia completa por mais de 24 horas, trate como incidente operacional antes de alterar a retenção.
- Se a chave de criptografia for perdida, as cópias externas não poderão ser recuperadas.
