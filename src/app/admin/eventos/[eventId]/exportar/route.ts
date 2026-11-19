import { writeAuditEvent } from "@/features/auth/service";
import { championshipCsv, getChampionshipBundle } from "@/features/events/championship-queries";
import { getCurrentProfile } from "@/lib/auth/session";

/** CSV da equipe para a federação. Só a professora baixa; a auditoria registra a exportação (sem dados pessoais). */
export async function GET(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") return new Response("Não autorizado", { status: 403 });
  const { eventId } = await params;
  try {
    const bundle = await getChampionshipBundle(eventId);
    if (bundle.event.event_type !== "championship") return new Response("Evento não encontrado", { status: 404 });
    const includeInterested = new URL(request.url).searchParams.get("interessados") === "1";
    const csv = championshipCsv(bundle, includeInterested);
    await writeAuditEvent("event.federation_export", profile.account_id, "event", eventId, { included_interested: includeInterested });
    const slug = bundle.event.title.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "campeonato";
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="equipe-${slug}.csv"`, "Cache-Control": "private, no-store" } });
  } catch {
    return new Response("Evento não encontrado", { status: 404 });
  }
}
