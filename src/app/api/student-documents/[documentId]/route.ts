import { downloadStudentDocument } from "@/features/students/document-service";
import { getCurrentProfile } from "@/lib/auth/session";

export async function GET(_request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile) return new Response("Não autorizado", { status: 401 });
  try {
    const { documentId } = await params;
    const { buffer, document } = await downloadStudentDocument(profile, documentId);
    const filename = document.original_name.replace(/["\r\n]/g, "_");
    return new Response(buffer, { headers: { "Content-Type": document.mime_type, "Content-Disposition": `inline; filename="${filename}"`, "Cache-Control": "private, no-store" } });
  } catch {
    return new Response("Documento não encontrado", { status: 404 });
  }
}
