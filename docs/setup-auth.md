# Autenticação com Appwrite

## Preparação

Copie `.env.example` para `.env.local` e preencha `APPWRITE_API_KEY` com uma chave de servidor que tenha acesso a usuários, sessões e linhas do TablesDB. Nunca exponha essa chave em variáveis `NEXT_PUBLIC_*`.

Crie ou atualize os recursos declarados no repositório:

```bash
npm run infra:plan
npm run infra:apply
npm run infra:smoke
```

## Primeiro administrador

O cadastro público não aceita o papel administrativo. Depois de aplicar o schema, crie o professor pela CLI:

```bash
npm run appwrite:create-admin -- --name "Professor" --email professor@exemplo.com --password "uma-senha-segura"
```

Evite colocar a senha no histórico de um terminal compartilhado. Troque-a no Appwrite após o primeiro acesso, se necessário.

## Fluxos disponíveis

- Adultos entram por e-mail e podem se cadastrar como aluno ou responsável.
- Um aluno adulto pode ativar também a capacidade de responsável sem duplicar a conta.
- Responsáveis criam o nome de usuário e a senha inicial de menores, redefinem a senha e revogam sessões.
- Menores entram por nome de usuário. O e-mail técnico é resolvido apenas no servidor.
- A recuperação de senha adulta usa o e-mail cadastrado e sempre mostra uma resposta neutra.
- Na transição aos 18 anos, o administrador informa o e-mail próprio, decide se mantém o vínculo de consulta, encerra sessões antigas e dispara a definição de nova senha.

## Verificação

Execute `npm test`, `npm run lint`, `npm run typecheck` e `npm run build`. Para o aceite manual, entre com os quatro papéis e tente abrir diretamente `/admin`, `/aluno`, `/responsavel` e `/menor`; acessos incompatíveis devem ser redirecionados.
