import { downloadContractPdf } from "@/features/contracts/signature-service";
import { getCurrentProfile } from "@/lib/auth/session";

export async function GET(_request: Request, { params }: { params: Promise<{ contractId: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile) return new Response("Não autorizado", { status: 401 });
  try {
    const { contractId } = await params;
    const { buffer, contract } = await downloadContractPdf(profile, contractId);
    return new Response(buffer, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="contrato-${contract.$id}.pdf"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return new Response("Contrato não encontrado", { status: 404 });
  }
}
