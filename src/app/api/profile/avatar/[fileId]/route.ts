import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { getCurrentProfile } from "@/lib/auth/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const profile = await getCurrentProfile();
  if (!profile) return new Response("Não autorizado", { status: 401 });

  try {
    const { fileId } = await params;
    const { storage } = createAppwriteAdminClient();
    const buffer = await storage.getFileDownload({
      bucketId: APPWRITE_IDS.bucket,
      fileId,
    });

    return new Response(buffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new Response("Imagem não encontrada", { status: 404 });
  }
}
