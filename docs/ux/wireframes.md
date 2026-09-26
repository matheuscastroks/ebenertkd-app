# Wireframes e Hierarquia Visual — Ebener TKD (R2)

Estrutura visual das telas prioritárias para desktop e dispositivos móveis (360 px), garantindo hierarquia de causa e efeito e estrutura limpa.

---

## 1. Dashboard do Professor (`/admin`)

```
+--------------------------------------------------------------------+
| Sidebar | Olá, Matheus                                             |
|         | Resumo operacional e tarefas de hoje                     |
+---------+----------------------------------------------------------+
|         | [!] AGUARDANDO SUA CONFERÊNCIA                           |
|         | +----------------------------+-------------------------+ |
|         | | Matrículas para análise(2) | Comprovantes PIX (1)    | |
|         | | - João Silva  [Analisar]   | - R$ 150,00 [Conferir]  | |
|         | | - Maria Clara [Analisar]   |                         | |
|         | +----------------------------+-------------------------+ |
|         |                                                          |
|         | [CALENDAR] TREINOS DE HOJE (Terça-feira)                 |
|         | +----------------------------+-------------------------+ |
|         | | Turma Infantil             | Turma Adulto Avançado   | |
|         | | 18:00 às 19:00 - Dojô 1    | 19:30 às 20:30 - Dojô 1 | |
|         | | [Iniciar chamada]          | [Iniciar chamada]       | |
|         | +----------------------------+-------------------------+ |
|         |                                                          |
|         | [METRICS] Recebido | Atraso | Turmas Ativas | Alunos     |
|         |                                                          |
|         | [EXAME] Próximo Exame de Faixa | Operação & Avisos       |
+--------------------------------------------------------------------+
```

### Adaptação Mobile (360 px):
- Fila de conferência empilha em coluna única.
- Botões de ação direta ocupam largura total da linha.
- Treinos de hoje exibem primeiro as turmas com botão de chamada em destaque para uso imediato pelo professor no tatame.

---

## 2. Dashboard do Aluno (`/aluno`)

```
+--------------------------------------------------------------------+
| Sidebar | Olá, Lucas                             [Faixa Amarela 8º]|
|         | Acompanhe seus treinos e mensalidades                    |
+---------+----------------------------------------------------------+
|         | [HERO CARD: SEU PRÓXIMO TREINO]                          |
|         | (*) HOJE TEM TREINO!                                     |
|         | Seu treino é hoje, das 19:30 às 20:30                    |
|         | Turma Juvenil/Adulto · Dojô Central · [Ver frequência]   |
|         |                                                          |
|         | [ALERTA DE MENSALIDADE: SE HOUVER EM ABERTO]             |
|         | ($) Mensalidade em aberto: R$ 150,00 · Vence em 10/10    |
|         | [Pagar via PIX / Enviar comprovante]                     |
|         |                                                          |
|         | [METRICS]                                                |
|         | +----------------------------+-------------------------+ |
|         | | Frequência: 92%            | Situação: Tudo em dia   | |
|         | +----------------------------+-------------------------+ |
|         |                                                          |
|         | [DADOS CADASTRAIS]           | [DOCUMENTOS & CONTRATOS]|
|         | Nome, WhatsApp, Endereço     | Meus contratos          |
|         | [Editar dados e endereço]    | Pagamentos e PIX        |
+--------------------------------------------------------------------+
```

---

## 3. Formulário de Matrícula (`/aluno/matricula`)

```
+--------------------------------------------------------------------+
| [BARRA DE PROGRESSO]: 8 de 11 dados essenciais preenchidos [73%]   |
|                                                                    |
| 1. IDENTIFICAÇÃO: Nome completo, CPF, Data de Nascimento           |
| 2. CONTATOS E ENDEREÇO:                                            |
|    - WhatsApp, Contato do Responsável                              |
|    - CEP (busca automática) -> Rua, Número, Compl, Bairro, Cidade, UF|
| 3. CONTATO DE EMERGÊNCIA: Nome, Parentesco, Telefone               |
| 4. HISTÓRICO DE TAEKWONDO: Início no TKD, Turma Desejada, Faixa/Gub|
| 5. SAÚDE E BEM-ESTAR: Restrições, Medicamentos, Alergias           |
| 6. PREFERÊNCIA DE VENCIMENTO: Dia 5, 10, 15, 20 ou 25              |
| 7. DOCUMENTOS: Foto do Aluno (obrigatória), Atestado Médico        |
|                                                                    |
| [BARRA FLUTUANTE INFERIOR]: [Salvar rascunho] [Enviar para análise]|
+--------------------------------------------------------------------+
```
