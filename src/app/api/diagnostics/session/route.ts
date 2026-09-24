import { NextResponse } from "next/server";
import { createAppwriteSessionClient } from "@/lib/appwrite/session";

export async function GET() {
  try {
    const services = await createAppwriteSessionClient();

    if (!services) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const account = await services.account.get();

    return NextResponse.json({
      authenticated: true,
      accountId: account.$id,
      emailVerified: account.emailVerification
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

