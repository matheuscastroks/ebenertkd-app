import { NextResponse } from "next/server";
import {
  listInbox,
  markAllNotificationsRead,
  markNotificationRead
} from "@/features/notifications/notification-service";
import { getCurrentProfile } from "@/lib/auth/session";

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }
  const items = await listInbox(profile);
  return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }
  const body = (await request.json().catch(() => ({}))) as {
    recipient_id?: string;
    all?: boolean;
  };
  if (body.all) {
    await markAllNotificationsRead(profile);
    return NextResponse.json({ success: true });
  }
  if (body.recipient_id) {
    await markNotificationRead(profile, body.recipient_id);
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: "bad_request" }, { status: 400 });
}
