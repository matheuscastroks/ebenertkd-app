import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { EventCard } from "@/features/events/components/event-card";
import type { EventCardData } from "@/features/events/event-service";
import type { EventOption } from "@/features/events/types";
import { StudentExamsView } from "@/features/exams/components/student-exams-view";
import type { StudentExamEntry } from "@/features/exams/rules";
import { EarnedBadges } from "@/features/students/components/earned-badges";
import { EmptyState } from "./empty-state";
import { AppIllustration } from "./app-illustration";
import { illustrationNames } from "./illustration-catalog";

vi.mock("@/app/actions/championships", () => ({ updateWeightAction: vi.fn(), uploadRegistrationDocumentAction: vi.fn() }));
vi.mock("@/app/actions/events", () => ({ registerForEventAction: vi.fn(), cancelRegistrationAction: vi.fn(), rejectRegistrationAction: vi.fn(), confirmInterestAction: vi.fn() }));

import { StudentEventsView } from "@/features/events/components/student-events-view";

const event = {
  $id: "illustration-example", event_type: "seminar", title: "Aulão de Taekwondo para todas as turmas e famílias da academia",
  status: "registration_open", starts_at: "2027-12-12T12:00:00Z", audience: "students",
  location_text: "Ginásio municipal — entrada pela portaria principal", max_companions: 0,
  description: "Treino coletivo com técnicas e atividades para diferentes níveis de experiência.",
} as EventCardData["event"];
const adminData = { event, seatsTaken: 8, waitlisted: 2, pendingApproval: 1, people: [], peopleTotal: 8, examParticipants: 0 } as EventCardData;
const exam = {
  event: { $id: "exam-preview", name: "Exame de faixa de todas as turmas da academia", event_date: "2027-12-05T12:00:00Z", location: "Dojang Ebener", status: "confirmed" },
  participant: { $id: "exam-participant-preview", status: "registered", target_rank_key: "gub-7", fee_cents: 8000 },
} as StudentExamEntry;
const studentProps = {
  hasStudent: true, studentProfileId: "preview", returnTo: "/aluno/eventos", billingHref: "/aluno/financeiro", examsHref: "/aluno/exames",
  showFinancial: true, viewer: { kind: "self" as const }, upcoming: [], past: [],
  open: [{ event, registrationState: "open" as const, seatsLeft: 12, options: [{ option: { $id: "preview-option", event_id: event.$id, label: "Participante", price_cents: 3000 } as EventOption, eligible: true, reasons: [], seatsLeft: 12 }] }],
};

function Preview() {
  return <main className="mx-auto max-w-5xl space-y-6 p-4">
    <h1 className="text-2xl font-semibold">Ilustrações — componentes reais</h1>
    <h2 className="text-lg font-semibold">Agenda do professor</h2><ul className="space-y-4"><EventCard data={adminData} /><EventCard data={adminData} compact /></ul>
    <StudentEventsView {...studentProps} />
    <StudentExamsView hasStudent upcoming={[exam]} past={[]} showFinancial />
    <EarnedBadges badges={[{ $id: "gold-preview", kind: "medal_gold", title: "Medalha de ouro no campeonato da academia", awarded_at: "2026-11-01T12:00:00Z" }]} />
    <EmptyState illustration="empty-agenda" title="Nenhum evento no momento" description="Os próximos eventos aparecem aqui assim que o professor publicar." />
    <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">{illustrationNames.map((name) => <div key={name} className="min-w-0 rounded-xl bg-card p-4"><AppIllustration name={name} context="achievement" /><p className="break-words text-xs">{name}</p></div>)}</section>
  </main>;
}

describe("illustration integration", () => {
  it("keeps the location and its icon grouped after the browser parses server HTML", () => {
    const parsed = document.createElement("div");
    parsed.innerHTML = renderToStaticMarkup(<ul><EventCard data={adminData} /></ul>);
    const location = [...parsed.querySelectorAll("dd")].find((item) => item.textContent === event.location_text);
    expect(location).toBeDefined();
    expect(location?.querySelector("svg")).not.toBeNull();
  });
  it("keeps exam routing and event metadata on the illustrated admin card", () => {
    const data = { ...adminData, event: { ...event, event_type: "belt_exam" as const } };
    const { container } = render(<ul><EventCard data={data} /></ul>);
    expect(screen.getByRole("link", { name: "Abrir" })).toHaveAttribute("href", `/admin/eventos/exames/${event.$id}`);
    expect(container.querySelector("img")?.getAttribute("src")).toMatch(/\/illustrations\/event-belt-exam.webp$/);
    expect(screen.getByText(/1 pendente/)).toBeVisible();
  });
  it("keeps student registration available beside the matching illustration", () => {
    const { container } = render(<StudentEventsView {...studentProps} />);
    expect(container.querySelector("img")?.getAttribute("src")).toMatch(/\/illustrations\/event-seminar.webp$/);
    expect(screen.getByRole("button", { name: "Inscrever-se" })).toBeVisible();
    expect(screen.getByText(/12 vagas restantes/)).toBeVisible();
  });
  it("can export actual component markup for local browser verification", async () => {
    if (process.env.ILLUSTRATION_PREVIEW !== "1") return;
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const { pathToFileURL } = await import("node:url");
    const { default: postcss } = await import("postcss");
    const { default: tailwind } = await import("@tailwindcss/postcss");
    const cssPath = path.resolve("src/app/globals.css");
    const css = await postcss([tailwind()]).process(await fs.readFile(cssPath, "utf8"), { from: cssPath });
    const images = pathToFileURL(path.resolve("public/illustrations")).href;
    const markup = renderToStaticMarkup(<Preview />).replace(/src="(?:http:\/\/localhost:3000)?\/illustrations\//g, `src="${images}/`);
    await fs.mkdir("reports/illustrations", { recursive: true });
    await fs.writeFile("reports/illustrations/components.html", `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Componentes ilustrados</title><style>${css.css}</style><body>${markup}</body></html>`);
    expect(markup).toContain("event-seminar.webp");
  });
});
