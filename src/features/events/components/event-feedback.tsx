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
  created: ["Evento criado"]
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
