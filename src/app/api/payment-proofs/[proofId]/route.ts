import { downloadPaymentProof } from "@/features/billing/proof-service";
import { requireProfile } from "@/lib/auth/session";

export async function GET(_: Request, { params }: { params: Promise<{ proofId: string }> }) {
  const actor = await requireProfile();
  const { proofId } = await params;
  const { buffer, proof } = await downloadPaymentProof(actor, proofId);
  return new Response(buffer, { headers: { "Content-Type": proof.mime_type, "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(proof.original_name)}`, "Cache-Control": "private, no-store" } });
}
