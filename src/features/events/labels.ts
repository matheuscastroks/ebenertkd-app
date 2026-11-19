import type { EventStatus, EventType, RegistrationStatus } from "@/features/events/types";

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  belt_exam: "Exame de faixa",
  championship: "Campeonato",
  seminar: "Aulão ou seminário",
  social: "Confraternização",
  other: "Outro evento"
};

export const EVENT_TYPE_HINT: Record<EventType, string> = {
  belt_exam: "Banca de graduação com elegibilidade, taxa e promoção de faixa.",
  championship: "Equipe, categorias e prazos da federação.",
  seminar: "Vagas limitadas, taxa opcional e controle de presença.",
  social: "Confirmação de presença com acompanhantes e cota opcional.",
  other: "Inscrição simples configurável."
};

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  draft: "Rascunho",
  published: "Publicado",
  registration_open: "Inscrições abertas",
  registration_closed: "Inscrições encerradas",
  in_progress: "Em andamento",
  completed: "Concluído",
  cancelled: "Cancelado"
};

export const REGISTRATION_STATUS_LABEL: Record<RegistrationStatus, string> = {
  interested: "Interesse",
  pending_approval: "Aguardando aprovação",
  confirmed: "Confirmada",
  waitlisted: "Lista de espera",
  checked_in: "Presença registrada",
  completed: "Concluída",
  no_show: "Não compareceu",
  rejected: "Recusada",
  cancelled: "Cancelada"
};

/** Mensagens de erro dos serviços e actions, em português. */
export const EVENT_ERROR_MESSAGE: Record<string, string> = {
  admin_required: "Apenas o professor pode fazer isso.",
  event_not_found: "Evento não encontrado.",
  event_registration_closed: "As inscrições deste evento não estão abertas.",
  event_terminal: "O evento já foi encerrado ou cancelado.",
  event_option_not_found: "Opção de inscrição não encontrada.",
  event_not_eligible: "O aluno não atende aos requisitos desta opção.",
  event_guests_not_allowed: "Este evento é só para alunos.",
  event_companions_not_allowed: "Este evento não aceita tantos acompanhantes.",
  event_terms_required: "É preciso aceitar os termos para se inscrever.",
  active_enrollment_required: "O aluno precisa ter matrícula ativa.",
  registration_forbidden: "Você não pode alterar esta inscrição.",
  registration_not_found: "Inscrição não encontrada.",
  registration_invalid_transition: "Esta inscrição não pode mudar para esse estado.",
  event_invalid_transition: "O evento não pode mudar para esse estado.",
  event_paid_charge_decision_required: "Há cobrança paga: escolha entre crédito futuro e manter a cobrança.",
  event_has_active_registrations: "Há inscrições ativas: informe como tratar os pagamentos.",
  guardian_required: "A inscrição de menor precisa ser feita pelo responsável.",
  event_not_championship: "Esta ação vale só para campeonatos.",
  event_category_limit: "O atleta já tem uma categoria desta modalidade neste campeonato.",
  event_category_locked: "O prazo de troca de categoria já passou. Fale com o professor.",
  registration_not_ready: "Faltam autorização, termo ou documentos aprovados para confirmar este atleta.",
  registration_already_submitted: "A inscrição já foi enviada à federação. Fale com o professor para alterar.",
  document_not_found: "Documento não encontrado.",
  document_file_required: "Escolha o arquivo do documento.",
  rejection_reason_required: "Informe o motivo da recusa.",
  invalid_size: "O arquivo precisa ter até 5 MB.",
  invalid_signature: "Envie uma imagem (JPG, PNG ou WebP) ou PDF válido.",
  invalid_extension: "A extensão do arquivo não corresponde ao tipo.",
  bulk_empty: "Selecione ao menos uma inscrição.",
  "Informe um peso válido": "Informe um peso válido, em kg (ex.: 45,5).",
  "Selecione ao menos um atleta": "Selecione ao menos um atleta."
};

export function eventErrorMessage(code: string | undefined | null, fallback = "Não foi possível concluir. Tente novamente.") {
  return (code && EVENT_ERROR_MESSAGE[code]) || fallback;
}
