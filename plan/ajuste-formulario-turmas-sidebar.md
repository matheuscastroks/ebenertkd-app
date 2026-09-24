# Ajuste da Fase 2 — Formulário, Turmas e Sidebar

**Objetivo:** tornar a matrícula clara para o aluno e centralizar a navegação e a gestão de turmas.

## 1. Regras da matrícula

- [x] Separar dados pessoais, contato, emergência, Taekwondo, saúde, pagamento e documentos.
- [x] Restringir GUB às opções de 9º a 1º.
- [x] Disponibilizar faixas comuns de graduação colorida, Poom e preta.
- [x] Restringir vencimentos aos dias 5, 10, 15, 20, 25 e 30.
- [x] Validar as mesmas opções no servidor, sem depender apenas da interface.

## 2. Gestão de turmas

- [x] Criar a tabela `training_classes` no Appwrite.
- [x] Permitir ao professor cadastrar nome, dias, início, término e capacidade.
- [x] Permitir edição, desativação e reativação sem apagar histórico.
- [x] Mostrar na matrícula apenas turmas ativas ou a turma já selecionada pelo aluno.
- [x] Persistir o ID da turma e um nome de referência na ficha.

## 3. Navegação dos painéis

- [x] Usar `SidebarProvider`, `AppSidebar` e `SidebarInset` como shell principal.
- [x] Organizar menus próprios para professor, aluno adulto, responsável e menor.
- [x] Exibir estado ativo, ícones, recolhimento no desktop e menu móvel.
- [x] Manter logout disponível no cabeçalho de todas as telas autenticadas.

## 4. Aceite

- [x] Testes, lint, TypeScript, build e smoke test aprovados.
- [x] Schema aplicado e reconciliador sem alterações pendentes.
- [x] Painel do aluno inspecionado em desktop e celular.
- [ ] Conferir visualmente as telas administrativas com uma sessão do professor.
