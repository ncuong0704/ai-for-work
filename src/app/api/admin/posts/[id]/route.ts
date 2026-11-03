import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { assertSameOrigin, errorResponse, readJson } from "@/lib/http";
import { postInputSchema } from "@/lib/validation";
import { savePost } from "@/lib/posts";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };
export async function PUT(request: Request, { params }: Context) {
  try {
    await requireAdmin();
    assertSameOrigin(request);
    return NextResponse.json(
      await savePost(
        await readJson(request, postInputSchema),
        (await params).id,
      ),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export async function DELETE(request: Request, { params }: Context) {
  try {
    await requireAdmin();
    assertSameOrigin(request);
    await prisma.post.delete({ where: { id: (await params).id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
