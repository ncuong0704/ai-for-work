import type { Metadata } from "next";
import Link from "next/link";
import {
  MagnifyingGlassIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from "@radix-ui/react-icons";
import { listPublished } from "@/lib/posts";
import { getCategories } from "@/lib/settings";
import { PostCard } from "@/components/blog/post-card";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Thư viện hướng dẫn",
  description:
    "Khám phá hướng dẫn ứng dụng AI theo từng công việc: viết lách, phân tích dữ liệu, họp hành và quản lý.",
  alternates: { canonical: "/posts" },
};
export default async function Posts({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.min(10000, Math.max(1, Number(params.page) || 1));
  const query = params.q?.slice(0, 200) || "";
  const category = params.category?.slice(0, 100) || "";
  const [{ posts, count, pages }, categories] = await Promise.all([
    listPublished({ category, query, page }),
    getCategories(),
  ]);
  function url(p: number) {
    return `/posts?${new URLSearchParams({ ...(category ? { category } : {}), ...(query ? { q: query } : {}), page: String(p) })}`;
  }
  return (
    <div className="container library">
      <div className="library-heading">
        <div>
          <Link href="/" className="back-link">
            <ArrowLeftIcon /> Trang chủ
          </Link>
          <h1>
            Thư viện <span>thực chiến.</span>
          </h1>
          <p>Một chút kiến thức mới. Rất nhiều thời gian tiết kiệm.</p>
        </div>
        <form className="search-form" action="/posts">
          <MagnifyingGlassIcon />
          <label className="sr-only" htmlFor="search">
            Tìm bài viết
          </label>
          <input
            id="search"
            name="q"
            defaultValue={query}
            placeholder="Tìm một hướng dẫn..."
          />
          {category && <input type="hidden" name="category" value={category} />}
          <button
            type="submit"
            className="button button-ghost button-icon"
            aria-label="Tìm"
          >
            <ArrowRightIcon />
          </button>
        </form>
      </div>
      <nav
        className="category-filters"
        id="categories"
        aria-label="Lọc chuyên mục"
      >
        <Link
          className={!category ? "active" : ""}
          href={query ? `/posts?q=${encodeURIComponent(query)}` : "/posts"}
        >
          Tất cả
        </Link>
        {categories.map((c) => (
          <Link
            className={category === c ? "active" : ""}
            href={`/posts?${new URLSearchParams({ category: c, ...(query ? { q: query } : {}) })}`}
            key={c}
          >
            {c}
          </Link>
        ))}
      </nav>
      <div className="results-label">
        {count} bài viết {query && <>cho “{query}”</>}
      </div>
      {posts.length ? (
        <div className="posts-grid">
          {posts.map((post) => (
            <PostCard post={post} key={post.id} />
          ))}
        </div>
      ) : (
        <div className="empty-editorial">
          <MagnifyingGlassIcon />
          <h2>
            {query || category
              ? "Chưa tìm thấy bài phù hợp."
              : "Thư viện đang chờ những bài viết đầu tiên."}
          </h2>
          <p>Thử từ khóa khác hoặc quay lại xem tất cả chuyên mục.</p>
          <Link href="/posts" className="text-link">
            Xem tất cả bài viết <ArrowRightIcon />
          </Link>
        </div>
      )}
      {pages > 1 && (
        <nav className="pagination" aria-label="Phân trang">
          {page > 1 ? (
            <Link className="button button-outline" href={url(page - 1)}>
              <ArrowLeftIcon /> Trước
            </Link>
          ) : (
            <span />
          )}
          <span>
            Trang {page} / {pages}
          </span>
          {page < pages ? (
            <Link className="button button-outline" href={url(page + 1)}>
              Tiếp <ArrowRightIcon />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
