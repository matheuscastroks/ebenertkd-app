# Fase 7 — Backup e operação Implementation Plan

> **For agentic workers:** execute os itens em ordem e marque os checkboxes somente após comprovar o resultado. Teste restauração antes de declarar concluído.

**Goal:** produzir backups externos verificáveis, restaurar o sistema e tornar falhas operacionais visíveis ao professor e ao mantenedor.

**Architecture:** a Function de backup exporta tabelas, manifesto e arquivos privados, cifra localmente e envia ao Google Drive. Uma restauração ocorre em projeto separado e recria identidades com redefinição de senha.

**Tech Stack:** Appwrite Function, Google Drive API OAuth2, criptografia autenticada AES-256-GCM, checksums SHA-256.

---

## Ordem de implementação

### Entrega 7A — Formato verificável e backup externo

**Arquivos:** criar `src/lib/backup/manifest.ts`, `src/lib/backup/manifest.test.ts`, `appwrite/functions/backup/src/crypto.js`, `appwrite/functions/backup/src/drive.js`; substituir `appwrite/functions/backup/src/main.js`; alterar `scripts/appwrite/deploy-function.ts`.

- [x] Testar manifesto, hashes, nonce único, detecção de referência ausente e retenção antes da implementação.
- [x] Exportar usuários, todas as tabelas e todos os arquivos privados com paginação.
- [x] Cifrar cada objeto em envelope AES-256-GCM e publicar `complete.json` por último.
- [x] Usar upload retomável, pasta diária determinística e retenção somente de pastas completas.
- [ ] Sincronizar segredos e escopos mínimos no deploy; commit `feat: add encrypted external backups`.

### Entrega 7B — Restauração protegida

**Arquivos:** criar `scripts/backup/restore.ts`, `scripts/backup/restore-rules.ts`, `scripts/backup/restore-rules.test.ts`; alterar `package.json` e criar `docs/operations.md`.

- [x] Exigir variáveis `RESTORE_APPWRITE_*`, ID digitado novamente e projeto de destino diferente da produção.
- [x] Baixar apenas backup completo, autenticar envelopes e comparar todos os hashes antes de gravar.
- [x] Exigir tabelas e bucket vazios; restaurar usuários, linhas e arquivos preservando IDs.
- [x] Produzir relatório sem senhas, listar contas que exigem redefinição e nunca enviar e-mail automaticamente.
- [x] Validar regras com fixture corrompida e destino inseguro; commit `feat: add guarded backup restore`.

### Entrega 7C — Observabilidade operacional

**Arquivos:** criar `src/features/operations/service.ts`, `src/app/admin/sistema/page.tsx`; alterar `src/lib/navigation/routes.ts`, `src/components/dashboard/app-sidebar.tsx` e testes de navegação.

- [x] Mostrar último cron, último backup completo, falhas recentes e tamanho do bucket.
- [x] Calcular níveis normal, atenção (70%) e crítico (85%) apenas quando a cota estiver configurada.
- [x] Documentar RPO de 24 horas, procedimento de teste e limitação de redefinição de senha.
- [x] Validar testes, lint, tipos, build e infraestrutura; commit `feat: add operations health dashboard`.

### Segredos obrigatórios para publicação

```text
GOOGLE_DRIVE_CLIENT_ID
GOOGLE_DRIVE_CLIENT_SECRET
GOOGLE_DRIVE_REFRESH_TOKEN
GOOGLE_DRIVE_FOLDER_ID
BACKUP_ENCRYPTION_KEY (32 bytes em base64)
```

O refresh token deve pertencer a uma conta dedicada, usar somente `drive.file` e estar em modo de produção. A chave de recuperação deve ter uma cópia fora do Appwrite e do Google Drive.

## 7.1 Autorização e formato

**Arquivos:** criar `appwrite/functions/backup/src/main.ts`, `src/lib/backup/manifest.ts`, `scripts/backup/restore.ts`, `docs/operations.md`.

- [ ] Usar conta Google dedicada, pasta privada e escopo `drive.file`; colocar consentimento OAuth em produção para evitar refresh token de teste expirando em sete dias.
- [ ] Guardar refresh token e chave de criptografia em secrets da Function; guardar cópia da chave de recuperação fora de Appwrite e Drive.
- [x] Definir manifesto versionado com schema, contagens, hashes, timestamps, versão da aplicação e lista de objetos.
- [x] Exportar todas as tabelas com paginação e todos os arquivos referenciados; detectar referências ausentes.
- [x] Cifrar arquivo por arquivo com nonce único e autenticação; nunca enviar dados em claro ao Drive.

## 7.2 Execução e retenção

- [x] Executar diariamente após a rotina operacional; usar lock por data e retomar upload incompleto.
- [x] Publicar marcador `complete` somente após conferir contagens e hashes do destino.
- [x] Manter sete diários e quatro semanais; excluir apenas backups completos fora da retenção.
- [x] Registrar duração, bytes, contagens, estado, erro sanitizado e último sucesso em `automation_runs`.
- [x] Alertar professor/mantenedor após uma falha e elevar criticidade após 24 horas sem cópia válida.

## 7.3 Restauração e operação

- [x] Fazer `restore.ts` exigir projeto Appwrite vazio e confirmação do ID de destino; nunca restaurar sobre produção.
- [x] Verificar autenticação, hashes, versão e espaço antes de gravar.
- [x] Restaurar usuários, dados na ordem do schema, arquivos e permissões; gerar relatório de execução.
- [x] Recriar contas sem senha original e listar o fluxo de redefinição necessário; documentar claramente essa limitação.
- [x] Criar painel técnico em `src/app/admin/sistema/page.tsx` com último cron, backup, falhas e uso de armazenamento.
- [x] Alertar em 70% de uso e exigir plano de upgrade antes de 85%.

## Testes e aceite

- [ ] Testar token revogado, Drive indisponível, upload interrompido, arquivo corrompido e execução duplicada.
- [ ] Restaurar conjunto fictício com adulto, responsável, dois menores, saúde, contrato, cobrança, comprovante, presença e exame.
- [ ] Comparar contagens e hashes; documentar RPO de 24 horas e tempo observado de restauração.
- [ ] Gate: restauração separada funciona e nenhuma cópia incompleta aparece como válida.
