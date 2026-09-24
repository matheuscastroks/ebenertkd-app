# Fase 8 — Homologação e lançamento Implementation Plan

> **For agentic workers:** execute os itens em ordem e marque os checkboxes somente após comprovar o resultado. Não usar alunos reais antes do gate de segurança.

**Goal:** comprovar segurança, confiabilidade e usabilidade operacional antes da entrada dos alunos reais.

**Architecture:** testes automatizados cobrem regras e autorização; uma matriz manual cobre dispositivos e operação. O piloto usa duas famílias e critérios objetivos antes da liberação geral.

**Tech Stack:** Vitest, Testing Library, Playwright, Appwrite preview/production.

---

## Ordem de implementação

### Entrega 8A — Guardas de segurança e release

**Arquivos:** criar `src/lib/security/safe-error.ts`, `src/lib/security/safe-error.test.ts`, `scripts/release/preflight.ts`; alterar `next.config.ts`, `.env.example`, scripts de seed e `package.json`.

- [x] Remover senhas de teste versionadas e exigir credenciais por ambiente para seed e validação.
- [x] Adicionar headers de segurança, política de erro sanitizado e testes contra vazamento de segredo.
- [x] Criar preflight somente leitura para domínio HTTPS, segredos, conta administrativa, configuração financeira, turmas, contrato, automações e capacidade.
- [x] Validar upload por assinatura e extensão, sessão ausente e isolamento básico de papéis em testes automatizados.
- [x] Commit `security: add release guardrails`.

### Entrega 8B — E2E e integração contínua

**Arquivos:** criar `playwright.config.ts`, `tests/e2e/public-access.spec.ts`, `tests/e2e/role-access.spec.ts`, `.github/workflows/ci.yml`; alterar `package.json`.

- [x] Configurar Playwright com servidor local, traces em falha e projetos desktop/mobile sem depender de dados reais.
- [x] Cobrir login público, redirecionamento sem sessão e matriz autenticada opcional por credenciais do ambiente isolado.
- [x] Configurar CI com instalação limpa, auditoria de produção, lint, tipos, Vitest, build e E2E público.
- [x] Manter E2E autenticado separado e bloqueado sem `E2E_*`; nunca apontar fixtures para produção.
- [x] Commit `test: add release quality gates`.

### Entrega 8C — Roteiro de homologação e lançamento

**Arquivos:** criar `docs/release-checklist.md`, `docs/security-test-matrix.md`, `docs/pilot-script.md`; alterar este plano e `plan/README.md`.

- [ ] Transformar desktop, Android, iPhone, operação do professor, reconciliação financeira e piloto em casos reproduzíveis com evidência esperada.
- [ ] Registrar como bloqueadores: autorização incorreta, perda de dados, cobrança errada, ausência de recuperação e backup não restaurável.
- [ ] Documentar privacidade, contrato/revisão jurídica, dados do piloto, rollback e monitoramento da primeira semana.
- [ ] Executar regressão automatizada completa; manter aceites humanos e integrações externas desmarcados.
- [ ] Commit `docs: add launch homologation runbook`.

### Pendências externas que não bloqueiam 8A–8C

- OAuth do Google Drive, publicação do backup e restauração em projeto separado permanecem pendentes por decisão do responsável.
- Instalação e push em Android/iPhone exigem dispositivos físicos.
- Revisão do contrato e da política de privacidade exigem aprovação do professor e revisão jurídica externa.
- O piloto e a comprovação de autonomia do professor exigem participação humana; não podem ser simulados como aceitos.

## 8.1 Automação de qualidade

**Arquivos:** criar `playwright.config.ts`, `tests/e2e/`, `tests/security/`, `.github/workflows/ci.yml`, `docs/release-checklist.md`.

- [x] Configurar CI para instalação limpa, lint, typecheck, testes, build e E2E público; habilitar a matriz autenticada somente com ambiente isolado.
- [ ] Criar fixtures descartáveis para professor, adulto, responsável, dois menores e usuário externo.
- [ ] Cobrir cadastro→aprovação→contrato→cobrança→comprovante→aprovação e turma→chamada→exame.
- [ ] Testar matriz de autorização por API, ação e download; URL conhecida nunca substitui permissão.
- [ ] Testar CSRF, sessão expirada, upload malicioso, rate limit, logs sem dados sensíveis e dependências vulneráveis.
- [ ] Simular falha de cron, Storage, push e Drive; a interface deve preservar estado e orientar repetição segura.

## 8.2 Homologação funcional

- [ ] Conferir desktop, Android e iPhone: instalação, login, formulário, assinatura, upload, painel e push.
- [ ] Comparar relatórios com cálculo manual de um mês contendo desconto, atraso, comprovante rejeitado, estorno e taxa de exame.
- [ ] Fazer professor executar cadastro, revisão, cobrança, chamada, exame, aviso e cancelamento sem console técnico.
- [ ] Validar texto contratual aprovado pelo professor e revisão jurídica externa antes de coletar assinaturas reais.
- [ ] Validar política de privacidade, consentimento, retenção e canal para correção/exclusão de dados.

## 8.3 Piloto e liberação

- [ ] Iniciar piloto com professor e duas famílias que representem adulto, menor e irmãos.
- [ ] Registrar problemas por severidade; bloquear lançamento para perda de dados, autorização incorreta, cobrança errada ou fluxo sem recuperação.
- [ ] Repetir casos afetados após correções e executar regressão crítica completa.
- [ ] Configurar domínio, remetentes, PIX, valores, turmas, contrato, VAPID, Drive, alertas e conta administrativa de recuperação.
- [ ] Executar backup e restauração final; registrar versão e checklist assinado pelo responsável pelo sistema.
- [ ] Abrir cadastro gradualmente e monitorar erros, cron, espaço e suporte diariamente na primeira semana.

## Gate de aceite

- [ ] CI verde, nenhuma falha crítica/alta aberta e matriz de autorização aprovada.
- [ ] Totais financeiros reconciliados; push é complementar e avisos permanecem no portal.
- [ ] Professor conclui roteiro operacional sem ajuda do desenvolvedor.
- [ ] Backup restaurado e procedimento de incidente acessível.
