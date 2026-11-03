import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createToken, verifyToken } from "@/lib/tokens";
import {
  assertSameOrigin,
  cookieOptions,
  errorResponse,
  HttpError,
  readJson,
} from "@/lib/http";
import { chatInputSchema } from "@/lib/validation";
import { rateLimit, requestIp } from "@/lib/rate-limit";
import { chat } from "@/lib/chat";

export const maxDuration = 90;
async function ownedSession() {
  const payload = await verifyToken(
    (await cookies()).get("afw_chat")?.value,
    "chat",
  );
  if (!payload) return null;
  return prisma.chatSession.findUnique({ where: { id: payload.sub } });
}
export async function GET() {
  try {
    const session = await ownedSession();
    if (!session) return NextResponse.json({ sessionId: null, messages: [] });
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: "asc" },
      take: 16,
      select: { id: true, role: true, content: true },
    });
    return NextResponse.json(
      { sessionId: session.id, messages },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await rateLimit(`chat-ip:${requestIp(request)}`, 40, 600);
    const input = await readJson(request, chatInputSchema, 12_000);
    let session = await ownedSession();
    if (session && input.sessionId && input.sessionId !== session.id)
      throw new HttpError(
        403,
        "Hội thoại không thuộc phiên hiện tại. Hãy tải lại trang.",
      );
    if (!session) {
      if (input.sessionId)
        throw new HttpError(
          410,
          "Phiên chat đã hết hạn. Xóa hội thoại rồi thử lại.",
        );
      await prisma.chatSession.deleteMany({
        where: { updatedAt: { lt: new Date(Date.now() - 30 * 86400_000) } },
      });
      await prisma.rateLimit.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      session = await prisma.chatSession.create({ data: {} });
    }
    await rateLimit(`chat-session:${session.id}`, 12, 600);
    // Issue the capability before the provider call so retrying after an error reuses the session.
    (await cookies()).set(
      "afw_chat",
      await createToken(session.id, "chat", "30d"),
      { ...cookieOptions, maxAge: 30 * 86400 },
    );
    return NextResponse.json({
      sessionId: session.id,
      message: await chat(session.id, input.message),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await ownedSession();
    if (session?.busyUntil && session.busyUntil > new Date())
      throw new HttpError(
        409,
        "Đợi trợ lý trả lời xong trước khi xóa hội thoại.",
      );
    if (session) {
      const deleted = await prisma.chatSession.deleteMany({
        where: {
          id: session.id,
          OR: [{ busyUntil: null }, { busyUntil: { lte: new Date() } }],
        },
      });
      if (!deleted.count)
        throw new HttpError(
          409,
          "Đợi trợ lý trả lời xong trước khi xóa hội thoại.",
        );
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.set("afw_chat", "", { ...cookieOptions, maxAge: 0 });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
