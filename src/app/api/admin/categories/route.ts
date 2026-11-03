import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import {
  assertSameOrigin,
  errorResponse,
  HttpError,
  readJson,
} from "@/lib/http";
import { getCategories } from "@/lib/settings";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    assertSameOrigin(request);
    const { name } = await readJson(
      request,
      z.object({ name: z.string().trim().min(2).max(100) }),
      4096,
    );
    if (name === "NEEDS_NEW_CATEGORY")
      throw new HttpError(400, "Tên chuyên mục dành riêng cho hệ thống.");
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(74123)`;
      const row = await tx.setting.findUnique({ where: { key: "categories" } });
      const categories: string[] = row
        ? JSON.parse(row.value)
        : await getCategories();
      if (categories.some((c) => c.toLowerCase() === name.toLowerCase()))
        throw new HttpError(409, "Chuyên mục đã tồn tại.");
      if (categories.length >= 50)
        throw new HttpError(400, "Tối đa 50 chuyên mục.");
      const value = JSON.stringify([...categories, name]);
      await tx.setting.upsert({
        where: { key: "categories" },
        update: { value },
        create: { key: "categories", value },
      });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
