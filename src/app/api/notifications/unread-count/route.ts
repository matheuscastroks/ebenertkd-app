import { NextResponse } from "next/server";
import { countUnreadNotifications } from "@/features/notifications/notification-service";
import { getCurrentProfile } from "@/lib/auth/session";

export async function GET() {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    const count = await countUnreadNotifications(profile);
    return NextResponse.json({ count }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ count: 0 }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
}
