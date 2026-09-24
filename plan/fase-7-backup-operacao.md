# Fase 7 — Backup e operação Implementation Plan

> **For agentic workers:** execute os itens em ordem e marque os checkboxes somente após comprovar o resultado. Teste restauração antes de declarar concluído.

**Goal:** produzir backups externos verificáveis, restaurar o sistema e tornar falhas operacionais visíveis ao professor e ao mantenedor.

**Architecture:** a Function de backup exporta tabelas, manifesto e arquivos privados, cifra localmente e envia ao Google Drive. Uma restauração ocorre em projeto separado e recria identidades com redefinição de senha.

**Tech Stack:** Appwrite Function, Google Drive API OAuth2, criptografia autenticada AES-256-GCM, checksums SHA-256.

---

## 7.1 Autorização e formato

**Arquivos:** criar `appwrite/functions/backup/src/main.ts`, `src/lib/backup/manifest.ts`, `scripts/backup/restore.ts`, `docs/operations.md`.

- [ ] Usar conta Google dedicada, pasta privada e escopo `drive.file`; colocar consentimento OAuth em produção para evitar refresh token de teste expirando em sete dias.
- [ ] Guardar refresh token e chave de criptografia em secrets da Function; guardar cópia da chave de recuperação fora de Appwrite e Drive.
- [ ] Definir manifesto versionado com schema, contagens, hashes, timestamps, versão da aplicação e lista de objetos.
- [ ] Exportar todas as tabelas com paginação e todos os arquivos referenciados; detectar referências ausentes.
- [ ] Cifrar arquivo por arquivo com nonce único e autenticação; nunca enviar dados em claro ao Drive.

## 7.2 Execução e retenção

- [ ] Executar diariamente após a rotina operacional; usar lock por data e retomar upload incompleto.
- [ ] Publicar marcador `complete` somente após conferir contagens e hashes do destino.
- [ ] Manter sete diários e quatro semanais; excluir apenas backups completos fora da retenção.
- [ ] Registrar duração, bytes, contagens, estado, erro sanitizado e último sucesso em `automation_runs`.
- [ ] Alertar professor/mantenedor após uma falha e elevar criticidade após 24 horas sem cópia válida.

## 7.3 Restauração e operação

- [ ] Fazer `restore.ts` exigir projeto Appwrite vazio e confirmação do ID de destino; nunca restaurar sobre produção.
- [ ] Verificar autenticação, hashes, versão e espaço antes de gravar.
- [ ] Restaurar em ordem: dados independentes, relações, arquivos e permissões; gerar relatório de divergências.
- [ ] Recriar contas sem senha original, revogar sessões e emitir fluxo de redefinição; documentar claramente essa limitação.
- [ ] Criar painel técnico em `src/app/admin/sistema/page.tsx` com último cron, backup, falhas e uso de armazenamento.
- [ ] Alertar em 70% de uso e exigir plano de upgrade antes de 85%.

## Testes e aceite

- [ ] Testar token revogado, Drive indisponível, upload interrompido, arquivo corrompido e execução duplicada.
- [ ] Restaurar conjunto fictício com adulto, responsável, dois menores, saúde, contrato, cobrança, comprovante, presença e exame.
- [ ] Comparar contagens e hashes; documentar RPO de 24 horas e tempo observado de restauração.
- [ ] Gate: restauração separada funciona e nenhuma cópia incompleta aparece como válida.

