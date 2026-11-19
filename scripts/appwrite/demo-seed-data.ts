import { createHash } from "node:crypto";
import type { RankKey } from "../../src/features/academy/ranks";

export type DemoStudentKey =
  | "adult"
  | "minor"
  | "junior"
  | `student-${string}`;

export type DemoChargeState = "paid" | "pending" | "overdue" | "proof_under_review";

export type DemoClassKey =
  | "adult-night"
  | "children-morning"
  | "youth-afternoon"
  | "competition-team"
  | "masters-morning";

export type DemoEnrollmentStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "awaiting_signature"
  | "active"
  | "paused"
  | "cancelled"
  | "awaiting_renewal";

export type DemoParqScenario =
  | "valid"
  | "requires_doctor"
  | "expiring_soon"
  | "expired"
  | "missing";

export type DemoMedicalCertScenario =
  | "approved"
  | "pending"
  | "expired"
  | "missing";

export type DemoAttendancePattern =
  | "exemplary"
  | "regular"
  | "warning"
  | "dropout_risk"
  | "none";

export type DemoStudentScenario = {
  key: DemoStudentKey;
  fullName: string;
  email: string;
  role: "adult_student" | "minor_student";
  username?: string;
  guardianEmail?: string;
  guardianName?: string;
  guardianPhone?: string;
  classKey: DemoClassKey;
  classKeys?: DemoClassKey[];
  rankKey: RankKey;
  birthDate: string;
  phone: string;
  cpf: string;
  address: string;
  photoUrl: string;
  dueDay: number;
  monthlyFeeCents: number;
  discountCents: number;
  startMonth?: string;
  charges: Array<{ competence: string; state: DemoChargeState }>;
  healthCondition?: "yes" | "no";
  healthDetails?: string | null;
  medications?: string | null;
  allergies?: string | null;
  injuries?: string | null;
  enrollmentStatus: DemoEnrollmentStatus;
  accessOverrideUntil?: string | null;
  contractScenario?: "signed" | "pending_signature" | "expired" | "cancelled" | "none";
  parqScenario?: DemoParqScenario;
  medicalCertScenario?: DemoMedicalCertScenario;
  attendancePattern?: DemoAttendancePattern;
  cancellationDetails?: {
    noticeDate: string;
    targetExitMonth: string;
    suggestedFeeCents: number;
    decidedFeeCents: number;
    reason: string;
    decisionNotes: string;
  };
  examParticipations?: Array<{
    eventIdKey: "exam-2025-1" | "exam-2025-2" | "exam-2026-1" | "upcoming-exam";
    targetRankKey: RankKey;
    feeCents: number;
    status: "approved" | "failed" | "absent" | "registered" | "cancelled";
    chargeStatus?: "paid" | "pending" | "proof_under_review";
    notes?: string;
    gradedAt?: string;
  }>;
  pastExamRecords?: Array<{
    eventIdKey: "exam-2025-1" | "exam-2025-2" | "exam-2026-1";
    previousRankKey: RankKey;
    newRankKey: RankKey;
    achievedAt: string;
  }>;
  // Campos retrocompatíveis
  examParticipation?: {
    eventIdKey: "past-exam" | "upcoming-exam" | "exam-2025-1" | "exam-2025-2" | "exam-2026-1";
    targetRankKey: RankKey;
    feeCents: number;
    status: "approved" | "failed" | "absent" | "registered";
    chargeStatus?: "paid" | "pending" | "proof_under_review";
    notes?: string;
    gradedAt?: string;
  };
  pastExamRecord?: {
    previousRankKey: RankKey;
    newRankKey: RankKey;
    achievedAt: string;
  };
};

export function demoId(namespace: string, key: string) {
  return `demo-${createHash("sha256").update(`${namespace}:${key}`).digest("hex").slice(0, 31)}`;
}

export function monthOffset(reference: string, offset: number) {
  const [year, month] = reference.slice(0, 7).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 7);
}

export function monthsBetween(startCompetence: string, endCompetence: string): string[] {
  const [sYear, sMonth] = startCompetence.split("-").map(Number);
  const [eYear, eMonth] = endCompetence.split("-").map(Number);
  const result: string[] = [];

  let curYear = sYear;
  let curMonth = sMonth;
  while (curYear < eYear || (curYear === eYear && curMonth <= eMonth)) {
    result.push(`${curYear}-${String(curMonth).padStart(2, "0")}`);
    curMonth++;
    if (curMonth > 12) {
      curMonth = 1;
      curYear++;
    }
  }
  return result;
}

export function demoDueDate(competence: string, dueDay: number) {
  const [year, month] = competence.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${competence}-${String(Math.min(dueDay, lastDay)).padStart(2, "0")}T12:00:00.000Z`;
}

export function buildChargesTimeline(
  startMonth: string,
  referenceDate: string,
  options: {
    specialState?: "normal" | "locked" | "override" | "proof_under_review" | "cancelled" | "paused";
    exitMonth?: string;
  } = {}
): Array<{ competence: string; state: DemoChargeState }> {
  const current = monthOffset(referenceDate, 0);
  const next = monthOffset(referenceDate, 1);
  const previous = monthOffset(referenceDate, -1);
  const special = options.specialState ?? "normal";

  if (special === "cancelled" && options.exitMonth) {
    const list = monthsBetween(startMonth, options.exitMonth);
    return list.map((competence) => ({ competence, state: "paid" }));
  }

  const endMonth = next;
  const allMonths = monthsBetween(startMonth, endMonth);

  return allMonths.map((competence) => {
    if (competence === next) {
      return { competence, state: "pending" };
    }
    if (competence === current) {
      if (special === "locked") return { competence, state: "overdue" };
      if (special === "override") return { competence, state: "overdue" };
      if (special === "proof_under_review") return { competence, state: "proof_under_review" };
      if (special === "paused") return { competence, state: "pending" };
      return { competence, state: "paid" };
    }
    if (competence === previous) {
      if (special === "locked") return { competence, state: "overdue" };
      return { competence, state: "paid" };
    }
    // Meses históricos (Jan 2025 a M-2) sempre pagos em dia
    return { competence, state: "paid" };
  });
}

export function buildDemoScenario(referenceDate = new Date().toISOString()): DemoStudentScenario[] {
  const current = monthOffset(referenceDate, 0);

  return [
    // 1. Camila Ferreira (Persona Aluno Adulto - Competidora Faixa Azul)
    {
      key: "adult",
      fullName: "Camila Ferreira",
      email: "camila.ferreira@ebenertkd.app",
      role: "adult_student",
      classKey: "adult-night",
      classKeys: ["adult-night", "competition-team"],
      rankKey: "gub-4",
      birthDate: "1994-04-12",
      phone: "21984567231",
      cpf: "90000000001",
      address: "Rua Cambaúba, 420, Apto 302 — Jardim Guanabara, Rio de Janeiro/RJ, CEP 21940-000",
      photoUrl: "https://randomuser.me/api/portraits/women/44.jpg",
      dueDay: 10,
      monthlyFeeCents: 17000,
      discountCents: 2000,
      startMonth: "2025-01",
      charges: buildChargesTimeline("2025-01", referenceDate),
      injuries: "Entorse no tornozelo direito em 2023, sem limitações atuais.",
      enrollmentStatus: "active",
      contractScenario: "signed",
      parqScenario: "valid",
      medicalCertScenario: "approved",
      attendancePattern: "exemplary",
      examParticipations: [
        {
          eventIdKey: "exam-2025-2",
          targetRankKey: "gub-4",
          feeCents: 15000,
          status: "approved",
          chargeStatus: "paid",
          gradedAt: "2025-12-13T16:00:00.000Z",
          notes: "Excelente execução do Poomsae Taegeuk Oh Jang e chutes combinados."
        },
        {
          eventIdKey: "upcoming-exam",
          targetRankKey: "gub-3",
          feeCents: 15000,
          status: "registered",
          chargeStatus: "paid"
        }
      ],
      pastExamRecords: [
        {
          eventIdKey: "exam-2025-2",
          previousRankKey: "gub-5",
          newRankKey: "gub-4",
          achievedAt: "2025-12-13T16:00:00.000Z"
        }
      ],
      examParticipation: {
        eventIdKey: "upcoming-exam",
        targetRankKey: "gub-3",
        feeCents: 15000,
        status: "registered",
        chargeStatus: "paid"
      }
    },

    // 2. Lucas Mendes (Persona Aluno Menor - Filho de Juliana Mendes)
    {
      key: "minor",
      fullName: "Lucas Mendes",
      email: "lucas.mendes@minor.ebenertkd.internal",
      username: "lucas.mendes",
      role: "minor_student",
      guardianEmail: "juliana.mendes@ebenertkd.app",
      guardianName: "Juliana Mendes",
      guardianPhone: "21973452681",
      classKey: "children-morning",
      classKeys: ["children-morning"],
      rankKey: "gub-8",
      birthDate: "2014-08-03",
      phone: "21976341852",
      cpf: "90000000002",
      address: "Estrada do Cacuia, 150, Bloco 2, Ap 104 — Cacuia, Rio de Janeiro/RJ, CEP 21921-000",
      photoUrl: "https://randomuser.me/api/portraits/men/32.jpg",
      dueDay: 5,
      monthlyFeeCents: 12000,
      discountCents: 0,
      startMonth: "2025-01",
      charges: buildChargesTimeline("2025-01", referenceDate, { specialState: "proof_under_review" }),
      healthCondition: "yes",
      healthDetails: "Asma leve controlada, com uso de bombinha se necessário.",
      medications: "Salbutamol spray, somente em crises eventuais.",
      enrollmentStatus: "active",
      contractScenario: "signed",
      parqScenario: "requires_doctor",
      medicalCertScenario: "approved",
      attendancePattern: "exemplary",
      examParticipations: [
        {
          eventIdKey: "exam-2025-1",
          targetRankKey: "gub-9",
          feeCents: 15000,
          status: "approved",
          chargeStatus: "paid",
          gradedAt: "2025-06-21T15:00:00.000Z",
          notes: "Ótima flexibilidade e disciplina no Dojang."
        },
        {
          eventIdKey: "exam-2025-2",
          targetRankKey: "gub-8",
          feeCents: 15000,
          status: "approved",
          chargeStatus: "paid",
          gradedAt: "2025-12-13T15:00:00.000Z",
          notes: "Demonstrou firmeza no Taegeuk Il Jang."
        },
        {
          eventIdKey: "upcoming-exam",
          targetRankKey: "gub-7",
          feeCents: 15000,
          status: "registered",
          chargeStatus: "proof_under_review"
        }
      ],
      pastExamRecords: [
        {
          eventIdKey: "exam-2025-1",
          previousRankKey: "gub-10",
          newRankKey: "gub-9",
          achievedAt: "2025-06-21T15:00:00.000Z"
        },
        {
          eventIdKey: "exam-2025-2",
          previousRankKey: "gub-9",
          newRankKey: "gub-8",
          achievedAt: "2025-12-13T15:00:00.000Z"
        }
      ],
      examParticipation: {
        eventIdKey: "upcoming-exam",
        targetRankKey: "gub-7",
        feeCents: 15000,
        status: "registered",
        chargeStatus: "proof_under_review"
      }
    },

    // 3. Pedro Ferreira (Aluno Menor Juvenil)
    {
      key: "junior",
      fullName: "Pedro Ferreira",
      email: "pedro.ferreira@minor.ebenertkd.internal",
      username: "pedro.ferreira",
      role: "minor_student",
      guardianEmail: "camila.ferreira@ebenertkd.app",
      guardianName: "Camila Ferreira",
      guardianPhone: "21984567231",
      classKey: "youth-afternoon",
      classKeys: ["youth-afternoon"],
      rankKey: "gub-7",
      birthDate: "2012-11-19",
      phone: "21991236478",
      cpf: "90000000003",
      address: "Praia da Bica, 1250 — Jardim Guanabara, Rio de Janeiro/RJ, CEP 21940-200",
      photoUrl: "https://randomuser.me/api/portraits/men/45.jpg",
      dueDay: 20,
      monthlyFeeCents: 14000,
      discountCents: 1000,
      startMonth: "2025-06",
      charges: buildChargesTimeline("2025-06", referenceDate),
      allergies: "Dipirona.",
      enrollmentStatus: "active",
      contractScenario: "signed",
      parqScenario: "valid",
      medicalCertScenario: "approved",
      attendancePattern: "regular",
      examParticipations: [
        {
          eventIdKey: "exam-2025-2",
          targetRankKey: "gub-7",
          feeCents: 15000,
          status: "approved",
          chargeStatus: "paid",
          gradedAt: "2025-12-13T16:00:00.000Z"
        },
        {
          eventIdKey: "upcoming-exam",
          targetRankKey: "gub-6",
          feeCents: 15000,
          status: "registered",
          chargeStatus: "paid"
        }
      ],
      pastExamRecords: [
        {
          eventIdKey: "exam-2025-2",
          previousRankKey: "gub-8",
          newRankKey: "gub-7",
          achievedAt: "2025-12-13T16:00:00.000Z"
        }
      ]
    },

    // 4. Beatriz Mendes (Menor - Irmã de Lucas Mendes)
    {
      key: "student-04",
      fullName: "Beatriz Mendes",
      email: "beatriz.mendes@minor.ebenertkd.internal",
      username: "beatriz.mendes",
      role: "minor_student",
      guardianEmail: "juliana.mendes@ebenertkd.app",
      guardianName: "Juliana Mendes",
      guardianPhone: "21973452681",
      classKey: "children-morning",
      classKeys: ["children-morning"],
      rankKey: "gub-9",
      birthDate: "2016-03-22",
      phone: "21987123456",
      cpf: "90000000004",
      address: "Estrada do Cacuia, 150, Bloco 2, Ap 104 — Cacuia, Rio de Janeiro/RJ, CEP 21921-000",
      photoUrl: "https://randomuser.me/api/portraits/women/68.jpg",
      dueDay: 5,
      monthlyFeeCents: 12000,
      discountCents: 2000,
      startMonth: "2026-01",
      charges: buildChargesTimeline("2026-01", referenceDate),
      enrollmentStatus: "active",
      contractScenario: "signed",
      parqScenario: "valid",
      medicalCertScenario: "approved",
      attendancePattern: "regular",
      examParticipations: [
        {
          eventIdKey: "exam-2026-1",
          targetRankKey: "gub-9",
          feeCents: 15000,
          status: "approved",
          chargeStatus: "paid",
          gradedAt: "2026-06-20T14:30:00.000Z",
          notes: "Excelente execução dos chutes básicos e disciplina exemplar."
        }
      ],
      pastExamRecords: [
        {
          eventIdKey: "exam-2026-1",
          previousRankKey: "gub-10",
          newRankKey: "gub-9",
          achievedAt: "2026-06-20T14:30:00.000Z"
        }
      ],
      pastExamRecord: {
        previousRankKey: "gub-10",
        newRankKey: "gub-9",
        achievedAt: "2026-06-20T14:30:00.000Z"
      },
      examParticipation: {
        eventIdKey: "exam-2026-1",
        targetRankKey: "gub-9",
        feeCents: 15000,
        status: "approved",
        notes: "Excelente execução dos chutes básicos e disciplina exemplar."
      }
    },

    // 5. Rodrigo Silveira (Adulto Faixa Vermelha)
    {
      key: "student-05",
      fullName: "Rodrigo Silveira",
      email: "rodrigo.silveira@ebenertkd.app",
      role: "adult_student",
      classKey: "adult-night",
      classKeys: ["adult-night", "competition-team"],
      rankKey: "gub-2",
      birthDate: "1999-07-15",
      phone: "21998765432",
      cpf: "90000000005",
      address: "Rua República Árabe Unida, 88 — Portuguesa, Rio de Janeiro/RJ, CEP 21931-500",
      photoUrl: "https://randomuser.me/api/portraits/men/22.jpg",
      dueDay: 15,
      monthlyFeeCents: 18000,
      discountCents: 0,
      startMonth: "2025-01",
      charges: buildChargesTimeline("2025-01", referenceDate),
      enrollmentStatus: "active",
      contractScenario: "signed",
      parqScenario: "valid",
      medicalCertScenario: "approved",
      attendancePattern: "exemplary",
      examParticipations: [
        {
          eventIdKey: "exam-2025-1",
          targetRankKey: "gub-3",
          feeCents: 15000,
          status: "approved",
          chargeStatus: "paid",
          gradedAt: "2025-06-21T17:00:00.000Z"
        },
        {
          eventIdKey: "exam-2026-1",
          targetRankKey: "gub-2",
          feeCents: 15000,
          status: "approved",
          chargeStatus: "paid",
          gradedAt: "2026-06-20T17:00:00.000Z"
        },
        {
          eventIdKey: "upcoming-exam",
          targetRankKey: "gub-1",
          feeCents: 15000,
          status: "registered",
          chargeStatus: "paid"
        }
      ],
      pastExamRecords: [
        {
          eventIdKey: "exam-2025-1",
          previousRankKey: "gub-4",
          newRankKey: "gub-3",
          achievedAt: "2025-06-21T17:00:00.000Z"
        },
        {
          eventIdKey: "exam-2026-1",
          previousRankKey: "gub-3",
          newRankKey: "gub-2",
          achievedAt: "2026-06-20T17:00:00.000Z"
        }
      ],
      examParticipation: {
        eventIdKey: "upcoming-exam",
        targetRankKey: "gub-1",
        feeCents: 15000,
        status: "registered",
        chargeStatus: "paid"
      }
    },

    // 6. Mariana Albuquerque (PAR-Q a vencer em ≤ 30 dias!)
    {
      key: "student-06",
      fullName: "Mariana Albuquerque",
      email: "mariana.albuquerque@ebenertkd.app",
      role: "adult_student",
      classKey: "adult-night",
      classKeys: ["adult-night"],
      rankKey: "gub-6",
      birthDate: "2002-09-08",
      phone: "21981234567",
      cpf: "90000000006",
      address: "Praça Jerônimo de Araújo, 15 — Ribeira, Rio de Janeiro/RJ, CEP 21930-000",
      photoUrl: "https://randomuser.me/api/portraits/women/24.jpg",
      dueDay: 10,
      monthlyFeeCents: 16000,
      discountCents: 0,
      startMonth: "2025-06",
      charges: buildChargesTimeline("2025-06", referenceDate),
      enrollmentStatus: "active",
      contractScenario: "signed",
      parqScenario: "expiring_soon",
      medicalCertScenario: "approved",
      attendancePattern: "regular",
      examParticipations: [
        {
          eventIdKey: "upcoming-exam",
          targetRankKey: "gub-5",
          feeCents: 15000,
          status: "registered",
          chargeStatus: "pending"
        }
      ],
      examParticipation: {
        eventIdKey: "upcoming-exam",
        targetRankKey: "gub-5",
        feeCents: 15000,
        status: "registered",
        chargeStatus: "pending"
      }
    },

    // 7. Gabriel Souza (Risco Warning de Retenção + Reprovado no exame anterior)
    {
      key: "student-07",
      fullName: "Gabriel Souza",
      email: "gabriel.souza@ebenertkd.app",
      role: "adult_student",
      classKey: "masters-morning",
      classKeys: ["masters-morning"],
      rankKey: "gub-3",
      birthDate: "1994-01-30",
      phone: "21974561234",
      cpf: "90000000007",
      address: "Estrada da Cava, 65 — Moneró, Rio de Janeiro/RJ, CEP 21920-100",
      photoUrl: "https://randomuser.me/api/portraits/men/11.jpg",
      dueDay: 25,
      monthlyFeeCents: 17000,
      discountCents: 0,
      startMonth: "2025-01",
      charges: buildChargesTimeline("2025-01", referenceDate),
      enrollmentStatus: "active",
      contractScenario: "signed",
      parqScenario: "valid",
      medicalCertScenario: "approved",
      attendancePattern: "warning",
      examParticipations: [
        {
          eventIdKey: "exam-2026-1",
          targetRankKey: "gub-2",
          feeCents: 15000,
          status: "failed",
          gradedAt: "2026-06-20T17:00:00.000Z",
          notes: "Necessário maior controle de base no Poomsae Taeguk Chil Jang e equilíbrio nos chutes giratórios."
        },
        {
          eventIdKey: "upcoming-exam",
          targetRankKey: "gub-2",
          feeCents: 15000,
          status: "registered",
          chargeStatus: "paid"
        }
      ],
      examParticipation: {
        eventIdKey: "exam-2026-1",
        targetRankKey: "gub-2",
        feeCents: 15000,
        status: "failed",
        notes: "Necessário maior controle de base no Poomsae Taeguk Chil Jang e equilíbrio nos chutes giratórios."
      }
    },

    // 8. Larissa Prado (PAR-Q vencido + Risco Crítico de Evasão)
    {
      key: "student-08",
      fullName: "Larissa Prado",
      email: "larissa.prado@ebenertkd.app",
      role: "adult_student",
      classKey: "adult-night",
      classKeys: ["adult-night"],
      rankKey: "gub-8",
      birthDate: "1997-12-05",
      phone: "21989012345",
      cpf: "90000000008",
      address: "Rua Paranapuã, 1100, Ap 201 — Freguesia (Ilha), Rio de Janeiro/RJ, CEP 21911-000",
      photoUrl: "https://randomuser.me/api/portraits/women/17.jpg",
      dueDay: 10,
      monthlyFeeCents: 15000,
      discountCents: 0,
      startMonth: "2025-01",
      charges: buildChargesTimeline("2025-01", referenceDate),
      enrollmentStatus: "active",
      contractScenario: "signed",
      parqScenario: "expired",
      medicalCertScenario: "expired",
      attendancePattern: "dropout_risk",
      examParticipations: [
        {
          eventIdKey: "exam-2026-1",
          targetRankKey: "gub-7",
          feeCents: 15000,
          status: "absent"
        }
      ],
      examParticipation: {
        eventIdKey: "exam-2026-1",
        targetRankKey: "gub-7",
        feeCents: 15000,
        status: "absent"
      }
    },

    // 9. Thiago Barreto (Avançado Ponta Preta)
    {
      key: "student-09",
      fullName: "Thiago Barreto",
      email: "thiago.barreto@ebenertkd.app",
      role: "adult_student",
      classKey: "adult-night",
      classKeys: ["adult-night", "masters-morning", "competition-team"],
      rankKey: "gub-1",
      birthDate: "2003-05-18",
      phone: "21995678901",
      cpf: "90000000009",
      address: "Rua Tenente Cleto Campelo, 215 — Cocotá, Rio de Janeiro/RJ, CEP 21910-060",
      photoUrl: "https://randomuser.me/api/portraits/men/86.jpg",
      dueDay: 5,
      monthlyFeeCents: 22000,
      discountCents: 3000,
      startMonth: "2025-01",
      charges: buildChargesTimeline("2025-01", referenceDate),
      enrollmentStatus: "active",
      contractScenario: "signed",
      parqScenario: "valid",
      medicalCertScenario: "approved",
      attendancePattern: "exemplary",
      examParticipations: [
        {
          eventIdKey: "exam-2025-2",
          targetRankKey: "gub-1",
          feeCents: 15000,
          status: "approved",
          chargeStatus: "paid",
          gradedAt: "2025-12-13T17:30:00.000Z"
        },
        {
          eventIdKey: "upcoming-exam",
          targetRankKey: "dan-1",
          feeCents: 25000,
          status: "registered",
          chargeStatus: "paid"
        }
      ],
      pastExamRecords: [
        {
          eventIdKey: "exam-2025-2",
          previousRankKey: "gub-2",
          newRankKey: "gub-1",
          achievedAt: "2025-12-13T17:30:00.000Z"
        }
      ],
      examParticipation: {
        eventIdKey: "upcoming-exam",
        targetRankKey: "dan-1",
        feeCents: 25000,
        status: "registered",
        chargeStatus: "paid"
      }
    },

    // 10. Sofia Castro (Juvenil)
    {
      key: "student-10",
      fullName: "Sofia Castro",
      email: "sofia.castro@minor.ebenertkd.internal",
      username: "sofia.castro",
      role: "minor_student",
      guardianName: "André Castro",
      guardianPhone: "21986543210",
      classKey: "youth-afternoon",
      classKeys: ["youth-afternoon"],
      rankKey: "gub-5",
      birthDate: "2013-02-14",
      phone: "21983456789",
      cpf: "90000000010",
      address: "Avenida Paranapuã, 820 — Tauá, Rio de Janeiro/RJ, CEP 21910-250",
      photoUrl: "https://randomuser.me/api/portraits/women/33.jpg",
      dueDay: 15,
      monthlyFeeCents: 14000,
      discountCents: 0,
      startMonth: "2025-06",
      charges: buildChargesTimeline("2025-06", referenceDate),
      enrollmentStatus: "active",
      contractScenario: "signed",
      parqScenario: "valid",
      medicalCertScenario: "approved",
      attendancePattern: "regular"
    },

    // 11. Felipe Vasconcelos (BLOQUEADO: Atrasado > 30 dias sem pagamento!)
    {
      key: "student-11",
      fullName: "Felipe Vasconcelos",
      email: "felipe.vasconcelos@ebenertkd.app",
      role: "adult_student",
      classKey: "adult-night",
      classKeys: ["adult-night"],
      rankKey: "gub-10",
      birthDate: "1991-08-25",
      phone: "21972345678",
      cpf: "90000000011",
      address: "Rua Gregório de Castro Morais, 45 — Jardim Carioca, Rio de Janeiro/RJ, CEP 21921-390",
      photoUrl: "https://randomuser.me/api/portraits/men/64.jpg",
      dueDay: 10,
      monthlyFeeCents: 16000,
      discountCents: 0,
      startMonth: "2026-03",
      charges: buildChargesTimeline("2026-03", referenceDate, { specialState: "locked" }),
      enrollmentStatus: "active",
      contractScenario: "signed",
      parqScenario: "valid",
      attendancePattern: "dropout_risk"
    },

    // 12. Julio Cesar Martins (CARÊNCIA / OVERRIDE MANUAL PELO MESTRE)
    {
      key: "student-12",
      fullName: "Julio Cesar Martins",
      email: "julio.martins@ebenertkd.app",
      role: "adult_student",
      classKey: "masters-morning",
      classKeys: ["masters-morning"],
      rankKey: "gub-6",
      birthDate: "1984-10-11",
      phone: "21996781234",
      cpf: "90000000012",
      address: "Rua Manuel Bonfim, 110 — Bancários, Rio de Janeiro/RJ, CEP 21910-180",
      photoUrl: "https://randomuser.me/api/portraits/men/75.jpg",
      dueDay: 20,
      monthlyFeeCents: 16000,
      discountCents: 0,
      startMonth: "2025-06",
      charges: buildChargesTimeline("2025-06", referenceDate, { specialState: "override" }),
      enrollmentStatus: "active",
      accessOverrideUntil: `${current}-28T23:59:59.000Z`,
      contractScenario: "signed",
      parqScenario: "valid",
      attendancePattern: "regular",
      examParticipations: [
        {
          eventIdKey: "exam-2026-1",
          targetRankKey: "gub-6",
          feeCents: 15000,
          status: "approved",
          chargeStatus: "paid",
          gradedAt: "2026-06-20T16:00:00.000Z"
        }
      ],
      pastExamRecords: [
        {
          eventIdKey: "exam-2026-1",
          previousRankKey: "gub-7",
          newRankKey: "gub-6",
          achievedAt: "2026-06-20T16:00:00.000Z"
        }
      ],
      pastExamRecord: {
        previousRankKey: "gub-7",
        newRankKey: "gub-6",
        achievedAt: "2026-06-20T16:00:00.000Z"
      },
      examParticipation: {
        eventIdKey: "exam-2026-1",
        targetRankKey: "gub-6",
        feeCents: 15000,
        status: "approved",
        notes: "Muito seguro nas defesas e contra-ataques."
      }
    },

    // 13. Isabela Fontes (Atestado Médico Pendente de Aprovação)
    {
      key: "student-13",
      fullName: "Isabela Fontes",
      email: "isabela.fontes@ebenertkd.app",
      role: "adult_student",
      classKey: "adult-night",
      classKeys: ["adult-night"],
      rankKey: "gub-9",
      birthDate: "1998-04-03",
      phone: "21988901234",
      cpf: "90000000013",
      address: "Praia da Bandeira, 98 — Praia da Bandeira, Rio de Janeiro/RJ, CEP 21931-370",
      photoUrl: "https://randomuser.me/api/portraits/women/90.jpg",
      dueDay: 15,
      monthlyFeeCents: 15000,
      discountCents: 0,
      startMonth: "2026-01",
      charges: buildChargesTimeline("2026-01", referenceDate),
      enrollmentStatus: "active",
      contractScenario: "signed",
      parqScenario: "valid",
      medicalCertScenario: "pending",
      attendancePattern: "regular",
      examParticipations: [
        {
          eventIdKey: "upcoming-exam",
          targetRankKey: "gub-8",
          feeCents: 15000,
          status: "registered",
          chargeStatus: "paid"
        }
      ],
      examParticipation: {
        eventIdKey: "upcoming-exam",
        targetRankKey: "gub-8",
        feeCents: 15000,
        status: "registered",
        chargeStatus: "paid"
      }
    },

    // 14. Enzo Gabriel Ramos (Infantil)
    {
      key: "student-14",
      fullName: "Enzo Gabriel Ramos",
      email: "enzo.ramos@minor.ebenertkd.internal",
      username: "enzo.ramos",
      role: "minor_student",
      guardianName: "Patrícia Ramos",
      guardianPhone: "21971239876",
      classKey: "children-morning",
      classKeys: ["children-morning"],
      rankKey: "gub-10",
      birthDate: "2015-06-17",
      phone: "21975432109",
      cpf: "90000000014",
      address: "Rua Érico Veríssimo, 55 — Pitangueiras, Rio de Janeiro/RJ, CEP 21931-290",
      photoUrl: "https://randomuser.me/api/portraits/men/36.jpg",
      dueDay: 5,
      monthlyFeeCents: 12000,
      discountCents: 0,
      startMonth: "2026-05",
      charges: buildChargesTimeline("2026-05", referenceDate),
      enrollmentStatus: "active",
      contractScenario: "signed",
      parqScenario: "valid",
      attendancePattern: "exemplary",
      examParticipations: [
        {
          eventIdKey: "upcoming-exam",
          targetRankKey: "gub-9",
          feeCents: 15000,
          status: "registered",
          chargeStatus: "paid"
        }
      ],
      examParticipation: {
        eventIdKey: "upcoming-exam",
        targetRankKey: "gub-9",
        feeCents: 15000,
        status: "registered",
        chargeStatus: "paid"
      }
    },

    // 15. Rafael Guimarães (Adulto Faixa Azul)
    {
      key: "student-15",
      fullName: "Rafael Guimarães",
      email: "rafael.guimaraes@ebenertkd.app",
      role: "adult_student",
      classKey: "adult-night",
      classKeys: ["adult-night", "competition-team"],
      rankKey: "gub-4",
      birthDate: "2001-11-20",
      phone: "21992345671",
      cpf: "90000000015",
      address: "Estrada das Canárias, 340 — Galeão, Rio de Janeiro/RJ, CEP 21941-480",
      photoUrl: "https://randomuser.me/api/portraits/men/54.jpg",
      dueDay: 10,
      monthlyFeeCents: 18000,
      discountCents: 0,
      startMonth: "2025-01",
      charges: buildChargesTimeline("2025-01", referenceDate),
      enrollmentStatus: "active",
      contractScenario: "signed",
      parqScenario: "valid",
      attendancePattern: "exemplary",
      examParticipations: [
        {
          eventIdKey: "upcoming-exam",
          targetRankKey: "gub-3",
          feeCents: 15000,
          status: "registered",
          chargeStatus: "paid"
        }
      ],
      examParticipation: {
        eventIdKey: "upcoming-exam",
        targetRankKey: "gub-3",
        feeCents: 15000,
        status: "registered",
        chargeStatus: "paid"
      }
    },

    // 16. Carolina Nogueira
    {
      key: "student-16",
      fullName: "Carolina Nogueira",
      email: "carolina.nogueira@ebenertkd.app",
      role: "adult_student",
      classKey: "adult-night",
      classKeys: ["adult-night"],
      rankKey: "gub-7",
      birthDate: "1993-03-12",
      phone: "21986712349",
      cpf: "90000000016",
      address: "Rua Peixoto de Carvalho, 72 — Zumbi, Rio de Janeiro/RJ, CEP 21930-140",
      photoUrl: "https://randomuser.me/api/portraits/women/56.jpg",
      dueDay: 15,
      monthlyFeeCents: 15000,
      discountCents: 0,
      startMonth: "2025-06",
      charges: buildChargesTimeline("2025-06", referenceDate),
      enrollmentStatus: "active",
      contractScenario: "signed",
      parqScenario: "valid",
      attendancePattern: "regular"
    },

    // 17. Matheus Barbosa
    {
      key: "student-17",
      fullName: "Matheus Barbosa",
      email: "matheus.barbosa@ebenertkd.app",
      role: "adult_student",
      classKey: "adult-night",
      classKeys: ["adult-night"],
      rankKey: "gub-2",
      birthDate: "1996-06-29",
      phone: "21993456782",
      cpf: "90000000017",
      address: "Rua Sargento João Lopes, 310 — Cacuia, Rio de Janeiro/RJ, CEP 21921-500",
      photoUrl: "https://randomuser.me/api/portraits/men/18.jpg",
      dueDay: 10,
      monthlyFeeCents: 17000,
      discountCents: 0,
      startMonth: "2025-01",
      charges: buildChargesTimeline("2025-01", referenceDate),
      enrollmentStatus: "active",
      contractScenario: "signed",
      parqScenario: "valid",
      attendancePattern: "exemplary",
      examParticipations: [
        {
          eventIdKey: "exam-2025-2",
          targetRankKey: "gub-2",
          feeCents: 15000,
          status: "approved",
          chargeStatus: "paid",
          gradedAt: "2025-12-13T17:00:00.000Z"
        }
      ],
      pastExamRecords: [
        {
          eventIdKey: "exam-2025-2",
          previousRankKey: "gub-3",
          newRankKey: "gub-2",
          achievedAt: "2025-12-13T17:00:00.000Z"
        }
      ],
      pastExamRecord: {
        previousRankKey: "gub-3",
        newRankKey: "gub-2",
        achievedAt: "2025-12-13T17:00:00.000Z"
      },
      examParticipation: {
        eventIdKey: "exam-2025-2",
        targetRankKey: "gub-2",
        feeCents: 15000,
        status: "approved",
        notes: "Ótima potência nos socos e chutes na linha de cintura."
      }
    },

    // 18. Alice Coimbra
    {
      key: "student-18",
      fullName: "Alice Coimbra",
      email: "alice.coimbra@minor.ebenertkd.internal",
      username: "alice.coimbra",
      role: "minor_student",
      guardianName: "Fernando Coimbra",
      guardianPhone: "21981239988",
      classKey: "youth-afternoon",
      classKeys: ["youth-afternoon"],
      rankKey: "gub-7",
      birthDate: "2012-08-05",
      phone: "21977654321",
      cpf: "90000000018",
      address: "Rua Luís Beltrão, 80 — Moneró, Rio de Janeiro/RJ, CEP 21920-250",
      photoUrl: "https://randomuser.me/api/portraits/women/65.jpg",
      dueDay: 20,
      monthlyFeeCents: 14000,
      discountCents: 0,
      startMonth: "2025-06",
      charges: buildChargesTimeline("2025-06", referenceDate, { specialState: "proof_under_review" }),
      enrollmentStatus: "active",
      contractScenario: "signed",
      parqScenario: "valid",
      attendancePattern: "regular",
      examParticipations: [
        {
          eventIdKey: "upcoming-exam",
          targetRankKey: "gub-6",
          feeCents: 15000,
          status: "registered",
          chargeStatus: "proof_under_review"
        }
      ],
      examParticipation: {
        eventIdKey: "upcoming-exam",
        targetRankKey: "gub-6",
        feeCents: 15000,
        status: "registered",
        chargeStatus: "proof_under_review"
      }
    },

    // 19. Vinicius Teixeira (MATRÍCULA SUBMETIDA: Aguardando Análise do Professor)
    {
      key: "student-19",
      fullName: "Vinicius Teixeira",
      email: "vinicius.teixeira@ebenertkd.app",
      role: "adult_student",
      classKey: "adult-night",
      classKeys: ["adult-night"],
      rankKey: "gub-10",
      birthDate: "2002-12-14",
      phone: "21994567123",
      cpf: "90000000019",
      address: "Rua Maestro Paulo e Silva, 400 — Jardim Guanabara, Rio de Janeiro/RJ, CEP 21940-340",
      photoUrl: "https://randomuser.me/api/portraits/men/91.jpg",
      dueDay: 10,
      monthlyFeeCents: 15000,
      discountCents: 0,
      charges: [{ competence: current, state: "pending" }],
      enrollmentStatus: "submitted",
      contractScenario: "none",
      parqScenario: "valid",
      attendancePattern: "none"
    },

    // 20. Daniela Meireles (AGUARDANDO RENOVAÇÃO: Contrato anual venceu!)
    {
      key: "student-20",
      fullName: "Daniela Meireles",
      email: "daniela.meireles@ebenertkd.app",
      role: "adult_student",
      classKey: "masters-morning",
      classKeys: ["masters-morning"],
      rankKey: "gub-8",
      birthDate: "1986-07-21",
      phone: "21989014567",
      cpf: "90000000020",
      address: "Rua Colina, 60 — Jardim Guanabara, Rio de Janeiro/RJ, CEP 21940-005",
      photoUrl: "https://randomuser.me/api/portraits/women/49.jpg",
      dueDay: 15,
      monthlyFeeCents: 16000,
      discountCents: 0,
      startMonth: "2025-01",
      charges: buildChargesTimeline("2025-01", referenceDate),
      enrollmentStatus: "awaiting_renewal",
      contractScenario: "expired",
      parqScenario: "expired",
      attendancePattern: "regular"
    },

    // 21. Arthur Medeiros
    {
      key: "student-21",
      fullName: "Arthur Medeiros",
      email: "arthur.medeiros@minor.ebenertkd.internal",
      username: "arthur.medeiros",
      role: "minor_student",
      guardianName: "Vanessa Medeiros",
      guardianPhone: "21976541230",
      classKey: "children-morning",
      classKeys: ["children-morning"],
      rankKey: "gub-10",
      birthDate: "2017-09-02",
      phone: "21981230987",
      cpf: "90000000021",
      address: "Rua Capitão Barbosa, 580 — Cocotá, Rio de Janeiro/RJ, CEP 21921-520",
      photoUrl: "https://randomuser.me/api/portraits/men/12.jpg",
      dueDay: 5,
      monthlyFeeCents: 12000,
      discountCents: 0,
      startMonth: "2026-04",
      charges: buildChargesTimeline("2026-04", referenceDate),
      enrollmentStatus: "active",
      contractScenario: "signed",
      parqScenario: "valid",
      attendancePattern: "regular",
      examParticipations: [
        {
          eventIdKey: "upcoming-exam",
          targetRankKey: "gub-9",
          feeCents: 15000,
          status: "registered",
          chargeStatus: "pending"
        }
      ],
      examParticipation: {
        eventIdKey: "upcoming-exam",
        targetRankKey: "gub-9",
        feeCents: 15000,
        status: "registered",
        chargeStatus: "pending"
      }
    },

    // 22. Bernardo Lima (MATRÍCULA PAUSADA: Trancada temporariamente)
    {
      key: "student-22",
      fullName: "Bernardo Lima",
      email: "bernardo.lima@ebenertkd.app",
      role: "adult_student",
      classKey: "adult-night",
      classKeys: ["adult-night", "masters-morning"],
      rankKey: "gub-5",
      birthDate: "1990-02-18",
      phone: "21998761234",
      cpf: "90000000022",
      address: "Rua Uçá, 18 — Jardim Guanabara, Rio de Janeiro/RJ, CEP 21940-010",
      photoUrl: "https://randomuser.me/api/portraits/men/78.jpg",
      dueDay: 10,
      monthlyFeeCents: 17000,
      discountCents: 0,
      startMonth: "2025-01",
      charges: buildChargesTimeline("2025-01", referenceDate, { specialState: "paused" }),
      enrollmentStatus: "paused",
      contractScenario: "signed",
      parqScenario: "valid",
      attendancePattern: "none"
    },

    // 23. Larissa Duarte (MATRÍCULA DRAFT: Rascunho inicial não enviado)
    {
      key: "student-23",
      fullName: "Larissa Duarte",
      email: "larissa.duarte@ebenertkd.app",
      role: "adult_student",
      classKey: "adult-night",
      classKeys: ["adult-night"],
      rankKey: "gub-10",
      birthDate: "2000-05-10",
      phone: "21991238877",
      cpf: "90000000023",
      address: "Rua Cambaúba, 800 — Jardim Guanabara, Rio de Janeiro/RJ, CEP 21940-000",
      photoUrl: "https://randomuser.me/api/portraits/women/62.jpg",
      dueDay: 10,
      monthlyFeeCents: 16000,
      discountCents: 0,
      charges: [],
      enrollmentStatus: "draft",
      contractScenario: "none",
      parqScenario: "missing",
      attendancePattern: "none"
    },

    // 24. Guilherme Prado (AGUARDANDO ASSINATURA: Contrato gerado pela academia)
    {
      key: "student-24",
      fullName: "Guilherme Prado",
      email: "guilherme.prado@ebenertkd.app",
      role: "adult_student",
      classKey: "adult-night",
      classKeys: ["adult-night"],
      rankKey: "gub-10",
      birthDate: "1995-10-24",
      phone: "21983451122",
      cpf: "90000000024",
      address: "Estrada do Galeão, 1400 — Portuguesa, Rio de Janeiro/RJ, CEP 21931-522",
      photoUrl: "https://randomuser.me/api/portraits/men/50.jpg",
      dueDay: 15,
      monthlyFeeCents: 16000,
      discountCents: 0,
      charges: [{ competence: current, state: "pending" }],
      enrollmentStatus: "awaiting_signature",
      contractScenario: "pending_signature",
      parqScenario: "valid",
      attendancePattern: "none"
    },

    // 25. Renan Duarte (CANCELADA: Rescisão formal com taxa de saída quitada)
    {
      key: "student-25",
      fullName: "Renan Duarte",
      email: "renan.duarte@ebenertkd.app",
      role: "adult_student",
      classKey: "adult-night",
      classKeys: ["adult-night"],
      rankKey: "gub-8",
      birthDate: "1988-12-03",
      phone: "21997654433",
      cpf: "90000000025",
      address: "Rua República Árabe Unida, 200 — Ilha do Governador, Rio de Janeiro/RJ, CEP 21931-500",
      photoUrl: "https://randomuser.me/api/portraits/men/42.jpg",
      dueDay: 10,
      monthlyFeeCents: 16000,
      discountCents: 0,
      startMonth: "2025-05",
      charges: buildChargesTimeline("2025-05", referenceDate, {
        specialState: "cancelled",
        exitMonth: "2026-04"
      }),
      enrollmentStatus: "cancelled",
      contractScenario: "cancelled",
      cancellationDetails: {
        noticeDate: "2026-03-18T12:00:00.000Z",
        targetExitMonth: "2026-04-01T12:00:00.000Z",
        suggestedFeeCents: 10000,
        decidedFeeCents: 10000,
        reason: "Mudança de cidade para a Região dos Lagos por motivos profissionais.",
        decisionNotes: "Cancelamento solicitado com antecedência regular. Taxa rescisória de R$ 100,00 quitada."
      },
      parqScenario: "expired",
      attendancePattern: "none"
    },

    // 26. Leticia Ramos (EM ANÁLISE: Coordenação avaliando documentação)
    {
      key: "student-26",
      fullName: "Leticia Ramos",
      email: "leticia.ramos@ebenertkd.app",
      role: "adult_student",
      classKey: "masters-morning",
      classKeys: ["masters-morning"],
      rankKey: "gub-10",
      birthDate: "1992-04-18",
      phone: "21981237766",
      cpf: "90000000026",
      address: "Rua Maestro Paulo e Silva, 600 — Jardim Guanabara, Rio de Janeiro/RJ, CEP 21940-340",
      photoUrl: "https://randomuser.me/api/portraits/women/31.jpg",
      dueDay: 20,
      monthlyFeeCents: 16000,
      discountCents: 0,
      charges: [{ competence: current, state: "pending" }],
      enrollmentStatus: "under_review",
      contractScenario: "none",
      parqScenario: "valid",
      attendancePattern: "none"
    }
  ];
}

export function demoSimpleEventDefinitions(referenceDate = new Date().toISOString()) {
  const month = monthOffset(referenceDate, 1);
  return [
    {
      key: "aulao-chutes",
      event_type: "seminar" as const,
      title: "Aulão de chutes",
      description: "Treino especial aberto a convidados de outras academias.",
      starts_at: `${month}-12T12:00:00.000Z`,
      ends_at: `${month}-12T14:00:00.000Z`,
      location_text: "Dojang Central Ebener TKD",
      audience: "students_and_guests" as const,
      capacity: 30,
      max_companions: 0,
      companion_price_cents: 0,
      option_label: "Participante",
      price_cents: 3000
    },
    {
      key: "confraternizacao",
      event_type: "social" as const,
      title: "Confraternização de fim de ano",
      description: "Churrasco com a família. Cada aluno pode levar acompanhantes.",
      starts_at: `${month}-20T21:00:00.000Z`,
      ends_at: `${month}-21T00:00:00.000Z`,
      location_text: "Dojang Central Ebener TKD",
      audience: "students" as const,
      capacity: 80,
      max_companions: 4,
      companion_price_cents: 4000,
      option_label: "Aluno",
      price_cents: 4000
    }
  ];
}

export function demoExamDefinitions(referenceDate = new Date().toISOString()) {
  const currentMonth = monthOffset(referenceDate, 0);
  return [
    {
      key: "exam-2025-1",
      name: "30º Exame de Faixas — Primeiro Semestre 2025",
      event_date: "2025-06-21T12:00:00.000Z",
      location: "Dojang Central Ebener TKD",
      default_fee_cents: 15000,
      status: "completed" as const,
      created_at: "2025-05-01T12:00:00.000Z"
    },
    {
      key: "exam-2025-2",
      name: "31º Exame de Faixas — Segundo Semestre 2025",
      event_date: "2025-12-13T12:00:00.000Z",
      location: "Dojang Central Ebener TKD",
      default_fee_cents: 15000,
      status: "completed" as const,
      created_at: "2025-11-01T12:00:00.000Z"
    },
    {
      key: "exam-2026-1",
      name: "32º Exame de Faixas — Primeiro Semestre 2026",
      event_date: "2026-06-20T12:00:00.000Z",
      location: "Dojang Central Ebener TKD",
      default_fee_cents: 15000,
      status: "completed" as const,
      created_at: "2026-05-01T12:00:00.000Z"
    },
    {
      key: "upcoming-exam",
      name: "33º Exame de Faixas — Segundo Semestre 2026",
      event_date: `${currentMonth}-28T12:00:00.000Z`,
      location: "Dojang Central Ebener TKD",
      default_fee_cents: 15000,
      status: "confirmed" as const,
      created_at: `${currentMonth}-01T12:00:00.000Z`
    }
  ];
}
