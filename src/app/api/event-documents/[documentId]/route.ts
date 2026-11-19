import { downloadRegistrationDocument } from "@/features/events/registration-documents-service";
import { getCurrentProfile } from "@/lib/auth/session";

export async function GET(_request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile) return new Response("Não autorizado", { status: 401 });
  try {
    const { documentId } = await params;
    const { buffer, document } = await downloadRegistrationDocument(profile, documentId);
    const filename = (document.original_name ?? "documento").replace(/["\r\n]/g, "_");
    return new Response(buffer, { headers: { "Content-Type": document.mime_type ?? "application/octet-stream", "Content-Disposition": `inline; filename="${filename}"`, "Cache-Control": "private, no-store" } });
  } catch {
    return new Response("Documento não encontrado", { status: 404 });
  }
}
