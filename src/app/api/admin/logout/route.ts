import { NextResponse } from "next/server";
import { assertSameOrigin, cookieOptions, errorResponse } from "@/lib/http";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const response = NextResponse.json({ ok: true });
    response.cookies.set("afw_admin", "", { ...cookieOptions, maxAge: 0 });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
