import Link from "next/link";
import {
  PlusIcon,
  ArrowRightIcon,
  ReaderIcon,
  FileTextIcon,
  BookmarkIcon,
  GearIcon,
} from "@radix-ui/react-icons";
import { prisma } from "@/lib/prisma";
import { publicSettings } from "@/lib/settings";
import { formatDate } from "@/lib/utils";
export default async function Dashboard() {
  const [published, drafts, topics, recent, settings] = await Promise.all([
    prisma.post.count({ where: { status: "PUBLISHED" } }),
    prisma.post.count({ where: { status: "DRAFT" } }),
    prisma.topic.count({ where: { isActive: true } }),
    prisma.post.findMany({ orderBy: { updatedAt: "desc" }, take: 5 }),
    publicSettings(),
  ]);
  return (
    <>
      <header className="admin-page-header">
        <div>
          <span className="workspace-label">KHÔNG GIAN LÀM VIỆC</span>
          <h1>Chào ngày mới, biên tập viên.</h1>
          <p>Một hướng dẫn hữu ích có thể thay đổi cả một ngày làm việc.</p>
        </div>
        <Link href="/admin/posts/create" className="button button-primary">
          <PlusIcon /> Tạo bài với AI
        </Link>
      </header>
      <div className="stats-grid">
        {[
          { label: "Đã xuất bản", value: published, icon: ReaderIcon },
          { label: "Bản nháp đang chờ", value: drafts, icon: FileTextIcon },
          { label: "Chủ đề đang bật", value: topics, icon: BookmarkIcon },
        ].map(({ label, value, icon: Icon }) => (
          <div className="stat" key={label}>
            <Icon />
            <strong>{value.toString().padStart(2, "0")}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      {!settings.groqConfigured && (
        <div className="setup-banner">
          <GearIcon />
          <div>
            <strong>Hoàn tất kết nối AI của bạn</strong>
            <p>
              Thêm API key Groq để tạo bài và trò chuyện.
            </p>
          </div>
          <Link
            href="/admin/settings"
            className="button button-outline button-sm"
          >
            Mở cài đặt <ArrowRightIcon />
          </Link>
        </div>
      )}
      <section className="admin-panel">
        <div className="panel-heading">
          <h2>Đang trên bàn biên tập</h2>
          <Link href="/admin/posts" className="text-link">
            Tất cả bài viết <ArrowRightIcon />
          </Link>
        </div>
        {recent.length ? (
          <div className="admin-post-list">
            {recent.map((p) => (
              <Link
                href={`/admin/posts/${p.id}`}
                key={p.id}
                className="admin-post-row"
              >
                <span
                  className={`status-badge ${p.status === "PUBLISHED" ? "published" : ""}`}
                >
                  {p.status === "PUBLISHED" ? "Đã xuất bản" : "Bản nháp"}
                </span>
                <div>
                  <strong>{p.title}</strong>
                  <span>
                    {p.category} · {formatDate(p.updatedAt)}
                  </span>
                </div>
                <ArrowRightIcon />
              </Link>
            ))}
          </div>
        ) : (
          <div className="admin-empty">
            <FileTextIcon />
            <h3>Câu chuyện đầu tiên đang chờ bạn.</h3>
            <p>
              Thêm chủ đề, để AI hỗ trợ viết nháp, rồi biên tập theo cách của
              bạn.
            </p>
            <Link className="button button-outline" href="/admin/posts/create">
              Tạo bản nháp đầu tiên <ArrowRightIcon />
            </Link>
          </div>
        )}
      </section>
      <div className="editorial-tip">
        <span>QUY TRÌNH BIÊN TẬP</span>
        <p>
          Chọn chủ đề <ArrowRightIcon /> Tạo bản nháp <ArrowRightIcon /> Chỉnh
          sửa <ArrowRightIcon /> Xuất bản
        </p>
        <small>AI hỗ trợ ý tưởng. Bạn giữ quyền quyết định nội dung.</small>
      </div>
    </>
  );
}
