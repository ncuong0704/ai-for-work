import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  assertSameOrigin,
  cookieOptions,
  errorResponse,
  HttpError,
  readJson,
} from "@/lib/http";
import { checkPassword, hashPassword } from "@/lib/crypto";
import { createToken } from "@/lib/tokens";
import { rateLimit, requestIp } from "@/lib/rate-limit";

let dummyHash: Promise<string> | undefined;
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await rateLimit(`login:${requestIp(request)}`, 8, 900);
    const input = await readJson(
      request,
      z.object({
        email: z.string().email().max(254),
        password: z.string().min(1).max(256),
      }),
      4096,
    );
    const admin = await prisma.admin.findUnique({
      where: { email: input.email.toLowerCase().trim() },
    });
    const hash =
      admin?.passwordHash ||
      (await (dummyHash ??= hashPassword("dummy-password-for-timing")));
    const valid = await checkPassword(input.password, hash);
    if (!admin || !valid)
      throw new HttpError(401, "Email hoặc mật khẩu không đúng.");
    const response = NextResponse.json({ ok: true });
    response.cookies.set("afw_admin", await createToken(admin.id, "admin"), {
      ...cookieOptions,
      maxAge: 43200,
    });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
