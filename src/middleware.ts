import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "./lib/tokens";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin/login") return NextResponse.next();
  const payload = await verifyToken(
    request.cookies.get("afw_admin")?.value,
    "admin",
  );
  if (!payload)
    return NextResponse.redirect(new URL("/admin/login", request.url));
  return NextResponse.next();
}
export const config = { matcher: ["/admin/:path*"] };
