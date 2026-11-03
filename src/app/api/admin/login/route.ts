import { timingSafeEqual } from "node:crypto";
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

// Host chỉ chạy migrate, không chạy seed: tạo admin đầu tiên từ ADMIN_EMAIL/ADMIN_PASSWORD khi DB chưa có admin nào.
async function bootstrapAdmin(email: string, password: string) {
  const envEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const envPassword = process.env.ADMIN_PASSWORD;
  if (!envEmail || !envPassword || envPassword.length < 12) return null;
  const a = Buffer.from(password);
  const b = Buffer.from(envPassword);
  if (email !== envEmail || a.length !== b.length || !timingSafeEqual(a, b))
    return null;
  if (await prisma.admin.count()) return null;
  return prisma.admin.create({
    data: { id: "admin", email, passwordHash: await hashPassword(password) },
  });
}
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
    const email = input.email.toLowerCase().trim();
    const admin =
      (await prisma.admin.findUnique({ where: { email } })) ??
      (await bootstrapAdmin(email, input.password));
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
