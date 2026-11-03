import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

try {
  process.loadEnvFile(".env");
} catch {}
const configured = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
assert(configured, "Set TEST_DATABASE_URL or start npm run db:local first.");
const url = new URL(configured);
if (!process.env.TEST_DATABASE_URL) url.pathname = "/aiforwork_test";
assert(
  url.pathname.endsWith("_test"),
  "Integration tests only run against a dedicated database ending in _test.",
);
process.env.DATABASE_URL = url.toString();
process.env.JWT_SECRET ||=
  "integration-test-secret-with-more-than-32-characters";
execFileSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  { stdio: "inherit", env: process.env },
);
const { prisma } = await import("../src/lib/prisma");
const { savePost } = await import("../src/lib/posts");
const { retrieveChunks } = await import("../src/lib/search");
const { generateDrafts } = await import("../src/lib/ai/generate");
const { saveSettings, publicSettings, getProvider } = await import("../src/lib/settings");
const { chat } = await import("../src/lib/chat");
const { rateLimit } = await import("../src/lib/rate-limit");
const { postInputSchema } = await import("../src/lib/validation");
const originalFetch = globalThis.fetch;
let checks = 0;
function passed(name: string) {
  checks++;
  console.log(`PASS ${name}`);
}
try {
  await prisma.chatSession.deleteMany();
  await prisma.post.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.rateLimit.deleteMany();
  const input = postInputSchema.parse({
    title: "Phân tích dữ liệu công việc",
    category: "Phân tích dữ liệu",
    contentJson: [
      { type: "heading", props: { level: 2 }, content: "Hướng dẫn phân tích" },
      {
        type: "paragraph",
        content:
          "Sử dụng bảng tính để phân tích doanh thu. Hãy tạo báo cáo dữ liệu hàng tháng và kiểm tra nguồn trước khi gửi.",
      },
    ],
  });
  let post = await savePost(input);
  assert.equal(await prisma.postChunk.count({ where: { postId: post.id } }), 0);
  assert.equal((await retrieveChunks("doanh thu")).length, 0);
  passed("drafts are not indexed or retrievable");
  post = await savePost(
    { ...input, status: "PUBLISHED", updatedAt: post.updatedAt.toISOString() },
    post.id,
  );
  assert((await prisma.postChunk.count({ where: { postId: post.id } })) > 0);
  assert(
    (await retrieveChunks("phan tich du lieu")).some(
      (c) => c.slug === post.slug,
    ),
  );
  const folding = await prisma.$queryRaw<
    { text: string }[]
  >`SELECT afw_normalize('Đánh giá dữ liệu và quản lý') AS text`;
  assert.equal(folding[0].text, "danh gia du lieu va quan ly");
  passed("publish creates generated GIN-searchable accent-insensitive chunks");
  const upper = await prisma.$queryRaw<
    { text: string }[]
  >`SELECT afw_normalize('ĐÁNH GIÁ DỮ LIỆU VÀ QUẢN LÝ') AS text`;
  assert.equal(upper[0].text, "danh gia du lieu va quan ly");
  passed("Vietnamese case folding works even under PostgreSQL C locale");
  const changed = {
    ...input,
    status: "PUBLISHED" as const,
    updatedAt: post.updatedAt.toISOString(),
    contentJson: [
      {
        type: "paragraph" as const,
        content: "Tự động hóa email trả lời khách hàng với Groq.",
      },
    ],
  };
  post = await savePost(changed, post.id);
  assert.equal((await retrieveChunks("doanh thu")).length, 0);
  assert((await retrieveChunks("email")).length > 0);
  passed("editing replaces stale chunks atomically");
  await assert.rejects(
    () =>
      savePost({ ...changed, updatedAt: "2020-01-01T00:00:00.000Z" }, post.id),
    /cửa sổ khác/,
  );
  passed("stale editor cannot overwrite newer content");
  post = await savePost(
    { ...changed, status: "DRAFT", updatedAt: post.updatedAt.toISOString() },
    post.id,
  );
  assert.equal((await retrieveChunks("email")).length, 0);
  assert.equal(await prisma.postChunk.count({ where: { postId: post.id } }), 0);
  passed("unpublish removes indexed content");
  await saveSettings({
    groqKey: "test-groq-key",
    groqWritingModel: "test-writing",
    groqChatModel: "test-chat",
  });
  await saveSettings({
    groqKey: "",
    groqWritingModel: "test-writing",
    groqChatModel: "test-chat",
  });
  assert.deepEqual(await publicSettings(), {
    groqConfigured: true,
    groqWritingModel: "test-writing",
    groqChatModel: "test-chat",
  });
  assert.deepEqual(await getProvider("writing"), {key: "test-groq-key", model: "test-writing"});
  assert.deepEqual(await getProvider("chat"), {key: "test-groq-key", model: "test-chat"});
  passed("separate models persist with one shared key; blank key preserves credentials");
  let calls = 0;
  globalThis.fetch = async (endpoint, init) => {
    assert.equal(String(endpoint), "https://api.groq.com/openai/v1/chat/completions");
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer test-groq-key");
    assert.equal(JSON.parse(String(init?.body)).model, "test-writing");
    calls++;
    if (calls === 3) return Response.json({}, { status: 429 });
    const article = {
      title: `Bài viết số ${calls}`,
      summary: "Nội dung test",
      category: calls === 2 ? "NEEDS_NEW_CATEGORY" : "Khác",
      category_reason: "Chủ đề mới",
      tags: [],
      source_urls: [],
      content_markdown: "## Hướng dẫn\n\nHướng dẫn sử dụng AI thực tế.",
    };
    return Response.json({
      choices: [
        {
          finish_reason: "stop",
          message: { role: "assistant", content: JSON.stringify(article) },
        },
      ],
    });
  };
  const generation = {
    requestId: crypto.randomUUID(),
    topics: ["Chủ đề một", "Chủ đề hai", "Chủ đề ba"],
    tone: "Chuyên nghiệp rõ ràng" as const,
    length: "Trung bình (1000–1500 từ)" as const,
    hasImage: false,
  };
  const results = [];
  for await (const result of generateDrafts(generation)) results.push(result);
  assert.equal(calls, 3);
  assert.deepEqual(
    results.map((r) => r.status),
    ["created", "rejected", "error"],
  );
  assert.equal(
    await prisma.post.count({ where: { generationKey: { not: null } } }),
    1,
  );
  passed("one attempt per topic; rejected/failed topics never become drafts");
  const retry = [];
  for await (const result of generateDrafts({
    ...generation,
    topics: [generation.topics[0]],
  }))
    retry.push(result);
  assert.equal(calls, 3);
  assert.equal(retry[0].postId, results[0].postId);
  passed("repeated generation request does not duplicate a saved draft");
  post = await savePost(
    { ...changed, status: "PUBLISHED", updatedAt: post.updatedAt.toISOString() },
    post.id,
  );
  const groundedSession = await prisma.chatSession.create({data: {}});
  globalThis.fetch = async (endpoint, init) => {
    assert.equal(String(endpoint), "https://api.groq.com/openai/v1/chat/completions");
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer test-groq-key");
    assert.equal(JSON.parse(String(init?.body)).model, "test-chat");
    return Response.json({choices: [{message: {role: "assistant", content: "Dùng AI để tự động hóa email trả lời khách hàng."}}]});
  };
  const groundedAnswer = await chat(groundedSession.id, "email khách hàng");
  assert(groundedAnswer.content.includes(`/posts/${post.slug}`));
  passed("RAG chat uses its own selected model and retains trusted blog citations");
  post = await savePost(
    { ...changed, status: "DRAFT", updatedAt: post.updatedAt.toISOString() },
    post.id,
  );
  globalThis.fetch = async () => {
    throw new Error("No model call expected");
  };
  const session = await prisma.chatSession.create({ data: {} });
  const answer = await chat(session.id, "Một nội dung không có trong blog");
  assert.match(answer.content, /chưa tìm thấy/);
  assert.equal(
    await prisma.chatMessage.count({ where: { sessionId: session.id } }),
    2,
  );
  passed(
    "empty retrieval returns honest fallback and saves context without calling AI",
  );
  await prisma.chatSession.update({
    where: { id: session.id },
    data: { busyUntil: new Date(Date.now() + 10_000) },
  });
  await assert.rejects(
    () => chat(session.id, "Câu hỏi khác"),
    /đang có câu hỏi/,
  );
  passed("concurrent session requests are rejected before calling AI");
  await rateLimit("integration", 2, 60);
  await rateLimit("integration", 2, 60);
  await assert.rejects(
    () => rateLimit("integration", 2, 60),
    /thao tác hơi nhanh/,
  );
  passed("database rate limit enforces request count");
  await prisma.post.delete({ where: { id: post.id } });
  assert.equal(await prisma.postChunk.count({ where: { postId: post.id } }), 0);
  passed("deleting a post cascades chunks");
  console.log(`${checks} integration checks passed against real PostgreSQL.`);
} finally {
  globalThis.fetch = originalFetch;
  await prisma.chatSession.deleteMany();
  await prisma.post.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.rateLimit.deleteMany();
  await prisma.$disconnect();
}
