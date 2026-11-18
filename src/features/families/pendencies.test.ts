import { expect, it } from "vitest";
import type { Charge } from "@/features/billing/types";
import type { Contract } from "@/features/contracts/types";
import { buildPendencies, primaryPendency } from "./pendencies";

const links = { enrollment: "/m", billing: "/f", contracts: "/c", contract: (id: string) => `/c/${id}` };

it("perfil sem acesso financeiro não gera nenhuma pendência de dinheiro", () => {
  const items = buildPendencies({ studentStatus: "active", charges: "hidden", contracts: "hidden", links, canSign: false });
  expect(items).toEqual([]);
});

it("ordena por urgência e não promove matrícula em análise a ação", () => {
  const items = buildPendencies({
    studentStatus: "submitted", canSign: true, links,
    charges: [{ status: "pending", due_date: "2026-12-05", amount_cents: 12000 } as Charge],
    contracts: [{ $id: "k", status: "pending_signature" } as Contract]
  });
  expect(items.map((item) => item.id)).toEqual(["contract", "charge", "enrollment_review"]);
  expect(items.at(-1)?.href).toBeUndefined();
  expect(primaryPendency(items)?.id).toBe("contract");
});

it("falha de consulta vira alerta e nunca a ação principal", () => {
  const items = buildPendencies({ studentStatus: "active", charges: null, contracts: [], links, canSign: true });
  expect(items[0]).toMatchObject({ id: "charges_error", alert: true });
  expect(primaryPendency(items)).toBeUndefined();
});
