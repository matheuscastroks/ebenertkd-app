import type { ParqSubmission } from "@/features/students/types";
import { daysBetweenIsoDates, saoPauloToday } from "@/lib/dates";

export const PARQ_VALIDITY_DAYS = 365;
export const PARQ_EXPIRING_WINDOW_DAYS = 30;

export const PARQ_HEADER_INTRO =
  "Este Questionário tem por objetivo identificar a necessidade de avaliação por um médico antes do início ou do aumento de nível da atividade física. Por favor, assinale \"sim\" ou \"não\" às seguintes perguntas:";

export const PARQ_RESPONSIBILITY_TERM =
  "Declaro que estou ciente de que é recomendável conversar com um médico, antes de iniciar ou aumentar o nível de atividade física pretendido, assumindo plena responsabilidade pela realização de qualquer atividade física sem o atendimento desta recomendação.";

export type ParqQuestionId =
  | "q1"
  | "q2"
  | "q3"
  | "q4"
  | "q5"
  | "q6"
  | "q7"
  | "q8"
  | "q9"
  | "q10";

export type ParqQuestion = {
  id: ParqQuestionId;
  number: number;
  topic: string;
  text: string;
};

export const PARQ_QUESTIONS: readonly ParqQuestion[] = [
  {
    id: "q1",
    number: 1,
    topic: "Coração ou pressão",
    text: "Algum médico já disse que você possui algum problema de coração ou pressão arterial, e que somente deveria realizar atividade física supervisionado por profissionais de saúde?",
  },
  {
    id: "q2",
    number: 2,
    topic: "Dor no peito ao treinar",
    text: "Você sente dores no peito quando pratica atividade física?",
  },
  {
    id: "q3",
    number: 3,
    topic: "Dor no peito recente",
    text: "No último mês, você sentiu dores no peito ao praticar atividade física?",
  },
  {
    id: "q4",
    number: 4,
    topic: "Tontura ou equilíbrio",
    text: "Você apresenta algum desequilíbrio devido à tontura e/ou perda momentânea da consciência?",
  },
  {
    id: "q5",
    number: 5,
    topic: "Ossos ou articulações",
    text: "Você possui algum problema ósseo ou articular, que pode ser afetado ou agravado pela atividade física?",
  },
  {
    id: "q6",
    number: 6,
    topic: "Medicação contínua",
    text: "Você toma atualmente algum tipo de medicação de uso contínuo?",
  },
  {
    id: "q7",
    number: 7,
    topic: "Tratamento cardíaco",
    text: "Você realiza algum tipo de tratamento médico para pressão arterial ou problemas cardíacos?",
  },
  {
    id: "q8",
    number: 8,
    topic: "Tratamento contínuo",
    text: "Você realiza algum tratamento médico contínuo, que possa ser afetado ou prejudicado com a atividade física?",
  },
  {
    id: "q9",
    number: 9,
    topic: "Cirurgia anterior",
    text: "Você já se submeteu a algum tipo de cirurgia, que comprometa de alguma forma a atividade física?",
  },
  {
    id: "q10",
    number: 10,
    topic: "Outro motivo de saúde",
    text: "Sabe de alguma outra razão pela qual a atividade física possa eventualmente comprometer sua saúde?",
  },
] as const;

export type ParqAnswerValue = "yes" | "no";
export type ParqAnswersMap = Record<ParqQuestionId, ParqAnswerValue>;
export type ParqStatus = "valid" | "expiring_soon" | "expired" | "missing";

export type ParqAssessment = {
  status: ParqStatus;
  submissionId: string | null;
  signedAt: string | null;
  expiresAt: string | null;
  daysUntilExpiration: number | null;
  hasYesAnswer: boolean;
  requiresMedicalCertificate: boolean;
  yesQuestionNumbers: number[];
  signerName: string | null;
  signerRole: ParqSubmission["signer_role"] | null;
  answers: Partial<ParqAnswersMap>;
};

export function computeParqExpirationDate(signedAtIso: string): string {
  const baseMs = Date.parse(signedAtIso);
  if (!Number.isFinite(baseMs)) {
    throw new Error("invalid_parq_signed_at");
  }
  return new Date(baseMs + PARQ_VALIDITY_DAYS * 86400000).toISOString();
}

export function validateParqAnswers(raw: Record<string, unknown>): {
  answers: ParqAnswersMap;
  hasYesAnswer: boolean;
  requiresMedicalCertificate: boolean;
  yesQuestionNumbers: number[];
} {
  const answers = {} as ParqAnswersMap;
  const yesQuestionNumbers: number[] = [];

  for (const question of PARQ_QUESTIONS) {
    const value = raw[question.id];
    if (value !== "yes" && value !== "no") {
      throw new Error(`parq_answer_required:${question.id}`);
    }
    answers[question.id] = value;
    if (value === "yes") {
      yesQuestionNumbers.push(question.number);
    }
  }

  const hasYesAnswer = yesQuestionNumbers.length > 0;
  return {
    answers,
    hasYesAnswer,
    requiresMedicalCertificate: hasYesAnswer,
    yesQuestionNumbers,
  };
}

export function parseParqAnswersJson(answersJson?: string | null): Partial<ParqAnswersMap> {
  if (!answersJson) return {};
  try {
    const parsed = JSON.parse(answersJson) as Record<string, unknown>;
    const result: Partial<ParqAnswersMap> = {};
    for (const question of PARQ_QUESTIONS) {
      const val = parsed[question.id];
      if (val === "yes" || val === "no") {
        result[question.id] = val;
      } else if (typeof val === "boolean") {
        result[question.id] = val ? "yes" : "no";
      }
    }
    return result;
  } catch {
    return {};
  }
}

export function evaluateParqStatus(
  latestSubmission: ParqSubmission | null | undefined,
  referenceDate?: string
): ParqAssessment {
  if (!latestSubmission) {
    return {
      status: "missing",
      submissionId: null,
      signedAt: null,
      expiresAt: null,
      daysUntilExpiration: null,
      hasYesAnswer: false,
      requiresMedicalCertificate: false,
      yesQuestionNumbers: [],
      signerName: null,
      signerRole: null,
      answers: {},
    };
  }

  const referenceDay = (referenceDate ?? saoPauloToday()).slice(0, 10);
  const signedDay = latestSubmission.signed_at.slice(0, 10);
  const expiresDay = latestSubmission.expires_at.slice(0, 10);
  const daysUntilExpiration = daysBetweenIsoDates(referenceDay, expiresDay);
  const answers = parseParqAnswersJson(latestSubmission.answers_json);
  const yesQuestionNumbers = PARQ_QUESTIONS.filter((q) => answers[q.id] === "yes").map(
    (q) => q.number
  );

  let status: ParqStatus;
  if (daysUntilExpiration < 0) {
    status = "expired";
  } else if (daysUntilExpiration <= PARQ_EXPIRING_WINDOW_DAYS) {
    status = "expiring_soon";
  } else {
    status = "valid";
  }

  return {
    status,
    submissionId: latestSubmission.$id,
    signedAt: signedDay,
    expiresAt: expiresDay,
    daysUntilExpiration,
    hasYesAnswer: Boolean(latestSubmission.has_yes_answer) || yesQuestionNumbers.length > 0,
    requiresMedicalCertificate:
      Boolean(latestSubmission.requires_medical_certificate) || yesQuestionNumbers.length > 0,
    yesQuestionNumbers,
    signerName: latestSubmission.signer_name,
    signerRole: latestSubmission.signer_role,
    answers,
  };
}

export function canSignParq(input: {
  role: string;
  actorProfileId: string;
  studentProfileId: string;
  capabilities: string[];
  studentAccessGranted: boolean;
}): boolean {
  if (input.role === "minor_student" || !input.studentAccessGranted) return false;
  if (input.actorProfileId === input.studentProfileId) {
    return input.capabilities.includes("student");
  }
  return input.capabilities.includes("guardian") || input.role === "admin";
}

export const PARQ_STATUS_LABELS: Record<ParqStatus, string> = {
  valid: "Em dia",
  expiring_soon: "Vence em breve",
  expired: "Precisa renovar",
  missing: "Falta preencher",
};
