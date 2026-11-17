# E2E autenticado — ambiente isolado

O gate da Onda 3 **não foi executado** enquanto `E2E_APPWRITE_PROJECT_ID` estiver ausente. `playwright --list` só valida coleta dos testes, sem executar os fluxos.

Suba uma aplicação **local**, com schema, Functions necessárias e bucket privado num projeto Appwrite descartável. Aplique infraestrutura e prepare as personas apenas após conferir esse projeto. Nenhum destes testes chama scripts de seed nem APIs administrativas diretamente.

Configure pelo ambiente, sem colocar credenciais no repositório:

- `E2E_APPWRITE_PROJECT_ID` e `NEXT_PUBLIC_APPWRITE_PROJECT_ID`: mesmo projeto isolado.
- `APPWRITE_PROJECT_ID`, se definido: também deve corresponder ao isolado.
- `PRODUCTION_APPWRITE_PROJECT_ID`: identifica produção adicionalmente ao ID fixo proibido `6ab4c32e00317977eeb6`.
- `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`: administrador existente no projeto isolado.
- `E2E_ADULT_EMAIL`, `E2E_ADULT_PASSWORD`: e-mail usado como base para contas novas com alias único e senha fornecida pelo ambiente; o teste efetua cadastro pela interface.
- `E2E_GUARDIAN_EMAIL`, `E2E_GUARDIAN_PASSWORD`: responsável existente.
- `E2E_MINOR_PASSWORD`: senha inicial dos dois menores sintéticos criados pela interface.
- `E2E_BASE_URL`, opcional: HTTP em `localhost`, `127.0.0.1` ou `::1`; padrão `http://127.0.0.1:3101`. URLs remotas são recusadas porque o ambiente local não comprova a configuração efetiva da aplicação remota.

Os guards impedem navegação autenticada quando o projeto coincide com produção, quando os IDs da aplicação divergem ou quando o alvo não é local. Uma variável ausente gera skip explícito; uma combinação insegura configurada falha antes de login/mutação. A matriz de papéis utiliza o mesmo guard.

A validação de ambiente está em `scripts/testing/e2e-environment.ts`, sem import de Playwright e sem estado global mutável. Seus 10 casos reproduzíveis validam ausência de configuração, produção fixa/customizada, IDs divergentes, alvo remoto, três formas de loopback e independência entre chamadas, sem abrir navegador ou acessar rede:

```powershell
npx vitest run scripts/testing/e2e-environment.test.ts --maxWorkers=1 --pool=threads
```

Quando o projeto E2E é configurado, Playwright inicia uma nova aplicação local com `reuseExistingServer: false`, herdando o ambiente isolado e alinhando a URL da aplicação. Se a porta já estiver ocupada, a execução falha; nunca reutiliza silenciosamente um servidor iniciado com outras credenciais. Todos os contextos autenticados bloqueiam requests externos do navegador, inclusive o ping legado com projeto fixo, sem substituir respostas das APIs da aplicação.

Execute, somente no ambiente isolado:

```powershell
npx playwright test tests/e2e/lifecycle.spec.ts --workers=1
```

O ciclo completo roda uma vez no projeto desktop para evitar publicação concorrente do modelo único de contrato. Ele cria turma, publica modelo, cadastra aluno, preenche quatro passos e envia arquivos sintéticos, aprova atestado/condições, libera assinatura, assina o contrato, confere cobrança gerada, envia e aprova comprovante, faz chamada e registra/aprova exame. Confirma pagamento e resultado nos portais.

O cenário familiar roda em desktop e mobile: cria dois menores, troca o contexto mantendo a seção, salva alteração no filho correto e verifica isolamento dos formulários. Entra com o menor criado e verifica ausência de valores/atalhos financeiros e bloqueio da URL financeira.

Os testes deixam contas e registros sintéticos com sufixo único para inspeção e auditoria. A publicação altera o modelo daquele ambiente isolado. Use projeto descartável; os testes não removem registros automaticamente. Artefatos e traces podem conter os dados sintéticos do fluxo; mantenha-os privados.

Não há evidência de gate aprovado até executar e revisar os resultados num projeto isolado configurado. Dispositivos reais e piloto permanecem pendentes.
