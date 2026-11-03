import Link from "next/link";
import {
  PlusIcon,
  Pencil1Icon,
  ArrowRightIcon,
  FileTextIcon,
} from "@radix-ui/react-icons";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { formatDate } from "@/lib/utils";
export default async function PostsAdmin({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const status =
    params.status === "PUBLISHED"
      ? "PUBLISHED"
      : params.status === "DRAFT"
        ? "DRAFT"
        : undefined;
  const page = Math.min(10000, Math.max(1, Number(params.page) || 1));
  const where: Prisma.PostWhereInput = status ? { status } : {};
  const [posts, count] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 20,
      skip: (page - 1) * 20,
    }),
    prisma.post.count({ where }),
  ]);
  return (
    <>
      <header className="admin-page-header">
        <div>
          <h1>Kho bài viết của bạn.</h1>
          <p>Chỉnh sửa, hoàn thiện và đưa kiến thức đến người đọc.</p>
        </div>
        <div className="header-actions">
          <Link href="/admin/posts/new" className="button button-outline">
            <Pencil1Icon /> Viết thủ công
          </Link>
          <Link href="/admin/posts/create" className="button button-primary">
            <PlusIcon /> Tạo với AI
          </Link>
        </div>
      </header>
      <nav className="admin-tabs" aria-label="Lọc trạng thái">
        {[
          { label: "Tất cả", value: "" },
          { label: "Bản nháp", value: "DRAFT" },
          { label: "Đã xuất bản", value: "PUBLISHED" },
        ].map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/posts${tab.value ? `?status=${tab.value}` : ""}`}
            className={(status || "") === tab.value ? "active" : ""}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <section className="admin-panel">
        <div className="panel-heading">
          <h2>{count} bài viết</h2>
          <span className="muted">Mới cập nhật trước</span>
        </div>
        {posts.length ? (
          <div className="admin-post-list">
            {posts.map((p) => (
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
            <h3>Chưa có bài viết ở đây.</h3>
            <p>Thêm chủ đề để tạo những bản nháp đầu tiên.</p>
            <Link href="/admin/posts/create" className="button button-outline">
              Tạo bài với AI
            </Link>
          </div>
        )}
      </section>
      {count > 20 && (
        <div className="pagination">
          {page > 1 ? (
            <Link
              className="button button-outline"
              href={`/admin/posts?status=${status || ""}&page=${page - 1}`}
            >
              Trước
            </Link>
          ) : (
            <span />
          )}
          <span>
            Trang {page} / {Math.ceil(count / 20)}
          </span>
          {page * 20 < count ? (
            <Link
              className="button button-outline"
              href={`/admin/posts?status=${status || ""}&page=${page + 1}`}
            >
              Tiếp
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </>
  );
}
