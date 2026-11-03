import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ReactNode } from "react";
import { isValidElement } from "react";
import { slugify } from "@/lib/utils";

function nodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (isValidElement<{ children?: ReactNode }>(node))
    return nodeText(node.props.children);
  return "";
}
export function Markdown({
  content,
  headings = true,
}: {
  content: string;
  headings?: boolean;
}) {
  const ids = new Map<string, number>();
  function id(children: ReactNode) {
    const slug = slugify(nodeText(children));
    const count = ids.get(slug) || 0;
    ids.set(slug, count + 1);
    return count ? `${slug}-${count}` : slug;
  }
  return (
    <div className="prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          h1: ({ children }) => (
            <h2 id={headings ? id(children) : undefined}>{children}</h2>
          ),
          h2: ({ children }) => (
            <h2 id={headings ? id(children) : undefined}>{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 id={headings ? id(children) : undefined}>{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 id={headings ? id(children) : undefined}>{children}</h4>
          ),
          h5: ({ children }) => (
            <h5 id={headings ? id(children) : undefined}>{children}</h5>
          ),
          h6: ({ children }) => (
            <h6 id={headings ? id(children) : undefined}>{children}</h6>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              {...(href?.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {children}
            </a>
          ),
          img: ({ src, alt }) =>
            typeof src === "string" && /^https?:\/\//i.test(src) ? (
              <img
                src={src}
                alt={alt || "Hình minh họa"}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : null,
          table: ({ children }) => (
            <div className="table-scroll">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
