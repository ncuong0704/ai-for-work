import { requireAdmin } from "@/lib/auth";
import { assertSameOrigin, errorResponse, readJson } from "@/lib/http";
import { generationInputSchema } from "@/lib/validation";
import { generateDrafts } from "@/lib/ai/generate";
import { getProvider } from "@/lib/settings";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 300;
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    assertSameOrigin(request);
    const input = await readJson(request, generationInputSchema, 32_000);
    await rateLimit(`generate:${admin.id}`, 12, 3600);
    await getProvider("writing");
    const iterator = generateDrafts(input);
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async pull(controller) {
        try {
          const { value, done } = await iterator.next();
          if (done) controller.close();
          else controller.enqueue(encoder.encode(JSON.stringify(value) + "\n"));
        } catch {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                status: "fatal",
                message:
                  "Không thể tiếp tục tạo bài. Các bản nháp đã lưu vẫn được giữ lại.",
              }) + "\n",
            ),
          );
          controller.close();
        }
      },
      async cancel() {
        await iterator.return(undefined);
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
