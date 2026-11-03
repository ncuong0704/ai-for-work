import Link from "next/link";
import type { Post } from "@prisma/client";
import {
  ArrowTopRightIcon,
  ClockIcon,
  ReaderIcon,
} from "@radix-ui/react-icons";
import { formatDate, readingTime } from "@/lib/utils";

export function PostCard({
  post,
  featured = false,
}: {
  post: Post;
  featured?: boolean;
}) {
  return (
    <article className={`post-card ${featured ? "post-card-featured" : ""}`}>
      <Link
        href={`/posts/${post.slug}`}
        className="post-card-art"
        tabIndex={-1}
        aria-hidden="true"
      >
        {post.coverImage ? (
          <img
            src={post.coverImage}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="post-art">
            <ReaderIcon />
            <span>{post.category || "AI For Work"}</span>
            <span className="post-art-word">
              Làm việc
              <br />
              <strong>thông minh hơn.</strong>
            </span>
            <div className="art-lines" />
          </div>
        )}
      </Link>
      <div className="post-card-body">
        <div className="post-meta">
          <span className="category-text">{post.category}</span>
          <span>
            <ClockIcon /> {readingTime(post.contentMd)} phút đọc
          </span>
        </div>
        <h3>
          <Link href={`/posts/${post.slug}`}>
            {post.title}
            <ArrowTopRightIcon />
          </Link>
        </h3>
        <p>{post.summary}</p>
        <div className="post-card-bottom">
          <span>AI For Work</span>
          <time dateTime={(post.publishedAt || post.createdAt).toISOString()}>
            {formatDate(post.publishedAt || post.createdAt)}
          </time>
        </div>
      </div>
    </article>
  );
}
