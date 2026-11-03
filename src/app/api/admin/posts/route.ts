import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { assertSameOrigin, errorResponse, readJson } from "@/lib/http";
import { postInputSchema } from "@/lib/validation";
import { savePost } from "@/lib/posts";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    assertSameOrigin(request);
    return NextResponse.json(
      await savePost(await readJson(request, postInputSchema)),
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
