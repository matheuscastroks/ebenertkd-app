# Fase 8 — Homologação e lançamento Implementation Plan

> **For agentic workers:** execute os itens em ordem e marque os checkboxes somente após comprovar o resultado. Não usar alunos reais antes do gate de segurança.

**Goal:** comprovar segurança, confiabilidade e usabilidade operacional antes da entrada dos alunos reais.

**Architecture:** testes automatizados cobrem regras e autorização; uma matriz manual cobre dispositivos e operação. O piloto usa duas famílias e critérios objetivos antes da liberação geral.

**Tech Stack:** Vitest, Testing Library, Playwright, Appwrite preview/production.

---

## 8.1 Automação de qualidade

**Arquivos:** criar `playwright.config.ts`, `tests/e2e/`, `tests/security/`, `.github/workflows/ci.yml`, `docs/release-checklist.md`.

- [ ] Configurar CI para instalação limpa, lint, typecheck, testes, build e E2E contra ambiente isolado.
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

