# Contrato de dados do MVP

O Appwrite Auth mantém identidades e sessões. O TablesDB armazena dados de negócio com segurança por linha; operações administrativas usam exclusivamente o cliente de servidor.

## Identidades e capacidades

- `admin`: professor com acesso operacional global.
- `adult_student`: aluno adulto com capacidade `student`.
- `guardian`: responsável com capacidade `guardian`.
- `minor_student`: aluno menor com capacidade `student` e login por username.
- Uma conta adulta pode acumular `student` e `guardian` sem duplicar identidade.

`profiles.account_id` referencia o usuário do Appwrite Auth. O papel define a experiência principal; `capabilities` controla autorização. Código de negócio nunca deve confiar somente na URL acessada.

## Tabelas implementadas

- `profiles`: nome, e-mail, username opcional, papel, capacidades, status e timestamps.
- `guardian_student_links`: vínculo entre responsável e menor, com estado e criador.
- `audit_events`: eventos sensíveis com ator, entidade e metadados mínimos.
- `automation_runs`: controle idempotente das Functions agendadas.

## Entidades planejadas

As fases seguintes acrescentam fichas de alunos, documentos, contratos, cobranças, pagamentos, turmas, presenças, exames, avisos e inscrições de push. Campos monetários usam centavos inteiros (`*_cents`) e entidades mutáveis mantêm `created_at` e `updated_at`.

## Invariantes de acesso

- O cadastro público nunca cria administradores.
- Cada perfil pode ler sua própria linha; a chave administrativa não é enviada ao navegador.
- Um responsável só administra credenciais de menores ligados por vínculo ativo.
- O menor não recebe dados financeiros nem informações de irmãos.
- A transição para conta adulta revoga sessões anteriores e impede que o responsável redefina a nova senha.
- Toda alteração de schema deve existir em `scripts/appwrite/schema.ts` antes de ser aplicada.

## Storage

O bucket privado `private-files` aceita imagens e PDF de até 5 MB. Arquivos futuros devem usar prefixos por perfil ou aluno, por exemplo `students/PROFILE_ID/medical/atestado.pdf`, e receber permissões explícitas por arquivo.
