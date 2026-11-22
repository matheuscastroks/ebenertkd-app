import { cloneElement, isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { DEFAULT_GAMIFICATION_POLICY } from "@/features/academy/defaults";
import type { Profile } from "@/features/auth/types";
import type { EventCardData } from "@/features/events/event-service";

const state = vi.hoisted(() => ({ path: "/aluno/eventos", admin: false, empty: false }));
vi.mock("next/navigation", () => ({
  usePathname: () => state.path,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/app/actions/auth", () => ({ logoutAction: vi.fn() }));
vi.mock("@/app/actions/championships", () => ({ updateWeightAction: vi.fn(), uploadRegistrationDocumentAction: vi.fn() }));
vi.mock("@/app/actions/events", () => ({ registerForEventAction: vi.fn(), cancelRegistrationAction: vi.fn(), rejectRegistrationAction: vi.fn(), confirmInterestAction: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireProfile: async () => profile(), requireCapability: async () => profile() }));
vi.mock("@/features/students/service", () => ({ countEnrollmentsRequiringReview: async () => 0, getOwnStudentAvatarSex: async () => null }));
vi.mock("@/features/notifications/notification-service", () => ({ countUnreadNotifications: async () => 0 }));
vi.mock("@/features/events/event-service", () => ({ getEventsOverview: async () => state.empty ? [] : eventCards }));
vi.mock("@/features/events/student-events-service", () => ({ getStudentEvents: async () => ({
  student: { $id: "demo-student" }, showFinancial: true, minorSelf: false, upcoming: [], past: [],
  open: state.empty ? [] : eventCards.filter((item) => item.event.event_type !== "belt_exam").map(({ event }) => ({
    event, registrationState: "open", seatsLeft: 12,
    options: [{ option: { $id: `option-${event.$id}`, event_id: event.$id, label: "Participante", price_cents: 3000 }, eligible: true, reasons: [], seatsLeft: 12 }],
  })),
}) }));
vi.mock("@/features/exams/student-exams-service", () => ({ getStudentExams: async () => ({
  student: { $id: "demo-student", rank_key: "gub-8" }, showFinancial: true, past: [],
  upcoming: state.empty ? [] : [{ event: { $id: "demo-exam", name: "Exame de faixa da academia", event_date: "2027-12-05T12:00:00Z", location: "Dojang Ebener", status: "confirmed" }, participant: { $id: "demo-participant", status: "registered", target_rank_key: "gub-7", fee_cents: 8000 } }],
}) }));
vi.mock("@/features/academy/config-service", () => ({ getPolicy: async () => DEFAULT_GAMIFICATION_POLICY }));
vi.mock("@/features/students/journey-service", () => ({ getStudentJourneySnapshot: async () => ({
  student: { $id: "demo-student", created_at: "2026-09-01T12:00:00Z", started_at_tkd: "2026-09-01" },
  enrollment: null, beltHistory: [], monthlySeries: [],
  attendanceEntries: Array.from({ length: 8 }, (_, index) => ({ lessonDate: `2026-11-${String(index + 1).padStart(2, "0")}`, status: "present" })),
  earnedBadges: state.empty ? [] : [
    { $id: "demo-gold", kind: "medal_gold", title: "Medalha de ouro no campeonato da academia", description: "Subiu ao pódio representando a equipe.", awarded_at: "2026-11-01T12:00:00Z" },
    { $id: "demo-exam-badge", kind: "exam_approved", title: "Aprovação em exame de faixa", awarded_at: "2026-11-01T12:00:00Z" },
  ],
}) }));
// Next uses a canary React ViewTransition; the preview keeps its exact DOM wrapper.
vi.mock("@/components/dashboard/page-transition", () => ({ PageTransition: ({ children }: { children: ReactNode }) => <div className="flex min-h-svh min-w-0 flex-1 flex-col bg-sidebar md:h-full md:min-h-0 md:overflow-hidden">{children}</div> }));

import StudentEventsPage from "@/app/aluno/eventos/page";
import AdminEventsPage from "@/app/admin/eventos/page";
import StudentExamsPage from "@/app/aluno/exames/page";
import StudentAchievementsPage from "@/app/aluno/conquistas/page";
import { PortalFrame } from "@/components/dashboard/portal-frame";
import { TooltipProvider } from "@/components/ui/tooltip";

function profile(): Profile {
  return { $id: "demo-profile", full_name: "Aluno de demonstração", email: "demo@example.invalid", role: state.admin ? "admin" : "adult_student", capabilities: state.admin ? ["admin"] : ["student"], status: "active" } as Profile;
}

const eventCards: EventCardData[] = [
  ["championship", "Campeonato de Taekwondo da academia"], ["belt_exam", "Exame de faixa"],
  ["seminar", "Aulão de técnicas para todas as turmas"], ["social", "Confraternização da equipe"], ["other", "Encontro no dojang"],
].map(([event_type, title], index) => ({
  event: { $id: `demo-event-${index}`, event_type, title, status: "registration_open", starts_at: "2027-12-12T12:00:00Z", audience: "students", location_text: "Dojang Ebener", description: "Atividade da academia para compartilhar experiências no tatame.", max_companions: 0 } as EventCardData["event"],
  seatsTaken: 8, people: [], peopleTotal: 8, waitlisted: 0, pendingApproval: 0, examParticipants: 4,
}));

async function resolveServerChildren(node: ReactNode): Promise<ReactNode> {
  if (Array.isArray(node)) return Promise.all(node.map(resolveServerChildren));
  if (!isValidElement<{ children?: ReactNode }>(node)) return node;
  if (typeof node.type === "function" && node.type.constructor.name === "AsyncFunction") {
    const component = node.type as (props: unknown) => Promise<ReactNode>;
    return resolveServerChildren(await component(node.props));
  }
  if (node.props.children === undefined) return node;
  return cloneElement(node, undefined, await resolveServerChildren(node.props.children));
}

it("renders complete protected illustration pages with synthetic data and zero network calls", async () => {
  const network = vi.fn(() => { throw new Error("Offline illustration validation forbids network access"); });
  vi.stubGlobal("fetch", network);
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const { pathToFileURL } = await import("node:url");
  let css = "";
  if (process.env.ILLUSTRATION_PREVIEW === "1") {
    const { default: postcss } = await import("postcss");
    const { default: tailwind } = await import("@tailwindcss/postcss");
    const cssPath = path.resolve("src/app/globals.css");
    css = (await postcss([tailwind()]).process(await fs.readFile(cssPath, "utf8"), { from: cssPath })).css;
    const font = pathToFileURL(path.resolve("src/app/fonts/Poppins-Regular.ttf")).href;
    css += `@font-face{font-family:PreviewPoppins;src:url('${font}')}body{--font-body:PreviewPoppins, sans-serif}`;
    await fs.mkdir("reports/illustrations/pages", { recursive: true });
  }
  const cases = [
    { name: "aluno-eventos", route: "/aluno/eventos", page: () => StudentEventsPage({ searchParams: Promise.resolve({}) }) },
    { name: "admin-eventos", route: "/admin/eventos", page: () => AdminEventsPage({ searchParams: Promise.resolve({}) }) },
    { name: "aluno-exames", route: "/aluno/exames", page: () => StudentExamsPage() },
    { name: "aluno-conquistas", route: "/aluno/conquistas", page: () => StudentAchievementsPage() },
  ];
  for (const item of cases) {
    for (const empty of [false, true]) {
      state.path = item.route;
      state.admin = item.route.startsWith("/admin");
      state.empty = empty;
      const content = await resolveServerChildren(await item.page());
      const frame = await PortalFrame({ profile: profile(), children: content });
      const markup = renderToStaticMarkup(<TooltipProvider>{frame}</TooltipProvider>);
      expect(markup).toContain("/illustrations/");
      expect(markup).toContain('data-slot="dashboard-content"');
      expect(network).not.toHaveBeenCalled();
      if (css) {
        const publicPath = pathToFileURL(path.resolve("public")).href;
        const local = markup.replace(/(?:src|srcset)="(?:https?:\/\/localhost:3000)?\/(?!\/)([^"\s]+)"/g, (all, url) => all.replace(/"[^\"]+"/, `"${publicPath}/${url}"`));
        await fs.writeFile(`reports/illustrations/pages/${item.name}${empty ? "-empty" : ""}.html`, `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Prévia local — ${item.name}</title><style>${css}</style><body>${local}</body></html>`);
      }
    }
  }
  vi.unstubAllGlobals();
}, 60000);
