import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { assertSameOrigin, errorResponse, readJson } from "@/lib/http";
import { topicInputSchema } from "@/lib/validation";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };
export async function PUT(request: Request, { params }: Context) {
  try {
    await requireAdmin();
    assertSameOrigin(request);
    return NextResponse.json(
      await prisma.topic.update({
        where: { id: (await params).id },
        data: await readJson(request, topicInputSchema, 4096),
      }),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export async function DELETE(request: Request, { params }: Context) {
  try {
    await requireAdmin();
    assertSameOrigin(request);
    await prisma.topic.delete({ where: { id: (await params).id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
