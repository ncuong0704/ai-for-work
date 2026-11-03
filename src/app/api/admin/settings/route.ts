import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { assertSameOrigin, errorResponse, readJson } from "@/lib/http";
import { publicSettings, saveSettings } from "@/lib/settings";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(await publicSettings());
  } catch (error) {
    return errorResponse(error);
  }
}
export async function PUT(request: Request) {
  try {
    await requireAdmin();
    assertSameOrigin(request);
    const input = await readJson(
      request,
      z.object({
        groqKey: z.string().max(500).default(""),
        groqWritingModel: z
          .string()
          .trim()
          .regex(/^[a-zA-Z0-9/._-]+$/)
          .max(100),
        groqChatModel: z
          .string()
          .trim()
          .regex(/^[a-zA-Z0-9/._-]+$/)
          .max(100),
      }),
      4096,
    );
    await saveSettings(input);
    return NextResponse.json(await publicSettings());
  } catch (error) {
    return errorResponse(error);
  }
}
