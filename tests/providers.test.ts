import { afterEach, describe, expect, it, vi } from "vitest";
import { generateArticle, parseArticle, answerFromContext } from "@/lib/ai/groq";
import { providerRequest } from "@/lib/ai/request";

afterEach(() => vi.unstubAllGlobals());

describe("provider authorization errors", () => {
  it("explains an invalid Groq credential without exposing the response", async () => {
    vi.stubGlobal("fetch", async () =>
      Response.json(
        {
          error: {
            message: "Invalid API key secret-key-must-not-leak",
          },
        },
        { status: 401 },
      ),
    );
    await expect(
      providerRequest("https://provider.test", {}, "Groq"),
    ).rejects.toThrow(/API key Groq không hợp lệ/);
    await expect(
      providerRequest("https://provider.test", {}, "Groq"),
    ).rejects.not.toThrow(/secret-key/);
  });
  it("distinguishes permission denied from an invalid credential", async () => {
    vi.stubGlobal("fetch", async () =>
      Response.json(
        { error: { message: "Restricted model secret-key-must-not-leak" } },
        { status: 403 },
      ),
    );
    await expect(
      providerRequest("https://provider.test", {}, "Groq"),
    ).rejects.toThrow(/quyền truy cập/);
    await expect(
      providerRequest("https://provider.test", {}, "Groq"),
    ).rejects.not.toThrow(/không hợp lệ|secret-key/);
  });
  it("does not expose provider details for a failed request", async () => {
    vi.stubGlobal("fetch", async () =>
      Response.json(
        {
          error: {
            code: 400,
            message: "secret-key-must-not-leak",
          },
        },
        { status: 400 },
      ),
    );
    await expect(
      providerRequest("https://provider.test", {}, "Groq"),
    ).rejects.toThrow(/Groq.*400/);
    await expect(
      providerRequest("https://provider.test", {}, "Groq"),
    ).rejects.not.toThrow(/secret-key/);
  });
});
const article = {
  title: "Viết email rõ ràng",
  summary: "Một hướng dẫn.",
  category: "Khác",
  tags: ["email"],
  source_urls: [],
  content_markdown: "## Bước 1\n\nViết mục tiêu email.",
};
const options = {
  tone: "Chuyên nghiệp rõ ràng",
  length: "Ngắn (600–900 từ)",
  hasImage: false,
};

describe("Groq generation boundary", () => {
  it("rejects invented categories and incomplete successful output", () => {
    expect(() =>
      parseArticle(JSON.stringify({ ...article, category: "Tự tạo" }), [
        "Khác",
      ]),
    ).toThrow(/chuyên mục/i);
    expect(() =>
      parseArticle(JSON.stringify({ ...article, content_markdown: "" }), [
        "Khác",
      ]),
    ).toThrow();
  });
  it("accepts NEEDS_NEW_CATEGORY without creating article content", () => {
    const result = parseArticle(
      JSON.stringify({
        ...article,
        category: "NEEDS_NEW_CATEGORY",
        category_reason: "Cần danh mục mới",
        content_markdown: "",
      }),
      ["Khác"],
    );
    expect(result.category).toBe("NEEDS_NEW_CATEGORY");
    expect(result.category_reason).toBe("Cần danh mục mới");
  });
  it("generates a validated draft through Groq JSON mode without invented sources", async () => {
    let sent: Record<string, unknown> = {};
    let endpoint = "";
    let authorization: string | null = null;
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      endpoint = _url;
      authorization = new Headers(init.headers).get("Authorization");
      sent = JSON.parse(init.body as string);
      return Response.json({
        choices: [
          {
            finish_reason: "stop",
            message: {
              role: "assistant",
              content: JSON.stringify({
                ...article,
                source_urls: [{ url: "https://invented.test", title: "Invented" }],
              }),
            },
          },
        ],
      });
    });
    const result = await generateArticle(
      { key: "secret", model: "groq-test" },
      "Email",
      options,
      ["Khác"],
    );
    expect(endpoint).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(authorization).toBe("Bearer secret");
    expect(sent.model).toBe("groq-test");
    expect(sent.response_format).toEqual({ type: "json_object" });
    expect(sent.messages).toEqual([
      { role: "system", content: expect.stringContaining(options.tone) },
      { role: "user", content: expect.stringContaining('"Email"') },
    ]);
    expect(result.source_urls).toEqual([]);
    expect(result.title).toBe(article.title);
  });
  it.each(["length", "content_filter"])(
    "rejects an unfinished draft (%s) even if its JSON parses",
    async (reason) => {
      vi.stubGlobal("fetch", async () =>
        Response.json({
          choices: [{
            finish_reason: reason,
            message: { role: "assistant", content: JSON.stringify(article) },
          }],
        }),
      );
      await expect(
        generateArticle({ key: "secret", model: "groq-test" }, "Email", options, ["Khác"]),
      ).rejects.toThrow(/hoàn chỉnh/);
    },
  );
  it("reports rate limits without leaking provider response details", async () => {
    vi.stubGlobal("fetch", async () =>
      Response.json({ error: { message: "secret-key-123" } }, { status: 429 }),
    );
    await expect(
      generateArticle(
        { key: "secret", model: "groq-test" },
        "Email",
        options,
        ["Khác"],
      ),
    ).rejects.toThrow(/giới hạn/i);
  });
});

describe("Groq RAG boundary", () => {
  it("does not call a model without retrieved evidence", async () => {
    vi.stubGlobal("fetch", () => {
      throw new Error("A model must not be called");
    });
    const result = await answerFromContext(
      { key: "test", model: "test" },
      "Câu hỏi",
      [],
      [],
    );
    expect(result).toMatch(/chưa có|chưa tìm|không đủ/i);
  });
  it("uses no more than eight recent messages and enforces trusted citations", async () => {
    let sent: { messages: { role: string; content: string }[] } | undefined;
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      sent = JSON.parse(init.body as string);
      return Response.json({
        choices: [
          { message: { content: "Làm theo bước 1. [Bịa](https://evil.test)" } },
        ],
      });
    });
    const history = Array.from({ length: 12 }, (_, i) => ({
      role: i % 2 ? "assistant" : "user",
      content: `tin ${i}`,
    }));
    const answer = await answerFromContext(
      { key: "key", model: "model" },
      "Hướng dẫn",
      history,
      [
        {
          content: "Bước 1",
          title: "Bài thật",
          slug: "bai-that",
          url: "/posts/bai-that",
          rank: 1,
        },
      ],
    );
    expect(
      sent?.messages.filter((m) => m.content.startsWith("tin ")),
    ).toHaveLength(8);
    expect(answer).toContain("[Bài thật](/posts/bai-that)");
    expect(answer).not.toContain("evil.test");
  });
});
