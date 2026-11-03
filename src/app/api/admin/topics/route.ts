import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { assertSameOrigin, errorResponse, readJson } from "@/lib/http";
import { topicInputSchema } from "@/lib/validation";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    assertSameOrigin(request);
    return NextResponse.json(
      await prisma.topic.create({
        data: await readJson(request, topicInputSchema, 4096),
      }),
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
