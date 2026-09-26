# Revisão Geral de Produto e UX — Baseline e Inventário (R0)

Data: 26/09/2026.
Repositório: `ebenertkd-app`
Framework: Next.js 16.3.6 (App Router), Tailwind CSS v4, shadcn/ui.
Ambiente: Local (`localhost:3000`) e Appwrite Cloud.

---

## 1. Perfis e Capacidades de Acesso

| Perfil (`role`) | Capacidades (`capabilities`) | Escopo Operacional |
| :--- | :--- | :--- |
| **Professor / Administrador** (`admin`) | `["admin"]` | Gestão de turmas, chamadas, exames, revisão de matrículas, emissão de contratos e conciliação financeira. |
| **Aluno Adulto** (`student`) | `["student"]` (pode ter `guardian`) | Preenchimento de matrícula, assinatura de contrato, visualização do próximo treino, frequência e pagamento via PIX. |
| **Responsável Familiar** (`guardian`) | `["guardian"]` | Gestão de dependentes menores, preenchimento de ficha de dependentes, assinatura contratual e quitação de mensalidades. |
| **Aluno Menor de Idade** (`minor_student`) | `["student"]` | Consulta do próximo treino, frequência registrada, graduação e avisos da academia. |

---

## 2. Inventário de Rotas e Telas por Perfil

### Professor / Admin (`/admin`)
- `/admin`: Visão geral operacional com tarefas urgentes (matrículas e comprovantes para conferir), treinos de hoje para chamada rápida e métricas financeiras.
- `/admin/matriculas`: Fila de matrículas com filtros por status, faixa, turma e busca com debounce.
- `/admin/matriculas/[studentId]`: Painel de revisão documental, aprovação, rejeição com motivo e homologação contratual.
- `/admin/alunos/acessos`: Consulta de contas cadastradas e promoção contextual de aluno menor para acesso próprio via e-mail.
- `/admin/turmas`: Grade semanal, horários, capacidade e status das turmas.
- `/admin/turmas/[classId]`: Detalhes da turma e lista de chamadas de aula.
- `/admin/financeiro`: Conciliação financeira, fila de comprovantes enviados, indicadores do mês e exportação CSV.
- `/admin/exames`: Planejamento e homologação de graduações de faixa.
- `/avisos`: Envio de comunicados globais ou por turma via drawer lateral com histórico.

### Aluno (`/aluno`)
- `/aluno`: Card hero com cálculo dinâmico do próximo treino, situação financeira com botão de ação direta, frequência e dados cadastrais.
- `/aluno/matricula`: Formulário estruturado com dados pessoais, endereço integrado com ViaCEP, contatos de emergência e upload de documentos.
- `/aluno/frequencia`: Histórico de presenças, faltas justificadas e taxa de assiduidade.
- `/aluno/contratos`: Visualização e download de contratos assinados.
- `/aluno/financeiro`: Fatura do mês, chave PIX com botão de cópia e envio de comprovante.

### Responsável (`/responsavel`)
- `/responsavel`: Visão geral com seletor de dependente ativo e pendências do menor.
- `/responsavel/dependentes`: Cadastro e acompanhamento de múltiplos filhos/dependentes.
- `/responsavel/dependentes/[profileId]/matricula`: Ficha de matrícula do dependente.
- `/responsavel/dependentes/[profileId]/financeiro`: Cobranças e pagamentos vinculados ao dependente.

---

## 3. Classificação de Achados e Melhorias Aplicadas

1. **Hierarquia de Dashboards**:
   - *Antes*: Cards genéricos de contagem estática.
   - *Melhoria*: Fila de ações urgentes com nomes e botões diretos de análise/conferência; card hero do próximo treino no aluno.
2. **Endereço e Cadastro**:
   - *Antes*: Campo único de texto livre para endereço.
   - *Melhoria*: Campos estruturados (Rua, Número, Bairro, Cidade, UF) com busca automática de CEP via ViaCEP e foco no número.
3. **Comunicação de Avisos**:
   - *Antes*: Página estática com cards grandes e botões dropdown.
   - *Melhoria*: Drawer lateral moderno com leitura rápida, botão "Marcar como lido" e histórico arquivado.
4. **Feedback do Sistema**:
   - *Antes*: Inferência frágil de tom de toast via `message.includes("não")`.
   - *Melhoria*: Objeto estruturado `{ tone: "success" | "error", title }` direto nos workspaces.
