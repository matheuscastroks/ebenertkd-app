# Configuração do backup cifrado no Google Drive

Passo a passo para o dono do projeto. Tudo que está marcado com **[SOMENTE O DONO]** exige login, consentimento ou um clique em consoles de terceiros e não pode ser feito por automação. Segredos nunca devem ser colados em chats, tickets, commits ou logs.

Como funciona: a Function `backup` (cron diário às 03:45) exporta usuários, tabelas e arquivos do Appwrite, cifra cada objeto com AES-256-GCM usando `BACKUP_ENCRYPTION_KEY` e envia ao Drive. A pasta do dia só recebe `status=complete` depois de manifesto e marcador de conclusão enviados e verificados. Retenção: 7 cópias diárias e 4 semanais completas.

## Por que o escopo é `drive.file`

O escopo `https://www.googleapis.com/auth/drive.file` só permite ao aplicativo acessar arquivos que ele mesmo criou. Por isso **a pasta de backup não deve ser criada à mão no Drive**: uma pasta criada pela interface do Drive é invisível para este app e o backup falharia com erro 404. O script `backup:drive-token` cria a pasta (`EbenerTKD Backups`) usando a própria autorização e imprime o `GOOGLE_DRIVE_FOLDER_ID` correto. Ela fica privada, só na conta Google dedicada.

## Parte A. Google Cloud (SOMENTE O DONO)

Use uma conta Google dedicada ao backup (não a pessoal), com verificação em duas etapas.

1. Acesse https://console.cloud.google.com com a conta dedicada e aceite os termos, se pedido.
2. Clique no seletor de projeto (topo) e em **Novo projeto**. Nome: `ebenertkd-backup`. Clique em **Criar** e selecione o projeto.
3. Menu **APIs e serviços > Biblioteca**, pesquise **Google Drive API** e clique em **Ativar**.
4. Menu **APIs e serviços > Tela de permissão OAuth** (ou **Google Auth Platform > Branding**):
   - Tipo de usuário: **Externo**. Preencha nome do app (`EbenerTKD Backup`), e-mail de suporte e e-mail do desenvolvedor.
   - Em **Acesso a dados / Escopos**, adicione apenas `.../auth/drive.file`.
   - Em **Público / Usuários de teste**, adicione a própria conta dedicada.
   - **Coloque o app em produção**: em **Público**, clique em **Publicar app** e confirme. Sem isso, refresh tokens de apps em modo "Teste" expiram em 7 dias e o backup passa a falhar silenciosamente depois de uma semana. Como o escopo `drive.file` não é sensível, não é exigida verificação do Google; a tela "app não verificado" pode aparecer no consentimento e basta continuar com a conta dedicada.
5. Menu **APIs e serviços > Credenciais > Criar credenciais > ID do cliente OAuth**:
   - Tipo de aplicativo: **App para computador (Desktop)**. Esse tipo aceita redirecionamento loopback (`http://127.0.0.1:<porta>`) sem cadastrar URIs. Se escolher **Aplicativo da Web**, o fluxo do script não funciona, pois a porta é dinâmica.
   - Nome: `ebenertkd-backup-cli`. Clique em **Criar**.
   - Copie o **ID do cliente** e a **chave secreta do cliente**.

## Parte B. Gerar a chave de cifra (local)

```bash
npm run -s backup:generate-key
```

Use `npm run -s` para que o npm não ecoe cabeçalhos extras. O comando imprime uma chave de 32 bytes em base64 apenas no terminal e não grava arquivo. Copie o valor imediatamente para dois lugares: `.env.local` (`BACKUP_ENCRYPTION_KEY=`) e o cofre externo da Parte F. Rodar de novo gera outra chave; **trocar a chave depois de existirem backups torna os backups antigos ilegíveis**, então gere uma única vez.

## Parte C. Obter o refresh token e a pasta (local + SOMENTE O DONO no navegador)

1. No `.env.local` (copie de `.env.example` se não existir), preencha `GOOGLE_DRIVE_CLIENT_ID` e `GOOGLE_DRIVE_CLIENT_SECRET` com os valores do passo A.5.
2. Rode:

   ```bash
   npm run -s backup:drive-token
   ```

3. O script abre o navegador (ou imprime a URL para você abrir). **[SOMENTE O DONO]** entre com a conta Google dedicada, aceite o aviso de app não verificado se aparecer (Avançado > Acessar) e clique em **Continuar/Permitir** para o acesso a arquivos criados pelo app.
4. De volta ao terminal, o script imprime duas linhas: `GOOGLE_DRIVE_REFRESH_TOKEN=...` e `GOOGLE_DRIVE_FOLDER_ID=...`. Copie ambas para `.env.local`. Nada é gravado em arquivo. O refresh token é impresso antes da criação da pasta: se a criação falhar (por exemplo, Drive API não ativada), o token continua válido; ative a API e rode de novo. Use `--no-folder` (`npm run -s backup:drive-token -- --no-folder`) se não quiser criar a pasta.
5. Confira no Drive da conta dedicada que a pasta `EbenerTKD Backups` existe e **não está compartilhada** com ninguém.

**Aviso sobre o terminal:** a chave e o token ficam no scrollback do terminal e na área de transferência. Depois de copiá-los, limpe o terminal (`clear`/`cls` e feche a aba) e não grave a sessão em log nem compartilhe a tela.

Se o script disser que não veio refresh token, abra https://myaccount.google.com/permissions com a conta dedicada, remova o acesso do app e rode de novo.

## Parte D. Variáveis da Function `backup`

Há duas opções equivalentes.

**Opção 1 (recomendada): pelo script.** Com `.env.local` completo (`GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, `GOOGLE_DRIVE_REFRESH_TOKEN`, `GOOGLE_DRIVE_FOLDER_ID`, `BACKUP_ENCRYPTION_KEY`, além das variáveis Appwrite do servidor), o comando abaixo sincroniza as variáveis (como segredos), atualiza escopos/timeout e publica a Function:

```bash
npm run appwrite:deploy-function -- backup
```

Confirme antes que `.env.local` aponta para o projeto Appwrite correto: o comando altera o projeto de produção.

**Opção 2: pelo console. [SOMENTE O DONO]** Em Appwrite Console > projeto > **Functions > backup > Settings > Environment variables**, crie estas variáveis marcando **Secret** nas cinco primeiras: `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, `GOOGLE_DRIVE_REFRESH_TOKEN`, `GOOGLE_DRIVE_FOLDER_ID`, `BACKUP_ENCRYPTION_KEY`. Variáveis não secretas: `APPWRITE_DATABASE_ID` (`ebenertkd`), `APPWRITE_STORAGE_BUCKET_ID` (`private-files`) e `APP_VERSION`. Depois, em **Settings > Scopes**, garanta `users.read`, `rows.read`, `rows.write`, `buckets.read`, `files.read`, timeout 900 s, e publique o código da pasta `appwrite/functions/backup` (entrypoint `src/main.js`, comando de build `npm install`).

**Depois do deploy da Function, remova `BACKUP_ENCRYPTION_KEY` e `GOOGLE_DRIVE_REFRESH_TOKEN` do `.env.local`** (mantenha-os apenas no cofre e na Function). Eles só voltam ao `.env.local` durante um ensaio de restauração (Parte G). Atenção: um novo `npm run appwrite:deploy-function -- backup` exige as variáveis no ambiente de novo; para só republicar o código, use o console.

Resumo de onde cada variável vai:

| Variável | `.env.local` | Function `backup` |
| --- | --- | --- |
| `GOOGLE_DRIVE_CLIENT_ID` | sim | sim (secret) |
| `GOOGLE_DRIVE_CLIENT_SECRET` | sim | sim (secret) |
| `GOOGLE_DRIVE_REFRESH_TOKEN` | sim | sim (secret) |
| `GOOGLE_DRIVE_FOLDER_ID` | sim | sim (secret) |
| `BACKUP_ENCRYPTION_KEY` | sim | sim (secret) |
| `RESTORE_*` | sim (só para o ensaio) | não |

## Parte E. Execução manual e conferência (SOMENTE O DONO)

1. Appwrite Console > **Functions > backup > Executions > Execute now** (corpo vazio). Aguarde terminar (pode levar minutos; o limite é 15 minutos).
2. Resultado esperado: status `completed` e resposta com `ok: true`. Em caso de falha, a execução devolve `ok: false` e o motivo sanitizado aparece em `automation_runs` (campo `details`); admins também recebem o aviso "Falha no backup diário".
3. Appwrite Console > **Databases > ebenertkd > automation_runs**: deve existir a linha `backup-AAAAMMDD-v1` com `job=backup`, `status=completed` e `details` com `objects`, `records`, `bytes`, `manifestCiphertextSha256`. Também aparece em `/admin/sistema`.
4. Google Drive (conta dedicada) > `EbenerTKD Backups` > pasta `backup-AAAAMMDD`. A interface do Drive **não mostra** as propriedades do app, então o `status=complete` da pasta só se confere por `automation_runs` (`completed`) ou rodando a simulação do restore (Parte G.4), que recusa pastas não completas. Confirme também que a pasta contém `manifest.json.enc`, `complete.json.enc`, `users.json.enc`, `tables/*.json.enc` (30 tabelas) e `files/*.bin.enc`, todos com extensão `.enc` (nada legível).
5. Executar de novo no mesmo dia é seguro: a run já concluída responde `duplicate: true`; se a anterior falhou, a pasta é revertida para incompleta e refeita.

## Parte F. Guardar a chave de recuperação (SOMENTE O DONO)

- Guarde `BACKUP_ENCRYPTION_KEY` em um gerenciador de senhas (item "EbenerTKD backup key") e imprima ou grave uma cópia em local físico seguro.
- Não guarde a única cópia no Appwrite, no Drive de backup, em e-mail ou no repositório. Quem tem o Drive e a chave consegue ler todos os dados dos alunos; quem perde a chave perde os backups.
- Guarde também client id/secret e o refresh token (permitem reconfigurar sem refazer a Parte C; se perdidos, basta repetir a Parte C, o que gera nova pasta e exige apontar a variável).

## Parte G. Ensaio de restauração em projeto separado (SOMENTE O DONO cria o projeto)

1. **[SOMENTE O DONO]** No Appwrite Cloud crie um projeto novo e vazio (ex.: `ebenertkd-restore-test`) e uma API key com escopos de usuários, bancos, tabelas, linhas, buckets e arquivos (leitura e escrita).
2. No `.env.local` preencha `RESTORE_APPWRITE_ENDPOINT`, `RESTORE_APPWRITE_PROJECT_ID`, `RESTORE_APPWRITE_API_KEY`, `RESTORE_APPWRITE_DATABASE_ID`, `RESTORE_APPWRITE_STORAGE_BUCKET_ID`, `RESTORE_STORAGE_QUOTA_BYTES` e `RESTORE_GOOGLE_DRIVE_FOLDER_ID` (ID da pasta `backup-AAAAMMDD`, obtido na URL do Drive). Use as mesmas credenciais Google e a `BACKUP_ENCRYPTION_KEY` do cofre.
3. Aplique o schema no projeto de teste **sem editar os `APPWRITE_*` do `.env.local`**. Defina as variáveis `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`, `APPWRITE_DATABASE_ID` e `APPWRITE_STORAGE_BUCKET_ID` do projeto de teste somente na sessão do shell (variáveis do shell têm precedência sobre o `.env.local`; no PowerShell: `$env:APPWRITE_PROJECT_ID = "..."`) ou use um arquivo `.env.restore` fora do repositório carregado manualmente nessa sessão. **Antes de cada comando (`npm run infra:apply`, `npm run backup:restore`), confira o ID do projeto** (`$env:APPWRITE_PROJECT_ID` / `echo $APPWRITE_PROJECT_ID`) e confirme que não é `6ab4c32e00317977eeb6` (produção). Feche o shell ao terminar para descartar as variáveis. Se usar `.env.restore`, nunca o commite.
4. Simulação (não grava nada, valida hashes, versão, cota e destino vazio):

   ```bash
   npm run backup:restore -- --folder-id=ID_DA_PASTA
   ```

5. Aplicação, somente após revisar a simulação:

   ```bash
   npm run backup:restore -- --folder-id=ID_DA_PASTA --apply --confirm-target=ID_DO_PROJETO_DE_TESTE
   ```

6. Compare as contagens do relatório `reports/restore-*.json` e abra fotos, atestados e comprovantes no projeto de teste. Registre duração e divergências. Apague a API key e o projeto de teste ao terminar. O script recusa o projeto de origem e o de produção.

## Riscos de perda de acesso

- **Client ID/secret perdidos ou projeto Google Cloud recriado**: as pastas antigas foram criadas por aquele app e, com `drive.file`, outro client não as enxerga pela API. O backup novo passaria a falhar ou criaria outra pasta sem as cópias antigas. Plano B: baixe manualmente os arquivos `.enc` pela interface do Drive (a conta dedicada continua dona deles) e restaure com a chave. Guarde client ID/secret no cofre junto com a chave.
- **Trocar `GOOGLE_DRIVE_FOLDER_ID`**: a nova pasta começa vazia; cópias e contagem de retenção anteriores não são herdadas e a pasta antiga não é limpa automaticamente.

## Operação contínua

- Alerta: sem cópia completa por mais de 24 h é incidente (aparece como crítico em `/admin/sistema`).
- Repita o ensaio da Parte G trimestralmente.
- Se o refresh token for revogado ou expirar (erro `drive_token_failed` em `automation_runs`), refaça a Parte C e atualize a variável `GOOGLE_DRIVE_REFRESH_TOKEN` na Function.
