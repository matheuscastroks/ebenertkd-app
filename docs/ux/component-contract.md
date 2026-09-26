# Contrato de Componentes e Linguagem — Ebener TKD (R3)

Definição formal de padrões de interação, componentes compartilhados, contratos de feedback e vocabulário da academia.

---

## 1. Contrato de Componentes

| Necessidade de Interface | Componente Padrão | Localização | Diretrizes |
| :--- | :--- | :--- | :--- |
| **Campos de Formulário** | `Field`, `FieldLabel`, `FieldDescription` | `@/components/ui/field` | Agrupamento semântico com rótulo associado via `htmlFor`. |
| **Entrada de Endereço** | `AddressFields` | `@/components/shared/address-fields` | CEP com máscara, busca automática no ViaCEP, foco no número, suporte a fallback manual. |
| **Entrada de Telefone** | `PhoneField` | `@/components/shared/phone-field` | Máscara brasileira com 8 ou 9 dígitos com DDD. |
| **Datas** | `DateField` | `@/components/shared/date-field` | Exibição em formato pt-BR (`DD/MM/AAAA`) com armazenamento padronizado em ISO (`YYYY-MM-DD`). |
| **Envio e Ações Críticas** | `FormSubmitButton` | `@/components/shared/form-submit-button` | Bloqueio de duplo clique (`useFormStatus`), spinner visível e texto de progresso. |
| **Graduação e Faixas** | `BeltBadge` | `@/features/students/components/belt-badge` | Fundo cinza suave uniforme com destaque para a cor real da faixa e gub/dan do praticante. |
| **Feedback de Operações** | `OperationToast` / `sonner` | `@/components/shared/operation-toast` | Retorno transitório via toast estruturado (`tone: "success" | "error" | "info"`). |
| **Modais Responsivos** | `ResponsiveDialog` / `Dialog` | `@/components/shared/responsive-dialog` | Modal centralizado no desktop e gaveta inferior no mobile. |
| **Avisos e Mensagens** | `Drawer` | `@/components/ui/drawer` | Drawer lateral deslizante à direita com histórico e arquivamento de lidos. |

---

## 2. Mapa de Linguagem e Vocabulário do Dojang

Evitar termos técnicos frios e utilizar os termos reconhecidos no Taekwondo e na administração escolar:

| Termo Técnico / Bruto | Termo de Produto Adotado | Contexto |
| :--- | :--- | :--- |
| `draft` | **Rascunho** | Ficha iniciada pelo aluno mas ainda não enviada. |
| `submitted` / `under_review` | **Em análise pelo professor** | Documentos em análise na secretaria do dojang. |
| `approved` | **Aprovado** | Documento ou matrícula validada. |
| `rejected` | **Precisa de correção** | Documento inelegível com motivo específico. |
| `awaiting_signature` | **Aguardando assinatura** | Contrato gerado aguardando aceite. |
| `active` | **Ativo(a)** | Aluno matriculado e liberado para os treinos. |
| `proof_under_review` | **Comprovante em análise** | Pagamento via PIX aguardando conferência bancária. |
| `overdue` | **Em atraso** | Mensalidade vencida que necessita de quitação. |
| `black_1_dan` | **Faixa Preta (1º Dan)** | Graduação de faixa preta unificada. |

---

## 3. Diretrizes de Causa e Efeito e Feedback

1. **Retorno Imediato**: Nenhuma ação do usuário deve acontecer sem feedback visual. Botões devem apresentar spinner imediato durante requisições de rede.
2. **Preservação de Dados**: Erros de validação nunca devem limpar campos já preenchidos.
3. **Ações Reversíveis vs. Destrutivas**:
   - Cancelamentos de matrícula ou contratos exigem `AlertDialog` com explicação das consequências.
   - Operações cotidianas (marcar como lido) devem possuir opção de recuperação ou visualização no histórico.
