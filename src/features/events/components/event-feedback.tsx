import { OperationToast } from "@/components/shared/operation-toast";
import { eventErrorMessage } from "@/features/events/labels";

const OK_COPY: Record<string, [string, string?]> = {
  registered: ["Inscrição confirmada", "A vaga está garantida."],
  waitlisted: ["Você entrou na lista de espera", "Avisaremos se abrir uma vaga."],
  interested: ["Interesse registrado", "O responsável recebeu um aviso para confirmar."],
  pending: ["Inscrição enviada", "Aguardando a aprovação do professor."],
  cancelled: ["Cancelado"],
  approved: ["Inscrição aprovada"],
  rejected: ["Inscrição recusada"],
  status: ["Situação do evento atualizada"],
  completed: ["Evento encerrado", "Presenças registradas e contatos de convidados apagados."],
  created: ["Evento criado"],
  team_confirmed: ["Atleta confirmado na equipe", "As cobranças da academia e da federação foram criadas."],
  submitted: ["Enviado à federação", "O atleta foi marcado como enviado e foi avisado."],
  submission_undone: ["Envio à federação desfeito"],
  weight: ["Peso atualizado"],
  result: ["Resultado registrado", "A conquista foi adicionada ao perfil do aluno."],
  document: ["Documento enviado", "O professor vai revisar em breve."],
  document_approved: ["Documento aprovado"],
  document_rejected: ["Documento recusado", "A família foi avisada para reenviar."],
  reminders: ["Lembretes enviados", "Cada prazo é avisado uma vez por etapa."],
  bulk: ["Ações aplicadas a todas as inscrições selecionadas"],
  bulk_partial: ["Algumas inscrições ficaram de fora", "Elas têm pendências: confira os motivos na lista."]
};

/** Avisos de resultado das actions de eventos, vindos de `?ok=` e `?erro=` (limpos da URL após exibir). */
export function EventFeedback({ ok, erro }: { ok?: string; erro?: string }) {
  const copy = ok ? OK_COPY[ok] : undefined;
  return (
    <>
      {copy ? <OperationToast tone="success" title={copy[0]} description={copy[1]} clearParams={["ok"]} /> : null}
      {erro ? <OperationToast tone="error" title="Não foi possível concluir" description={eventErrorMessage(erro)} clearParams={["erro"]} /> : null}
    </>
  );
}
