# Checklist de Homologação e Lançamento

Registre versão, commit, data, ambiente e responsável. Não use dados de alunos reais antes de concluir segurança, contrato e privacidade.

## Automação obrigatória

- [ ] `npm ci`
- [ ] `npm audit --omit=dev --audit-level=high`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `npm run test:e2e -- --grep-invert @authenticated`
- [ ] `npm run test:e2e:auth` no Appwrite isolado
- [ ] `npm run release:preflight` sem nenhuma linha `FAIL`

## Configuração

- [ ] Domínio HTTPS e URL de recuperação conferidos.
- [ ] Conta administrativa de recuperação ativa e protegida.
- [ ] PIX, beneficiário, mensalidade, descontos, vencimentos e turmas aprovados.
- [ ] Contrato publicado aprovado pelo professor e por revisão jurídica externa.
- [ ] Política de privacidade informa finalidade, base legal, retenção, operadores, canal de correção/exclusão e contato do controlador.
- [ ] VAPID, remetente, cron e alertas validados sem segredos nos logs.
- [ ] OAuth do Drive em produção, backup completo nas últimas 24 horas e restauração comprovada em projeto separado.

## Homologação humana

- [ ] Matriz em `docs/security-test-matrix.md` aprovada.
- [ ] Roteiro em `docs/pilot-script.md` concluído pelo professor e pelas duas famílias.
- [ ] Desktop, Android e iPhone aprovados para login, cadastro, upload, assinatura, painel, instalação e push.
- [ ] Mês financeiro reconciliado manualmente.
- [ ] Nenhum problema crítico ou alto aberto.

## Liberação e retorno

1. Registre um backup completo e o commit liberado.
2. Abra cadastro para um grupo pequeno; não importe toda a academia de uma vez.
3. Monitore diariamente por sete dias: falhas, último cron, último backup, armazenamento, inadimplência e chamados.
4. Em autorização incorreta, cobrança errada ou perda de dados, suspenda novos cadastros, preserve logs sanitizados e volte ao último commit estável.
5. Não apague registros para “corrigir” produção. Registre estorno, cancelamento ou correção auditável e execute restauração apenas conforme `docs/operations.md`.

O lançamento só é aprovado quando professor e responsável técnico assinam este checklist. A conexão do Google Drive pode ficar pendente durante o desenvolvimento, mas bloqueia a liberação para alunos reais.
