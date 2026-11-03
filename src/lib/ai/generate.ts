import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import type { z } from "zod";
import type { generationInputSchema } from "../validation";
import { prisma } from "../prisma";
import { getProvider, getCategories } from "../settings";
import { markdownToBlocks } from "../content";
import { slugify } from "../utils";
import { generateArticle } from "./groq";

export interface GenerationResult {
  index: number;
  total: number;
  topic: string;
  status: "created" | "rejected" | "error";
  postId?: string;
  message: string;
}

export async function* generateDrafts(
  input: z.infer<typeof generationInputSchema>,
): AsyncGenerator<GenerationResult> {
  const provider = await getProvider("writing");
  const categories = await getCategories();
  for (let index = 0; index < input.topics.length; index++) {
    const topic = input.topics[index];
    const base = { index: index + 1, total: input.topics.length, topic };
    const generationKey = `${input.requestId}:${index}`;
    try {
      const existing = await prisma.post.findUnique({
        where: { generationKey },
        select: { id: true },
      });
      if (existing) {
        yield {
          ...base,
          status: "created",
          postId: existing.id,
          message: "Bản nháp đã được tạo trước đó.",
        };
        continue;
      }
      const article = await generateArticle(provider, topic, input, categories);
      if (article.category === "NEEDS_NEW_CATEGORY") {
        yield {
          ...base,
          status: "rejected",
          message: `Chủ đề chưa phù hợp với danh mục hiện có. ${article.category_reason || "Cần một chuyên mục mới."} Thêm chuyên mục trong Quản lý chuyên mục rồi tạo lại.`,
        };
        continue;
      }
      const post = await prisma.post.create({
        data: {
          title: article.title,
          slug: `${slugify(article.title)}-${randomUUID().slice(0, 8)}`,
          summary: article.summary,
          category: article.category,
          tags: article.tags,
          status: "DRAFT",
          generationKey,
          contentMd: article.content_markdown,
          contentJson: markdownToBlocks(
            article.content_markdown,
          ) as unknown as Prisma.InputJsonValue,
          sourceUrls: article.source_urls,
        },
      });
      await prisma.topic.updateMany({
        where: { title: topic },
        data: { lastUsedAt: new Date() },
      });
      yield {
        ...base,
        status: "created",
        postId: post.id,
        message: "Đã tạo bản nháp. Sẵn sàng biên tập.",
      };
    } catch (error) {
      const duplicate = await prisma.post.findUnique({
        where: { generationKey },
        select: { id: true },
      });
      if (duplicate)
        yield {
          ...base,
          status: "created",
          postId: duplicate.id,
          message: "Bản nháp đã được lưu.",
        };
      else
        yield {
          ...base,
          status: "error",
          message:
            error instanceof Error && "status" in error
              ? error.message
              : "Không tạo được bản nháp cho chủ đề này. Vui lòng thử lại.",
        };
    }
  }
}
