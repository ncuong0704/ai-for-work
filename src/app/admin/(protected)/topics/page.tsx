import { prisma } from "@/lib/prisma";
import { getCategories } from "@/lib/settings";
import { TopicsManager } from "@/components/admin/topics-manager";
export default async function Topics() {
  const [topics, categories] = await Promise.all([
    prisma.topic.findMany({ orderBy: { createdAt: "desc" } }),
    getCategories(),
  ]);
  return (
    <>
      <header className="admin-page-header">
        <div>
          <h1>Nuôi dưỡng những ý tưởng.</h1>
          <p>Chủ đề để viết. Chuyên mục để sắp xếp kiến thức.</p>
        </div>
      </header>
      <TopicsManager
        topics={topics.map((t) => ({
          ...t,
          lastUsedAt: t.lastUsedAt?.toISOString() || null,
        }))}
        categories={categories}
      />
    </>
  );
}
