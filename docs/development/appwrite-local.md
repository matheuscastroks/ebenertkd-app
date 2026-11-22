# Appwrite local e produção

O `.env` da raiz preserva a configuração anterior do Cloud. O `.env.local` contém
apenas a instância Docker e suas próprias chaves. Ambos são privados e ignorados
pelo Git. O `.local/appwrite/.env` configura os containers, não o Next.js.

| Comando | Ambiente | Artefatos |
| --- | --- | --- |
| `npm run dev` | `.env.local`, Docker | `.next-local` |
| `npm run build:dev` / `npm run start:dev` | `.env.local`, Docker | `.next-local` |
| `npm run build` / `npm run start` | `.env`, Cloud | `.next` |
| `npm run infra:plan` e demais scripts Appwrite | `.env.local`, Docker | — |
| `npm run env:production -- infra:plan` | `.env`, Cloud | — |

Use os comandos npm para executar o Next.js. Executar `npx next` diretamente
retoma a precedência padrão do Next (`.env.local` antes de `.env`). O seletor
carrega exatamente um arquivo e impede esse fallback nos processos filhos.
Reinicie o comando depois de editar as variáveis do arquivo selecionado.
Variáveis já fornecidas pelo terminal/servidor têm prioridade; evite exportar
credenciais de outro ambiente no terminal. Valores nos arquivos são literais,
sem expansão de referências `$VAR`. Em CI/deploy, as variáveis do provedor
continuam funcionando sem arquivos locais. Ajuste `APP_URL` para o domínio real
no ambiente de produção; a cópia inicial preserva o valor anterior.

## Nesta máquina

O WSL2 foi ajustado de 3 para 6 GB em `C:\Users\Matheus\.wslconfig`, preservando
4 processadores e 2 GB de swap. A cópia anterior está em `.wslconfig.before-appwrite`.
Esse limite é compartilhado por todas as distribuições WSL2 e pelo Docker.

- Console: <http://localhost:8080>
- API: <http://localhost:8080/v1>
- Aplicação: <http://localhost:3000>
- Acesso ao console: `.local/appwrite/credentials.json` (privado).
- Senhas dos perfis de teste: variáveis `TEST_*_PASSWORD` do `.env.local`.

`npm run appwrite:local:up` inicia os containers; `npm run appwrite:local:stop`
interrompe sem remover os dados; `npm run appwrite:local:status` mostra seu estado.
Os dados ficam em volumes Docker. Não use `down -v` se quiser preservá-los.

## Recriar em outra máquina Windows

Requisitos: Docker Desktop com WSL2, pelo menos 4 GB disponíveis para o Docker
(6 GB configurados aqui), 2 GB de swap e Node.js 24.

1. Preserve a configuração Cloud no `.env` antes de substituir `.env.local`.
2. Execute `npm run appwrite:local:install` para copiar os templates e gerar
   segredos exclusivos em `.local/appwrite`.
3. Aguarde `npm run appwrite:local:status` mostrar o serviço Appwrite saudável.
4. Execute `npm run appwrite:local:bootstrap` para criar conta, projeto e chave
   locais e escrever o `.env.local`. O bootstrap só acessa `localhost:8080`.
5. Execute `npm run infra:apply -- --skip-functions`,
   `npm run appwrite:seed-test-users` e `npm run appwrite:seed-demo-data`.
6. Execute `npm run dev`; depois `npm run appwrite:validate-test-users`.

Os seeds são dados de demonstração; não copiam dados pessoais do Cloud. Drive,
backup e restauração ficam sem credenciais no desenvolvimento. As Functions não
são implantadas por essa preparação de prévia; sua implantação é uma operação
separada. Push tem chaves locais próprias. Browser, executor, orchestrator e MQTT
ficam no perfil Compose opcional `compute`; a prévia padrão usa os serviços de
autenticação, banco, storage, realtime, console e manutenção. Para habilitar
execuções, inicie o Compose com `--profile compute` antes de implantar Functions.

Templates: Appwrite 2.7.2, PostgreSQL e workers combinados, com AutoGravity
desativado e portas vinculadas a `127.0.0.1`. O Compose foi obtido do gerador da
[instalação oficial](https://appwrite.io/docs/advanced/self-hosting/installation).
Os arquivos auxiliares vêm da tag `2.7.2` de `appwrite/appwrite`.
