import { describe, it, expect } from "vitest";
import { chunkText, tokenCount } from "@/lib/chunking";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { createToken, verifyToken } from "@/lib/tokens";
import {
  postInputSchema,
  generationInputSchema,
  generatedArticleSchema,
} from "@/lib/validation";
import { blocksToMarkdown, markdownToBlocks } from "@/lib/content";
import { ensureSources, normalizeSearch } from "@/lib/rag";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function renderMarkdown(text: string) {
  return renderToStaticMarkup(
    createElement(ReactMarkdown, {
      remarkPlugins: [remarkGfm],
      skipHtml: true,
      children: text,
    }),
  );
}

process.env.JWT_SECRET = "test-only-32-character-secret-for-tests";

describe("512 token recursive chunks with 50 token overlap", () => {
  it("does not create empty chunks", () =>
    expect(chunkText("  \n ")).toEqual([]));
  it("keeps a short Vietnamese paragraph intact", () => {
    expect(chunkText("Hãy dùng AI để viết email rõ ràng.")).toEqual([
      "Hãy dùng AI để viết email rõ ràng.",
    ]);
  });
  it("bounds every chunk and preserves ordered content", () => {
    const text = Array.from(
      { length: 700 },
      (_, i) => `Bước ${i}: phân tích dữ liệu.`,
    ).join("\n\n");
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks.every((c) => tokenCount(c) <= 512)).toBe(true);
    expect(chunks[0]).toContain("Bước 0");
    expect(chunks.at(-1)).toContain("Bước 699");
    expect(chunks[1].slice(0, 25)).toSatisfy((prefix: string) =>
      chunks[0].includes(prefix),
    );
  });
  it("splits unbroken multibyte text without corrupting Unicode", () => {
    const chunks = chunkText("việt🧠".repeat(900));
    expect(chunks.every((c) => tokenCount(c) <= 512 && !c.includes("�"))).toBe(
      true,
    );
    expect(chunks.length).toBeGreaterThan(1);
  });
});

describe("security boundaries", () => {
  it("encrypts provider keys and rejects tampered ciphertext", () => {
    const encrypted = encryptSecret("private-api-key");
    expect(encrypted).not.toContain("private-api-key");
    expect(decryptSecret(encrypted)).toBe("private-api-key");
    expect(() => decryptSecret(encrypted.slice(0, -6) + "AAAAAA")).toThrow();
  });
  it("rejects wrong scope, expired and tampered tokens", async () => {
    const token = await createToken("admin-1", "admin", "1h");
    expect((await verifyToken(token, "admin"))?.sub).toBe("admin-1");
    expect(await verifyToken(token, "chat")).toBeNull();
    expect(await verifyToken(token + "x", "admin")).toBeNull();
    expect(
      await verifyToken(await createToken("admin-1", "admin", "-1s"), "admin"),
    ).toBeNull();
  });
  it("rejects unsafe URLs, empty batches and invalid block documents", () => {
    expect(generationInputSchema.safeParse({ topics: [] }).success).toBe(false);
    expect(
      postInputSchema.safeParse({
        title: "Valid title",
        category: "Khác",
        contentJson: [{ type: "unknown", content: "x" }],
      }).success,
    ).toBe(false);
    expect(
      generatedArticleSchema.safeParse({
        title: "Title",
        summary: "Summary",
        category: "Khác",
        tags: [],
        source_urls: [{ title: "x", url: "javascript:alert(1)" }],
        content_markdown: "Content",
      }).success,
    ).toBe(false);
  });
});

describe("BlockNote content", () => {
  it("converts headings, formatted inline text, nested lists and code", () => {
    const md = blocksToMarkdown([
      {
        id: "h",
        type: "heading",
        props: { level: 2 },
        content: [{ type: "text", text: "Bắt đầu", styles: {} }],
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "Quan trọng", styles: { bold: true } }],
      },
      {
        type: "bulletListItem",
        content: "Bước một",
        children: [{ type: "bulletListItem", content: "Chi tiết" }],
      },
      { type: "codeBlock", props: { language: "js" }, content: "const x = 1;" },
    ]);
    expect(md).toContain("## Bắt đầu");
    expect(md).toContain("**Quan trọng**");
    expect(md).toContain("  - Chi tiết");
    expect(md).toContain("```js\nconst x = 1;\n```");
  });
  it("imports generated Markdown into editable blocks", () => {
    const blocks = markdownToBlocks(
      "## Hướng dẫn\n\nNội dung **cần nhớ**.\n\n- Mục một\n- Mục hai",
    );
    expect(blocks[0].type).toBe("heading");
    expect(blocksToMarkdown(blocks)).toContain("**cần nhớ**");
    expect(blocks.filter((b) => b.type === "bulletListItem")).toHaveLength(2);
  });
  it("saves a default BlockNote table after JSON serialization", () => {
    const contentJson = JSON.parse(
      JSON.stringify([
        {
          type: "table",
          content: {
            type: "tableContent",
            columnWidths: [undefined, 180],
            rows: [
              {
                cells: [
                  [{ type: "text", text: "Tên", styles: {} }],
                  [{ type: "text", text: "Giá trị", styles: {} }],
                ],
              },
            ],
          },
        },
      ]),
    );
    const result = postInputSchema.safeParse({
      title: "Bảng dữ liệu",
      category: "Khác",
      contentJson,
    });
    expect(result.success).toBe(true);
  });
  it("preserves literal prompt placeholders and Markdown punctuation", () => {
    const markdown = blocksToMarkdown([
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Send to <email>, replace <name>, keep **literal**.",
            styles: {},
          },
        ],
      },
    ]);
    const html = renderMarkdown(markdown);
    expect(html).toContain("&lt;email&gt;");
    expect(html).toContain("&lt;name&gt;");
    expect(html).toContain("**literal**");
    expect(html).not.toContain("<strong>literal");
  });
  it("keeps literal pipes inside a single table cell", () => {
    const html = renderMarkdown(
      blocksToMarkdown([
        {
          type: "table",
          content: {
            type: "tableContent",
            rows: [
              { cells: ["First", "Second"] },
              { cells: ["A | B", "one or other"] },
            ],
          },
        },
      ]),
    );
    expect(html).toContain("<td>A | B</td>");
    expect(html).toContain("<td>one or other</td>");
  });
});

describe("grounded answers", () => {
  it("normalizes Vietnamese accents for lexical search", () => {
    expect(normalizeSearch("Đánh giá dữ liệu!")).toBe("danh gia du lieu!");
  });
  it("replaces model citations with trusted retrieved sources", () => {
    const answer = ensureSources(
      "Xem [bài giả](/posts/private) và [web](https://evil.test).\n\n**Nguồn tham khảo:**\n- [Fake](/posts/fake)",
      [{ title: "Email tốt", slug: "email-tot", url: "/posts/email-tot" }],
    );
    expect(answer).toContain("[Email tốt](/posts/email-tot)");
    expect(answer).not.toContain("https://evil.test");
    expect(answer).not.toContain("/posts/private");
    expect(answer).not.toContain("/posts/fake");
  });
  it("removes reference citations, autolinks and HTML links", () => {
    const answer = ensureSources(
      "Xem [khác][ref].\n\n[ref]: /posts/not-retrieved\n\n<https://evil.test> và www.evil.test. person@evil.test <irc://evil.test> ![https://evil.test](https://evil.test/a.png) <a href='/posts/private'>bad</a>",
      [{ title: "Bài thật", slug: "bai-that", url: "/posts/bai-that" }],
    );
    expect(answer).not.toContain("/posts/not-retrieved");
    expect(answer).not.toContain("<a");
    expect(answer).not.toMatch(/\]\((?!\/posts\/bai-that)/);
    expect(answer).toContain("[Bài thật](/posts/bai-that)");
    const html = renderMarkdown(answer);
    expect(html.match(/href="[^"]*"/g)).toEqual(['href="/posts/bai-that"']);
  });
});

describe("same-origin check behind proxy", async () => {
  const { assertSameOrigin } = await import("@/lib/http");
  const req = (origin: string | null, headers: Record<string, string> = {}) =>
    new Request("http://0.0.0.0:3000/api/admin/login", {
      method: "POST",
      headers: { ...(origin ? { origin } : {}), ...headers },
    });
  it("accepts https origin matching forwarded host", () =>
    expect(() =>
      assertSameOrigin(
        req("https://site.vn", { host: "0.0.0.0:3000", "x-forwarded-host": "site.vn" }),
      ),
    ).not.toThrow());
  it("rejects foreign, missing and null origins", () => {
    expect(() => assertSameOrigin(req("https://evil.com", { host: "site.vn" }))).toThrow();
    expect(() => assertSameOrigin(req(null, { host: "site.vn" }))).toThrow();
    expect(() => assertSameOrigin(req("null", { host: "site.vn" }))).toThrow();
  });
});
