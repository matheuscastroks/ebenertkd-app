import { championshipReadiness } from "@/features/events/rules/readiness-rules";
import type { EventRegistration, EventType } from "@/features/events/types";

export const HUB_QUEUES = ["approval", "interest", "authorization", "documents", "payment", "submit", "waitlist"] as const;
export type HubQueue = (typeof HUB_QUEUES)[number];

export const HUB_QUEUE_LABEL: Record<HubQueue, { title: string; hint: string }> = {
  approval: { title: "Aguardando aprovação", hint: "Inscrições com vaga reservada que esperam o seu aval." },
  interest: { title: "Interesse em campeonatos", hint: "Atletas que querem competir: confirme a equipe." },
  authorization: { title: "Autorização do responsável", hint: "Menores sem a autorização do responsável." },
  documents: { title: "Documentos para revisar", hint: "Arquivos enviados que aguardam aprovação." },
  payment: { title: "Pagamento pendente", hint: "Inscrições confirmadas com cobrança em aberto." },
  submit: { title: "Prontos para a federação", hint: "Confirmados que ainda não foram enviados à federação." },
  waitlist: { title: "Lista de espera", hint: "Quem aguarda vaga, na ordem de chegada." }
};

export type HubInput = {
  registration: Pick<EventRegistration, "status" | "student_id" | "terms_accepted_at" | "guardian_authorized_at" | "external_submitted_at">;
  eventType: EventType;
  isMinor: boolean;
  documents: ReadonlyArray<{ status: "pending" | "approved" | "rejected"; kind: "guardian_authorization" | "responsibility_term" | "medical" | "federation_card" | "other" }>;
  /** Alguma cobrança da inscrição segue em aberto (pendente ou vencida). */
  hasOpenCharge: boolean;
};

/** Em quais filas a inscrição aparece. Uma inscrição pode estar em mais de uma (ex.: documento e pagamento). */
export function classifyForHub(input: HubInput): HubQueue[] {
  const { registration, eventType } = input;
  const queues: HubQueue[] = [];
  const championship = eventType === "championship";
  const status = registration.status;
  if (status === "pending_approval") queues.push("approval");
  if (status === "interested" && championship) queues.push("interest");
  if (championship && input.isMinor && ["interested", "confirmed"].includes(status) && !registration.guardian_authorized_at) queues.push("authorization");
  if (input.documents.some((document) => document.status === "pending") && ["interested", "pending_approval", "confirmed"].includes(status)) queues.push("documents");
  if (["confirmed", "pending_approval"].includes(status) && input.hasOpenCharge) queues.push("payment");
  if (championship && status === "confirmed" && !registration.external_submitted_at) {
    const readiness = championshipReadiness({ isMinor: input.isMinor, termsAcceptedAt: registration.terms_accepted_at, guardianAuthorizedAt: registration.guardian_authorized_at, documents: input.documents });
    if (readiness.ready) queues.push("submit");
  }
  if (status === "waitlisted") queues.push("waitlist");
  return queues;
}
