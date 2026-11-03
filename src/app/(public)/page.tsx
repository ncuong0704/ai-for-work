import Link from "next/link";
import {
  ArrowRightIcon,
  ArrowTopRightIcon,
  ChatBubbleIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  MagicWandIcon,
} from "@radix-ui/react-icons";
import { HeroVisual } from "@/components/blog/hero-visual";
import { OpenChat } from "@/components/chat/open-chat";
import { PostCard } from "@/components/blog/post-card";
import { Reveal } from "@/components/blog/motion";
import { listPublished } from "@/lib/posts";
import { getCategories } from "@/lib/settings";

export const dynamic = "force-dynamic";
export default async function Home() {
  const [{ posts, count }, categories] = await Promise.all([
    listPublished({ limit: 5 }),
    getCategories(),
  ]);
  return (
    <>
      <section className="hero container">
        <div className="hero-copy">
          <div className="eyebrow">
            <MagicWandIcon className="tiny-symbol" /> AI THỰC TẾ. CÔNG VIỆC MỖI
            NGÀY.
          </div>
          <h1>
            Từ ý tưởng
            <br />
            đến <span>thao tác.</span>
          </h1>
          <p>
            Bớt việc lặp lại. Thêm thời gian sáng tạo.
            <br />
            Khám phá cách AI giúp bạn làm việc thông minh hơn.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/posts">
              Khám phá bài viết <ArrowRightIcon />
            </Link>
            <OpenChat className="button button-outline">
              Hỏi AI ngay <ChatBubbleIcon />
            </OpenChat>
          </div>
        </div>
        <HeroVisual />
      </section>
      <div className="hero-rule container">
        <span>Kiến thức thực chiến, viết cho người đi làm.</span>
        <span>Đọc. Áp dụng. Tiến xa.</span>
      </div>
      <Reveal className="container category-section">
        <div className="section-heading">
          <h2>Bạn muốn làm tốt việc gì?</h2>
          <p>Chọn công việc của bạn. Bắt đầu từ một hướng dẫn nhỏ.</p>
        </div>
        <div className="category-grid">
          {categories.slice(0, 8).map((category, i) => (
            <Link
              href={`/posts?category=${encodeURIComponent(category)}`}
              className="category-link"
              key={category}
            >
              <span className="category-index">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>{category}</span>
              <ArrowTopRightIcon />
            </Link>
          ))}
        </div>
      </Reveal>
      <Reveal className="container articles-section">
        <div className="section-title-row">
          <div className="section-heading">
            <h2>
              Một ý tưởng mới.
              <br />
              <span>Một ngày hiệu quả hơn.</span>
            </h2>
          </div>
          <Link href="/posts" className="text-link">
            Tất cả bài viết <ArrowRightIcon />
          </Link>
        </div>
        {posts.length ? (
          <div className="home-posts">
            {posts.map((post, i) => (
              <PostCard key={post.id} post={post} featured={i === 0} />
            ))}
          </div>
        ) : (
          <div className="empty-editorial">
            <div className="empty-icon">
              <PlusIcon />
            </div>
            <h3>Kiến thức hay đang được chuẩn bị.</h3>
            <p>
              Những hướng dẫn đầu tiên sẽ xuất hiện tại đây ngay khi được xuất
              bản.
            </p>
            <Link href="/admin" className="text-link">
              Mở bàn biên tập <ArrowTopRightIcon />
            </Link>
          </div>
        )}
        <div className="article-footnote">
          <span>{count} bài hướng dẫn đã xuất bản</span>
          <span>Không lý thuyết dài dòng. Có thể áp dụng ngay.</span>
        </div>
      </Reveal>
      <Reveal className="container">
        <section className="ask-section">
          <div className="ask-icon">
            <ChatBubbleIcon />
          </div>
          <div>
            <h2>Một câu hỏi. Một bước tiến.</h2>
            <p>
              Trợ lý AI tìm câu trả lời từ các bài viết trên blog,
              <br />
              giải thích rõ ràng và luôn dẫn nguồn.
            </p>
          </div>
          <OpenChat className="button button-primary">
            Bắt đầu trò chuyện <ArrowRightIcon />
          </OpenChat>
        </section>
      </Reveal>
      <section className="container quick-search">
        <MagnifyingGlassIcon />
        <form action="/posts">
          <label className="sr-only" htmlFor="home-search">
            Tìm hướng dẫn
          </label>
          <input
            id="home-search"
            name="q"
            placeholder="Bạn đang muốn làm gì với AI?"
          />
          <button type="submit" aria-label="Tìm kiếm">
            <ArrowRightIcon />
          </button>
        </form>
      </section>
    </>
  );
}
