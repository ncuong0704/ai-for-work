import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { prisma } from "./prisma";
import { chunkText } from "./chunking";
import { blocksToMarkdown } from "./content";
import { getCategories } from "./settings";
import { HttpError } from "./http";
import { slugify } from "./utils";
import type { postInputSchema } from "./validation";
import type { z } from "zod";

export async function savePost(
  input: z.infer<typeof postInputSchema>,
  id?: string,
) {
  if (!(await getCategories()).includes(input.category))
    throw new HttpError(400, "Chuyên mục không nằm trong danh sách được phép.");
  const contentMd = blocksToMarkdown(input.contentJson);
  if (input.status === "PUBLISHED" && !contentMd.trim())
    throw new HttpError(400, "Thêm nội dung trước khi xuất bản.");
  const chunks = input.status === "PUBLISHED" ? chunkText(contentMd) : [];
  return prisma.$transaction(
    async (tx) => {
      if (id)
        await tx.$queryRaw`SELECT "id" FROM "Post" WHERE "id" = ${id} FOR UPDATE`;
      const existing = id ? await tx.post.findUnique({ where: { id } }) : null;
      if (id && !existing) throw new HttpError(404, "Không tìm thấy bài viết.");
      if (existing && input.updatedAt !== existing.updatedAt.toISOString())
        throw new HttpError(
          409,
          "Bài đã được sửa ở một cửa sổ khác. Tải lại trước khi lưu.",
        );
      const data = {
        title: input.title,
        summary: input.summary,
        category: input.category,
        tags: input.tags,
        coverImage: input.coverImage || null,
        contentJson: input.contentJson as unknown as Prisma.InputJsonValue,
        contentMd,
        status: input.status,
        publishedAt:
          input.status === "PUBLISHED"
            ? (existing?.publishedAt ?? new Date())
            : null,
      };
      const post = existing
        ? await tx.post.update({ where: { id }, data })
        : await tx.post.create({
            data: {
              ...data,
              slug: `${slugify(input.title)}-${randomUUID().slice(0, 8)}`,
            },
          });
      await tx.postChunk.deleteMany({ where: { postId: post.id } });
      if (chunks.length)
        await tx.postChunk.createMany({
          data: chunks.map((content, chunkIndex) => ({
            postId: post.id,
            content,
            chunkIndex,
          })),
        });
      return post;
    },
    { timeout: 15_000 },
  );
}

export async function listPublished(
  options: {
    category?: string;
    query?: string;
    page?: number;
    limit?: number;
  } = {},
) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(30, options.limit || 9);
  const where: Prisma.PostWhereInput = {
    status: "PUBLISHED",
    ...(options.category ? { category: options.category } : {}),
    ...(options.query
      ? {
          OR: [
            { title: { contains: options.query, mode: "insensitive" } },
            { summary: { contains: options.query, mode: "insensitive" } },
            { tags: { has: options.query } },
          ],
        }
      : {}),
  };
  const [posts, count] = await prisma.$transaction([
    prisma.post.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.post.count({ where }),
  ]);
  return { posts, count, pages: Math.ceil(count / limit) };
}
