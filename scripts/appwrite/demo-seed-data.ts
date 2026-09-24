import { createHash } from "node:crypto";

export type DemoStudentKey = "adult" | "minor" | "junior";
export type DemoChargeState = "paid" | "pending" | "overdue" | "proof_under_review";

export type DemoStudentScenario = {
  key: DemoStudentKey;
  email: string;
  classKey: "adult-night" | "children-morning" | "youth-afternoon";
  belt: string;
  gub: number;
  dueDay: number;
  monthlyFeeCents: number;
  discountCents: number;
  charges: Array<{ competence: string; state: DemoChargeState }>;
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
    { key: "adult", email: "camila.ferreira@ebenertkd.app", classKey: "adult-night", belt: "Azul", gub: 4, dueDay: 10, monthlyFeeCents: 17000, discountCents: 2000, charges: [{ competence: previous, state: "paid" }, { competence: current, state: "overdue" }, { competence: next, state: "pending" }] },
    { key: "minor", email: "lucas.mendes@minor.ebenertkd.internal", classKey: "children-morning", belt: "Amarela", gub: 8, dueDay: 5, monthlyFeeCents: 12000, discountCents: 0, charges: [{ competence: previous, state: "overdue" }, { competence: current, state: "proof_under_review" }, { competence: next, state: "pending" }] },
    { key: "junior", email: "pedro.ferreira@minor.ebenertkd.internal", classKey: "youth-afternoon", belt: "Laranja", gub: 7, dueDay: 20, monthlyFeeCents: 14000, discountCents: 1000, charges: [{ competence: previous, state: "paid" }, { competence: current, state: "overdue" }, { competence: next, state: "pending" }] }
  ];
}
