import { prisma } from "@/lib/prisma";
import { publicSettings } from "@/lib/settings";
import { GenerationForm } from "@/components/admin/generation-form";
export default async function CreatePosts() {
  const [activeTopics, settings] = await Promise.all([
    prisma.topic.findMany({
      where: { isActive: true },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
    }),
    publicSettings(),
  ]);
  return (
    <>
      <header className="admin-page-header">
        <div>
          <h1>Từ chủ đề đến bản nháp.</h1>
          <p>
            Bạn mang ý tưởng. AI giúp bạn bắt đầu. Nội dung hay nằm ở bước biên
            tập.
          </p>
        </div>
      </header>
      <GenerationForm
        activeTopics={activeTopics}
        configured={settings.groqConfigured}
      />
    </>
  );
}
