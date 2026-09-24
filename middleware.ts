import { type NextRequest, NextResponse } from "next/server";
import { APPWRITE_SESSION_COOKIE } from "@/lib/appwrite/ids";

const protectedPrefixes = ["/admin", "/aluno", "/responsavel", "/menor"];

export function middleware(request: NextRequest) {
  const protectedRoute = protectedPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix));
  if (protectedRoute && !request.cookies.has(APPWRITE_SESSION_COOKIE)) {
    const url = new URL("/", request.url);
    url.searchParams.set("error", "unauthorized");
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/aluno/:path*", "/responsavel/:path*", "/menor/:path*"]
};
