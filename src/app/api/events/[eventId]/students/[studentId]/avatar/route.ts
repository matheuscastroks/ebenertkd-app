import { Query } from "node-appwrite";
import { getCurrentProfile } from "@/lib/auth/session";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import type { Event, EventRegistration } from "@/features/events/types";
import type { StudentDocument } from "@/features/students/types";
import { holdsSeat, isEventTerminal } from "@/features/events/rules/status-rules";

/** Apenas a foto de um aluno inscrito em um evento visível para membros do portal. */
export async function GET(_request: Request, { params }: {
  params: Promise<{ eventId: string; studentId: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) return new Response("Não autorizado", { status: 401 });
  if (!profile.capabilities.some((capability) => ["admin", "student", "guardian"].includes(capability))) {
    return new Response("Não autorizado", { status: 403 });
  }
  try {
    const { eventId, studentId } = await params;
    const { tables, storage, config } = createAppwriteAdminClient();
    const event = await tables.getRow<Event>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.events, rowId: eventId });
    if (event.status === "draft" || isEventTerminal(event.status) || Date.parse(event.starts_at) < Date.now() || event.event_type === "belt_exam") {
      return new Response("Imagem não encontrada", { status: 404 });
    }
    const registrations = await tables.listRows<EventRegistration>({
      databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.eventRegistrations,
      queries: [Query.equal("event_id", [eventId]), Query.equal("student_id", [studentId]), Query.limit(100)]
    });
    if (!registrations.rows.some((registration) => holdsSeat(registration.status))) {
      return new Response("Imagem não encontrada", { status: 404 });
    }
    const photos = await tables.listRows<StudentDocument>({
      databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.studentDocuments,
      queries: [Query.equal("student_id", [studentId]), Query.equal("document_type", ["profile_photo"]), Query.limit(100)]
    });
    const photo = photos.rows.find((document) => document.document_type === "profile_photo" && document.status !== "rejected" && ["image/jpeg", "image/png", "image/webp"].includes(document.mime_type));
    if (!photo) return new Response("Imagem não encontrada", { status: 404 });
    const buffer = await storage.getFileDownload({ bucketId: APPWRITE_IDS.bucket, fileId: photo.file_id });
    return new Response(buffer, { headers: {
      "Content-Type": photo.mime_type,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store"
    } });
  } catch {
    return new Response("Imagem não encontrada", { status: 404 });
  }
}
