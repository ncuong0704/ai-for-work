import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { cache } from "react";
import {
  ArrowLeftIcon,
  ArrowTopRightIcon,
  ChatBubbleIcon,
  ClockIcon,
} from "@radix-ui/react-icons";
import { prisma } from "@/lib/prisma";
import { documentSchema, type ContentBlock } from "@/lib/validation";
import { blocksToMarkdown, getHeadings } from "@/lib/content";
import { formatDate, readingTime, slugify } from "@/lib/utils";
import { Markdown } from "@/components/blog/markdown";
import { OpenChat } from "@/components/chat/open-chat";

export const dynamic = "force-dynamic";
const getPost = cache((slug: string) =>
  prisma.post.findFirst({ where: { slug, status: "PUBLISHED" } }),
);
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPost((await params).slug);
  if (!post) return { title: "Không tìm thấy bài viết" };
  return {
    title: post.title,
    description: post.summary || undefined,
    alternates: { canonical: `/posts/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.summary || undefined,
      publishedTime: post.publishedAt?.toISOString(),
      ...(post.coverImage ? { images: [post.coverImage] } : {}),
    },
  };
}
export default async function PostPage({ params }: Props) {
  const post = await getPost((await params).slug);
  if (!post) notFound();
  const parsed = documentSchema.safeParse(post.contentJson);
  const blocks: ContentBlock[] = parsed.success ? parsed.data : [];
  const markdown = blocks.length
    ? blocksToMarkdown(blocks)
    : post.contentMd || "";
  const seen = new Map<string, number>();
  const headings = getHeadings(blocks).map((h) => {
    const slug = slugify(h.text);
    const count = seen.get(slug) || 0;
    seen.set(slug, count + 1);
    return { ...h, id: count ? `${slug}-${count}` : slug };
  });
  const sources = Array.isArray(post.sourceUrls)
    ? (post.sourceUrls as { url: string; title: string }[])
    : [];
  const questions = [
    `Tóm tắt những bước chính trong bài “${post.title}”`,
    `Tôi nên bắt đầu áp dụng hướng dẫn “${post.title}” như thế nào?`,
  ];
  return (
    <article className="container article-page">
      <Link href="/posts" className="back-link">
        <ArrowLeftIcon /> Thư viện hướng dẫn
      </Link>
      <header className="article-header">
        <div className="post-meta">
          <Link
            href={`/posts?category=${encodeURIComponent(post.category || "")}`}
            className="category-text"
          >
            {post.category}
          </Link>
          <span>
            <ClockIcon /> {readingTime(markdown)} phút đọc
          </span>
        </div>
        <h1>{post.title}</h1>
        <p>{post.summary}</p>
        <div className="article-byline">
          <span className="author-avatar">AW</span>
          <div>
            <strong>Ban biên tập AI For Work</strong>
            <span>
              {formatDate(post.publishedAt || post.createdAt)} · Đã được biên
              tập
            </span>
          </div>
        </div>
      </header>
      {post.coverImage && (
        <img
          className="article-cover"
          src={post.coverImage}
          alt={post.title}
          referrerPolicy="no-referrer"
        />
      )}
      <div className="article-layout">
        <div className="article-body">
          <Markdown content={markdown} />
          {post.tags.length > 0 && (
            <div className="tags">
              {post.tags.map((t) => (
                <Link href={`/posts?q=${encodeURIComponent(t)}`} key={t}>
                  #{t}
                </Link>
              ))}
            </div>
          )}
          {sources.length > 0 && (
            <section className="article-sources">
              <h2>Nguồn tham khảo</h2>
              {sources
                .filter((s) => /^https?:\/\//i.test(s.url))
                .map((s, i) => (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {s.title || s.url} <ArrowTopRightIcon />
                  </a>
                ))}
            </section>
          )}
          <section className="related-questions">
            <ChatBubbleIcon />
            <h2>Biến kiến thức thành hành động.</h2>
            <p>Cùng trợ lý AI tìm cách áp dụng vào công việc của bạn.</p>
            {questions.map((q) => (
              <OpenChat question={q} className="question-button" key={q}>
                {q}
                <ArrowTopRightIcon />
              </OpenChat>
            ))}
          </section>
        </div>
        {headings.length > 2 && (
          <aside className="toc">
            <span>Trong bài viết này</span>
            <nav aria-label="Mục lục">
              {headings.map((h) => (
                <a
                  href={`#${h.id}`}
                  key={h.id}
                  className={h.level > 2 ? "toc-sub" : ""}
                >
                  {h.text}
                </a>
              ))}
            </nav>
            <OpenChat className="button button-outline button-sm">
              Hỏi về bài viết <ChatBubbleIcon />
            </OpenChat>
          </aside>
        )}
      </div>
    </article>
  );
}
