import { NextRequest, NextResponse } from "next/server";
import { searchEntitiesForProfile } from "@/features/search/search-service";
import { getCurrentProfile } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const query = request.nextUrl.searchParams.get("q") ?? "";
  if (query.trim().length < 2) {
    return NextResponse.json({ items: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  const items = await searchEntitiesForProfile(profile, query);
  return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
}
