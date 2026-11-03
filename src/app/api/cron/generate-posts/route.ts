import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, HttpError, readJson } from "@/lib/http";
import { generateDrafts } from "@/lib/ai/generate";
import { TONES, LENGTHS } from "@/lib/constants";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 300;
export async function POST(request: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    const actual = Buffer.from(request.headers.get("authorization") || "");
    const expected = Buffer.from(`Bearer ${secret}`);
    if (
      !secret ||
      secret.length < 24 ||
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    )
      throw new HttpError(401, "Không được phép.");
    await rateLimit("cron-generation", 6, 3600);
    const input = await readJson(
      request,
      z.object({
        requestId: z.string().uuid(),
        topicIds: z.array(z.string().max(100)).min(1).max(50).optional(),
      }),
      16_000,
    );
    const topics = await prisma.topic.findMany({
      where: {
        isActive: true,
        ...(input.topicIds ? { id: { in: input.topicIds } } : {}),
      },
      orderBy: { createdAt: "asc" },
      take: 51,
    });
    if (!topics.length) throw new HttpError(400, "Không có chủ đề đang bật.");
    if (topics.length > 50)
      throw new HttpError(400, "Chọn tối đa 50 chủ đề trong mỗi lần gọi.");
    const results = [];
    for await (const result of generateDrafts({
      requestId: input.requestId,
      topics: topics.map((t) => t.title),
      tone: TONES[0],
      length: LENGTHS[1],
      hasImage: false,
    }))
      results.push(result);
    return NextResponse.json({ results });
  } catch (error) {
    return errorResponse(error);
  }
}
