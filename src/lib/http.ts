import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { Prisma } from "@prisma/client";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function readJson<T>(
  request: Request,
  schema: ZodType<T>,
  maxBytes = 1_000_000,
): Promise<T> {
  if (Number(request.headers.get("content-length")) > maxBytes)
    throw new HttpError(413, "Nội dung quá lớn.");
  if (!request.body) throw new HttpError(400, "Thiếu dữ liệu.");
  const reader = request.body.getReader();
  const parts: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > maxBytes) {
      await reader.cancel();
      throw new HttpError(413, "Nội dung quá lớn.");
    }
    parts.push(value);
  }
  try {
    return schema.parse(JSON.parse(Buffer.concat(parts).toString("utf8")));
  } catch (error) {
    if (error instanceof ZodError) throw error;
    throw new HttpError(400, "JSON không hợp lệ.");
  }
}

// So sánh theo host: proxy HTTPS chuyển tiếp bằng HTTP nên scheme của request.url không khớp Origin.
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin")?.split("//")[1];
  const forwarded = request.headers.get("x-forwarded-host")?.split(",")[0];
  const allowed = [
    forwarded?.trim(),
    request.headers.get("host"),
    new URL(request.url).host,
    process.env.NEXT_PUBLIC_APP_URL &&
      new URL(process.env.NEXT_PUBLIC_APP_URL).host,
  ];
  if (!origin || !allowed.includes(origin))
    throw new HttpError(403, "Yêu cầu không cùng nguồn.");
}

export function errorResponse(error: unknown) {
  if (error instanceof HttpError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: error.issues[0]?.message || "Dữ liệu không hợp lệ." },
      { status: 400 },
    );
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025")
      return NextResponse.json(
        { error: "Không tìm thấy dữ liệu." },
        { status: 404 },
      );
    if (error.code === "P2002")
      return NextResponse.json(
        { error: "Dữ liệu trùng lặp. Vui lòng tải lại." },
        { status: 409 },
      );
  }
  console.error(
    "Request failed:",
    error instanceof Error ? error.name : "UnknownError",
  );
  return NextResponse.json(
    {
      error:
        "Chưa thể xử lý yêu cầu. Kiểm tra kết nối cơ sở dữ liệu hoặc thử lại sau.",
    },
    { status: 500 },
  );
}

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
