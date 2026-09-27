import { createHash } from "node:crypto";

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

export type DemoStudentScenario = {
  key: DemoStudentKey;
  fullName: string;
  email: string;
  role: "adult_student" | "minor_student";
  username?: string;
  guardianEmail?: string;
  guardianName?: string;
  guardianPhone?: string;
  classKey: "adult-night" | "children-morning" | "youth-afternoon" | "competition-team" | "masters-morning";
  classKeys?: DemoClassKey[];
  belt: string;
  gub: number;
  birthDate: string;
  phone: string;
  cpf: string;
  address: string;
  photoUrl: string;
  dueDay: number;
  monthlyFeeCents: number;
  discountCents: number;
  charges: Array<{ competence: string; state: DemoChargeState }>;
  healthCondition?: "yes" | "no";
  healthDetails?: string | null;
  medications?: string | null;
  allergies?: string | null;
  injuries?: string | null;
  enrollmentStatus?: "active" | "submitted" | "under_review" | "paused";
  examParticipation?: {
    eventIdKey: "past-exam" | "upcoming-exam";
    targetBelt: string;
    targetGub: number;
    feeCents: number;
    status: "approved" | "failed" | "absent" | "registered";
    chargeStatus?: "paid" | "pending" | "proof_under_review";
    notes?: string;
  };
  pastExamRecord?: {
    previousBelt: string;
    previousGub: number;
    newBelt: string;
    newGub: number;
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

export function demoDueDate(competence: string, dueDay: number) {
  const [year, month] = competence.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${competence}-${String(Math.min(dueDay, lastDay)).padStart(2, "0")}T12:00:00.000Z`;
}

export function buildDemoScenario(referenceDate = new Date().toISOString()): DemoStudentScenario[] {
  const previous = monthOffset(referenceDate, -1);
  const current = monthOffset(referenceDate, 0);
  const next = monthOffset(referenceDate, 1);

  return [
    {
      key: "adult",
      fullName: "Camila Ferreira",
      email: "camila.ferreira@ebenertkd.app",
      role: "adult_student",
      classKey: "adult-night",
      classKeys: ["adult-night", "competition-team"],
      belt: "Azul",
      gub: 4,
      birthDate: "1994-04-12",
      phone: "21984567231",
      cpf: "90000000001",
      address: "Rua Cambaúba, 420, Apto 302 — Jardim Guanabara, Rio de Janeiro/RJ, CEP 21940-000",
      photoUrl: "https://randomuser.me/api/portraits/women/44.jpg",
      dueDay: 10,
      monthlyFeeCents: 17000,
      discountCents: 2000,
      charges: [
        { competence: previous, state: "paid" },
        { competence: current, state: "overdue" },
        { competence: next, state: "pending" }
      ],
      injuries: "Entorse no tornozelo direito em 2023, sem limitações atuais.",
      enrollmentStatus: "active",
      examParticipation: {
        eventIdKey: "upcoming-exam",
        targetBelt: "Ponta Vermelha",
        targetGub: 3,
        feeCents: 15000,
        status: "registered",
        chargeStatus: "paid"
      }
    },
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
      belt: "Amarela",
      gub: 8,
      birthDate: "2014-08-03",
      phone: "21976341852",
      cpf: "90000000002",
      address: "Estrada do Cacuia, 150, Bloco 2, Ap 104 — Cacuia, Rio de Janeiro/RJ, CEP 21921-000",
      photoUrl: "https://randomuser.me/api/portraits/men/32.jpg",
      dueDay: 5,
      monthlyFeeCents: 12000,
      discountCents: 0,
      charges: [
        { competence: previous, state: "overdue" },
        { competence: current, state: "proof_under_review" },
        { competence: next, state: "pending" }
      ],
      healthCondition: "yes",
      healthDetails: "Asma leve, com uso de bombinha conforme orientação médica.",
      medications: "Salbutamol, somente quando necessário.",
      enrollmentStatus: "active",
      examParticipation: {
        eventIdKey: "upcoming-exam",
        targetBelt: "Ponta Verde",
        targetGub: 7,
        feeCents: 15000,
        status: "registered",
        chargeStatus: "proof_under_review"
      }
    },
    {
      key: "junior",
      fullName: "Pedro Ferreira",
      email: "pedro.ferreira@minor.ebenertkd.internal",
      username: "pedro.ferreira",
      role: "minor_student",
      guardianEmail: "camila.ferreira@ebenertkd.app",
      guardianName: "Marcos Ferreira",
      guardianPhone: "21982345679",
      classKey: "youth-afternoon",
      classKeys: ["youth-afternoon"],
      belt: "Ponta Verde",
      gub: 7,
      birthDate: "2012-11-19",
      phone: "21991236478",
      cpf: "90000000003",
      address: "Praia da Bica, 1250 — Jardim Guanabara, Rio de Janeiro/RJ, CEP 21940-200",
      photoUrl: "https://randomuser.me/api/portraits/men/45.jpg",
      dueDay: 20,
      monthlyFeeCents: 14000,
      discountCents: 1000,
      charges: [
        { competence: previous, state: "paid" },
        { competence: current, state: "overdue" },
        { competence: next, state: "pending" }
      ],
      allergies: "Dipirona.",
      enrollmentStatus: "active"
    },
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
      belt: "Ponta Amarela",
      gub: 9,
      birthDate: "2016-03-22",
      phone: "21987123456",
      cpf: "90000000004",
      address: "Estrada do Cacuia, 150, Bloco 2, Ap 104 — Cacuia, Rio de Janeiro/RJ, CEP 21921-000",
      photoUrl: "https://randomuser.me/api/portraits/women/68.jpg",
      dueDay: 5,
      monthlyFeeCents: 12000,
      discountCents: 2000,
      charges: [
        { competence: previous, state: "paid" },
        { competence: current, state: "paid" },
        { competence: next, state: "pending" }
      ],
      enrollmentStatus: "active",
      pastExamRecord: {
        previousBelt: "Branca",
        previousGub: 10,
        newBelt: "Ponta Amarela",
        newGub: 9,
        achievedAt: "2026-06-15T12:00:00.000Z"
      },
      examParticipation: {
        eventIdKey: "past-exam",
        targetBelt: "Ponta Amarela",
        targetGub: 9,
        feeCents: 15000,
        status: "approved",
        notes: "Excelente execução dos chutes básicos e disciplina exemplar."
      }
    },
    {
      key: "student-05",
      fullName: "Rodrigo Silveira",
      email: "rodrigo.silveira@ebenertkd.app",
      role: "adult_student",
      classKey: "adult-night",
      classKeys: ["adult-night", "competition-team"],
      belt: "Vermelha",
      gub: 2,
      birthDate: "1999-07-15",
      phone: "21998765432",
      cpf: "90000000005",
      address: "Rua República Árabe Unida, 88 — Portuguesa, Rio de Janeiro/RJ, CEP 21931-500",
      photoUrl: "https://randomuser.me/api/portraits/men/22.jpg",
      dueDay: 15,
      monthlyFeeCents: 18000,
      discountCents: 0,
      charges: [
        { competence: previous, state: "paid" },
        { competence: current, state: "paid" },
        { competence: next, state: "pending" }
      ],
      enrollmentStatus: "active",
      examParticipation: {
        eventIdKey: "upcoming-exam",
        targetBelt: "Ponta Preta",
        targetGub: 1,
        feeCents: 15000,
        status: "registered",
        chargeStatus: "paid"
      }
    },
    {
      key: "student-06",
      fullName: "Mariana Albuquerque",
      email: "mariana.albuquerque@ebenertkd.app",
      role: "adult_student",
      classKey: "adult-night",
      classKeys: ["adult-night"],
      belt: "Verde",
      gub: 6,
      birthDate: "2002-09-08",
      phone: "21981234567",
      cpf: "90000000006",
      address: "Praça Jerônimo de Araújo, 15 — Ribeira, Rio de Janeiro/RJ, CEP 21930-000",
      photoUrl: "https://randomuser.me/api/portraits/women/24.jpg",
      dueDay: 10,
      monthlyFeeCents: 16000,
      discountCents: 0,
      charges: [
        { competence: previous, state: "paid" },
        { competence: current, state: "pending" },
        { competence: next, state: "pending" }
      ],
      enrollmentStatus: "active",
      examParticipation: {
        eventIdKey: "upcoming-exam",
        targetBelt: "Ponta Azul",
        targetGub: 5,
        feeCents: 15000,
        status: "registered",
        chargeStatus: "pending"
      }
    },
    {
      key: "student-07",
      fullName: "Gabriel Souza",
      email: "gabriel.souza@ebenertkd.app",
      role: "adult_student",
      classKey: "masters-morning",
      classKeys: ["masters-morning"],
      belt: "Ponta Vermelha",
      gub: 3,
      birthDate: "1994-01-30",
      phone: "21974561234",
      cpf: "90000000007",
      address: "Estrada da Cava, 65 — Moneró, Rio de Janeiro/RJ, CEP 21920-100",
      photoUrl: "https://randomuser.me/api/portraits/men/11.jpg",
      dueDay: 25,
      monthlyFeeCents: 17000,
      discountCents: 0,
      charges: [
        { competence: previous, state: "paid" },
        { competence: current, state: "paid" },
        { competence: next, state: "pending" }
      ],
      enrollmentStatus: "active",
      examParticipation: {
        eventIdKey: "past-exam",
        targetBelt: "Vermelha",
        targetGub: 2,
        feeCents: 15000,
        status: "failed",
        notes: "Necessário maior controle de base no Poomsae e equilíbrio nos chutes giratórios."
      }
    },
    {
      key: "student-08",
      fullName: "Larissa Prado",
      email: "larissa.prado@ebenertkd.app",
      role: "adult_student",
      classKey: "adult-night",
      classKeys: ["adult-night"],
      belt: "Amarela",
      gub: 8,
      birthDate: "1997-12-05",
      phone: "21989012345",
      cpf: "90000000008",
      address: "Rua Paranapuã, 1100, Ap 201 — Freguesia (Ilha), Rio de Janeiro/RJ, CEP 21911-000",
      photoUrl: "https://randomuser.me/api/portraits/women/17.jpg",
      dueDay: 10,
      monthlyFeeCents: 15000,
      discountCents: 0,
      charges: [
        { competence: previous, state: "paid" },
        { competence: current, state: "paid" },
        { competence: next, state: "pending" }
      ],
      enrollmentStatus: "active",
      examParticipation: {
        eventIdKey: "past-exam",
        targetBelt: "Ponta Verde",
        targetGub: 7,
        feeCents: 15000,
        status: "absent"
      }
    },
    {
      key: "student-09",
      fullName: "Thiago Barreto",
      email: "thiago.barreto@ebenertkd.app",
      role: "adult_student",
      classKey: "adult-night",
      classKeys: ["adult-night", "masters-morning", "competition-team"],
      belt: "Ponta Preta",
      gub: 1,
      birthDate: "2003-05-18",
      phone: "21995678901",
      cpf: "90000000009",
      address: "Rua Tenente Cleto Campelo, 215 — Cocotá, Rio de Janeiro/RJ, CEP 21910-060",
      photoUrl: "https://randomuser.me/api/portraits/men/86.jpg",
      dueDay: 5,
      monthlyFeeCents: 22000,
      discountCents: 3000,
      charges: [
        { competence: previous, state: "paid" },
        { competence: current, state: "paid" },
        { competence: next, state: "pending" }
      ],
      enrollmentStatus: "active",
      examParticipation: {
        eventIdKey: "upcoming-exam",
        targetBelt: "Preta",
        targetGub: 0,
        feeCents: 25000,
        status: "registered",
        chargeStatus: "paid"
      }
    },
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
      belt: "Ponta Azul",
      gub: 5,
      birthDate: "2013-02-14",
      phone: "21983456789",
      cpf: "90000000010",
      address: "Avenida Paranapuã, 820 — Tauá, Rio de Janeiro/RJ, CEP 21910-250",
      photoUrl: "https://randomuser.me/api/portraits/women/33.jpg",
      dueDay: 15,
      monthlyFeeCents: 14000,
      discountCents: 0,
      charges: [
        { competence: previous, state: "paid" },
        { competence: current, state: "paid" },
        { competence: next, state: "pending" }
      ],
      enrollmentStatus: "active"
    },
    {
      key: "student-11",
      fullName: "Felipe Vasconcelos",
      email: "felipe.vasconcelos@ebenertkd.app",
      role: "adult_student",
      classKey: "adult-night",
      classKeys: ["adult-night"],
      belt: "Branca",
      gub: 10,
      birthDate: "1991-08-25",
      phone: "21972345678",
      cpf: "90000000011",
      address: "Rua Gregório de Castro Morais, 45 — Jardim Carioca, Rio de Janeiro/RJ, CEP 21921-390",
      photoUrl: "https://randomuser.me/api/portraits/men/64.jpg",
      dueDay: 10,
      monthlyFeeCents: 16000,
      discountCents: 0,
      charges: [
        { competence: previous, state: "overdue" },
        { competence: current, state: "overdue" },
        { competence: next, state: "pending" }
      ],
      enrollmentStatus: "active",
      examParticipation: {
        eventIdKey: "upcoming-exam",
        targetBelt: "Ponta Amarela",
        targetGub: 9,
        feeCents: 15000,
        status: "registered",
        chargeStatus: "pending"
      }
    },
    {
      key: "student-12",
      fullName: "Julio Cesar Martins",
      email: "julio.martins@ebenertkd.app",
      role: "adult_student",
      classKey: "masters-morning",
      classKeys: ["masters-morning"],
      belt: "Verde",
      gub: 6,
      birthDate: "1984-10-11",
      phone: "21996781234",
      cpf: "90000000012",
      address: "Rua Manuel Bonfim, 110 — Bancários, Rio de Janeiro/RJ, CEP 21910-180",
      photoUrl: "https://randomuser.me/api/portraits/men/75.jpg",
      dueDay: 20,
      monthlyFeeCents: 16000,
      discountCents: 0,
      charges: [
        { competence: previous, state: "paid" },
        { competence: current, state: "paid" },
        { competence: next, state: "pending" }
      ],
      enrollmentStatus: "active",
      pastExamRecord: {
        previousBelt: "Ponta Verde",
        previousGub: 7,
        newBelt: "Verde",
        newGub: 6,
        achievedAt: "2026-06-15T12:00:00.000Z"
      },
      examParticipation: {
        eventIdKey: "past-exam",
        targetBelt: "Verde",
        targetGub: 6,
        feeCents: 15000,
        status: "approved",
        notes: "Muito seguro nas defesas e contra-ataques."
      }
    },
    {
      key: "student-13",
      fullName: "Isabela Fontes",
      email: "isabela.fontes@ebenertkd.app",
      role: "adult_student",
      classKey: "adult-night",
      classKeys: ["adult-night"],
      belt: "Ponta Amarela",
      gub: 9,
      birthDate: "1998-04-03",
      phone: "21988901234",
      cpf: "90000000013",
      address: "Praia da Bandeira, 98 — Praia da Bandeira, Rio de Janeiro/RJ, CEP 21931-370",
      photoUrl: "https://randomuser.me/api/portraits/women/90.jpg",
      dueDay: 15,
      monthlyFeeCents: 15000,
      discountCents: 0,
      charges: [
        { competence: previous, state: "paid" },
        { competence: current, state: "pending" },
        { competence: next, state: "pending" }
      ],
      enrollmentStatus: "active",
      examParticipation: {
        eventIdKey: "upcoming-exam",
        targetBelt: "Amarela",
        targetGub: 8,
        feeCents: 15000,
        status: "registered",
        chargeStatus: "paid"
      }
    },
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
      belt: "Branca",
      gub: 10,
      birthDate: "2015-06-17",
      phone: "21975432109",
      cpf: "90000000014",
      address: "Rua Érico Veríssimo, 55 — Pitangueiras, Rio de Janeiro/RJ, CEP 21931-290",
      photoUrl: "https://randomuser.me/api/portraits/men/36.jpg",
      dueDay: 5,
      monthlyFeeCents: 12000,
      discountCents: 0,
      charges: [
        { competence: previous, state: "paid" },
        { competence: current, state: "paid" },
        { competence: next, state: "pending" }
      ],
      enrollmentStatus: "active",
      examParticipation: {
        eventIdKey: "upcoming-exam",
        targetBelt: "Ponta Amarela",
        targetGub: 9,
        feeCents: 15000,
        status: "registered",
        chargeStatus: "paid"
      }
    },
    {
      key: "student-15",
      fullName: "Rafael Guimarães",
      email: "rafael.guimaraes@ebenertkd.app",
      role: "adult_student",
      classKey: "adult-night",
      classKeys: ["adult-night", "competition-team"],
      belt: "Azul",
      gub: 4,
      birthDate: "2001-11-20",
      phone: "21992345671",
      cpf: "90000000015",
      address: "Estrada das Canárias, 340 — Galeão, Rio de Janeiro/RJ, CEP 21941-480",
      photoUrl: "https://randomuser.me/api/portraits/men/54.jpg",
      dueDay: 10,
      monthlyFeeCents: 18000,
      discountCents: 0,
      charges: [
        { competence: previous, state: "paid" },
        { competence: current, state: "paid" },
        { competence: next, state: "pending" }
      ],
      enrollmentStatus: "active",
      examParticipation: {
        eventIdKey: "upcoming-exam",
        targetBelt: "Ponta Vermelha",
        targetGub: 3,
        feeCents: 15000,
        status: "registered",
        chargeStatus: "paid"
      }
    },
    {
      key: "student-16",
      fullName: "Carolina Nogueira",
      email: "carolina.nogueira@ebenertkd.app",
      role: "adult_student",
      classKey: "adult-night",
      classKeys: ["adult-night"],
      belt: "Ponta Verde",
      gub: 7,
      birthDate: "1993-03-12",
      phone: "21986712349",
      cpf: "90000000016",
      address: "Rua Peixoto de Carvalho, 72 — Zumbi, Rio de Janeiro/RJ, CEP 21930-140",
      photoUrl: "https://randomuser.me/api/portraits/women/56.jpg",
      dueDay: 15,
      monthlyFeeCents: 15000,
      discountCents: 0,
      charges: [
        { competence: previous, state: "paid" },
        { competence: current, state: "paid" },
        { competence: next, state: "pending" }
      ],
      enrollmentStatus: "active"
    },
    {
      key: "student-17",
      fullName: "Matheus Barbosa",
      email: "matheus.barbosa@ebenertkd.app",
      role: "adult_student",
      classKey: "adult-night",
      classKeys: ["adult-night"],
      belt: "Vermelha",
      gub: 2,
      birthDate: "1996-06-29",
      phone: "21993456782",
      cpf: "90000000017",
      address: "Rua Sargento João Lopes, 310 — Cacuia, Rio de Janeiro/RJ, CEP 21921-500",
      photoUrl: "https://randomuser.me/api/portraits/men/18.jpg",
      dueDay: 10,
      monthlyFeeCents: 17000,
      discountCents: 0,
      charges: [
        { competence: previous, state: "paid" },
        { competence: current, state: "paid" },
        { competence: next, state: "pending" }
      ],
      enrollmentStatus: "active",
      pastExamRecord: {
        previousBelt: "Ponta Vermelha",
        previousGub: 3,
        newBelt: "Vermelha",
        newGub: 2,
        achievedAt: "2026-06-15T12:00:00.000Z"
      },
      examParticipation: {
        eventIdKey: "past-exam",
        targetBelt: "Vermelha",
        targetGub: 2,
        feeCents: 15000,
        status: "approved",
        notes: "Ótima potência nos socos e chutes na linha de cintura."
      }
    },
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
      belt: "Ponta Verde",
      gub: 7,
      birthDate: "2012-08-05",
      phone: "21977654321",
      cpf: "90000000018",
      address: "Rua Luís Beltrão, 80 — Moneró, Rio de Janeiro/RJ, CEP 21920-250",
      photoUrl: "https://randomuser.me/api/portraits/women/65.jpg",
      dueDay: 20,
      monthlyFeeCents: 14000,
      discountCents: 0,
      charges: [
        { competence: previous, state: "paid" },
        { competence: current, state: "proof_under_review" },
        { competence: next, state: "pending" }
      ],
      enrollmentStatus: "active",
      examParticipation: {
        eventIdKey: "upcoming-exam",
        targetBelt: "Verde",
        targetGub: 6,
        feeCents: 15000,
        status: "registered",
        chargeStatus: "proof_under_review"
      }
    },
    {
      key: "student-19",
      fullName: "Vinicius Teixeira",
      email: "vinicius.teixeira@ebenertkd.app",
      role: "adult_student",
      classKey: "adult-night",
      classKeys: ["adult-night"],
      belt: "Branca",
      gub: 10,
      birthDate: "2002-12-14",
      phone: "21994567123",
      cpf: "90000000019",
      address: "Rua Maestro Paulo e Silva, 400 — Jardim Guanabara, Rio de Janeiro/RJ, CEP 21940-340",
      photoUrl: "https://randomuser.me/api/portraits/men/91.jpg",
      dueDay: 10,
      monthlyFeeCents: 15000,
      discountCents: 0,
      charges: [{ competence: current, state: "pending" }],
      enrollmentStatus: "under_review"
    },
    {
      key: "student-20",
      fullName: "Daniela Meireles",
      email: "daniela.meireles@ebenertkd.app",
      role: "adult_student",
      classKey: "masters-morning",
      classKeys: ["masters-morning"],
      belt: "Amarela",
      gub: 8,
      birthDate: "1986-07-21",
      phone: "21989014567",
      cpf: "90000000020",
      address: "Rua Colina, 60 — Jardim Guanabara, Rio de Janeiro/RJ, CEP 21940-005",
      photoUrl: "https://randomuser.me/api/portraits/women/49.jpg",
      dueDay: 15,
      monthlyFeeCents: 16000,
      discountCents: 0,
      charges: [
        { competence: previous, state: "paid" },
        { competence: current, state: "paid" },
        { competence: next, state: "pending" }
      ],
      enrollmentStatus: "active"
    },
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
      belt: "Branca",
      gub: 10,
      birthDate: "2017-09-02",
      phone: "21981230987",
      cpf: "90000000021",
      address: "Rua Capitão Barbosa, 580 — Cocotá, Rio de Janeiro/RJ, CEP 21921-520",
      photoUrl: "https://randomuser.me/api/portraits/men/12.jpg",
      dueDay: 5,
      monthlyFeeCents: 12000,
      discountCents: 0,
      charges: [
        { competence: previous, state: "paid" },
        { competence: current, state: "pending" },
        { competence: next, state: "pending" }
      ],
      enrollmentStatus: "active",
      examParticipation: {
        eventIdKey: "upcoming-exam",
        targetBelt: "Ponta Amarela",
        targetGub: 9,
        feeCents: 15000,
        status: "registered",
        chargeStatus: "pending"
      }
    },
    {
      key: "student-22",
      fullName: "Bernardo Lima",
      email: "bernardo.lima@ebenertkd.app",
      role: "adult_student",
      classKey: "adult-night",
      classKeys: ["adult-night", "masters-morning"],
      belt: "Ponta Azul",
      gub: 5,
      birthDate: "1990-02-18",
      phone: "21998761234",
      cpf: "90000000022",
      address: "Rua Uçá, 18 — Jardim Guanabara, Rio de Janeiro/RJ, CEP 21940-010",
      photoUrl: "https://randomuser.me/api/portraits/men/78.jpg",
      dueDay: 10,
      monthlyFeeCents: 17000,
      discountCents: 0,
      charges: [
        { competence: previous, state: "paid" },
        { competence: current, state: "overdue" }
      ],
      enrollmentStatus: "paused"
    }
  ];
}
