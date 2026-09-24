# Matriz de Segurança para Homologação

Execute esta matriz somente no projeto Appwrite de homologação. Registre data, versão/commit, executor e evidência. Uma URL conhecida nunca concede acesso por si só.

## Papéis e rotas

| Cenário | Resultado esperado |
| --- | --- |
| Sem sessão em `/admin`, `/aluno` ou `/responsavel` | Redirecionamento para `/` com erro genérico; nenhum dado privado no HTML |
| Aluno ou responsável em `/admin/sistema` | Redirecionamento ao próprio portal |
| Administrador em `/aluno` | Redirecionamento para `/admin` |
| Responsável acessa dependente não vinculado | Acesso negado pelo serviço, mesmo com ID válido |
| Menor solicita atestado ou comprovante | Acesso negado; foto própria continua disponível |
| Aluno solicita contrato, comprovante ou documento de outro aluno | Resposta sem arquivo e sem metadados do titular |

Execute `npm run test:e2e:auth` com `E2E_*` apontando para o projeto isolado. O teste recusa o ID informado em `PRODUCTION_APPWRITE_PROJECT_ID`.

## Sessão, origem e abuso

- Exclua a sessão no Appwrite e repita uma ação: deve voltar ao login sem gravar dados.
- Envie uma Server Action com `Origin` diferente do domínio: o Next.js deve rejeitar a requisição antes da ação.
- Faça seis tentativas inválidas para um menor em 15 minutos: a resposta permanece genérica e não confirma usuário existente. Repita o teste do limite nativo do Appwrite para login adulto.
- Confirme cookies `HttpOnly`, `Secure` em produção e `SameSite=Lax`; nenhuma sessão pode aparecer em JavaScript, URL ou log.

## Arquivos e downloads

- Renomeie um executável para `.jpg`: upload rejeitado pela assinatura binária.
- Envie MIME, extensão e conteúdo divergentes, arquivo vazio e arquivo acima de 5 MB: todos rejeitados.
- Confira `Content-Type`, `Content-Disposition` e `Cache-Control: private, no-store` nos downloads permitidos.
- Revogue o vínculo familiar e repita o download previamente autorizado: deve falhar imediatamente.

## Logs e dependências

- Force falha de push, cron e backup com credencial inválida no ambiente isolado. Logs e `last_error` não podem conter e-mail, senha, token, chave, cookie ou conteúdo clínico.
- Rode `npm audit --omit=dev --audit-level=high`. Vulnerabilidade alta ou crítica bloqueia a versão.
- Execute `npm run release:preflight`; qualquer linha `FAIL` bloqueia lançamento. Backup pendente deve continuar falhando até a integração com Drive e o ensaio de restauração.
