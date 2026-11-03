import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCategories } from "@/lib/settings";
import { documentSchema } from "@/lib/validation";
import { PostEditor } from "@/components/editor/post-editor";
export default async function EditPost({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [post, categories] = await Promise.all([
    prisma.post.findUnique({ where: { id: (await params).id } }),
    getCategories(),
  ]);
  if (!post) notFound();
  const content = documentSchema.safeParse(post.contentJson);
  return (
    <PostEditor
      post={{
        id: post.id,
        title: post.title,
        summary: post.summary,
        category: post.category,
        tags: post.tags,
        coverImage: post.coverImage,
        contentJson: content.success
          ? content.data
          : [{ type: "paragraph", content: [] }],
        status: post.status,
        updatedAt: post.updatedAt.toISOString(),
        slug: post.slug,
      }}
      categories={categories}
    />
  );
}
