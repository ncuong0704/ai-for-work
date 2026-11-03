import assert from "node:assert/strict";
process.loadEnvFile(".env");
const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
let cookie = "";
async function request(path, method = "GET", body, authenticated = false) {
  const response = await fetch(`${base}${path}`, {
    method,
    redirect: "manual",
    headers: {
      Origin: base,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(authenticated && cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return response;
}
for (const path of [
  "/",
  "/posts",
  "/admin/login",
  "/robots.txt",
  "/sitemap.xml",
]) {
  const result = await request(path);
  assert.equal(result.status, 200, `${path} returns 200`);
  console.log(`PASS GET ${path}`);
}
assert.equal((await request("/admin/dashboard")).status, 307);
console.log("PASS admin page redirects anonymous user");
assert.equal((await request("/api/admin/settings")).status, 401);
console.log("PASS settings API denies anonymous user");
assert.equal(
  (
    await request("/api/cron/generate-posts", "POST", {
      requestId: crypto.randomUUID(),
    })
  ).status,
  401,
);
console.log("PASS cron denies anonymous caller");
const login = await request("/api/admin/login", "POST", {
  email: process.env.ADMIN_EMAIL,
  password: process.env.ADMIN_PASSWORD,
});
assert.equal(login.status, 200, await login.text());
cookie = login.headers.get("set-cookie")?.split(";")[0] || "";
assert(cookie);
console.log("PASS admin login");
assert.equal(
  (await request("/admin/dashboard", "GET", undefined, true)).status,
  200,
);
console.log("PASS protected dashboard");
const settings = await request("/api/admin/settings", "GET", undefined, true);
const data = await settings.json();
assert.equal(settings.status, 200);
assert.deepEqual(Object.keys(data).sort(), ["groqChatModel", "groqConfigured", "groqWritingModel"]);
console.log("PASS settings API returns configuration flags without secrets");
const crossOrigin = await fetch(`${base}/api/admin/settings`, {
  method: "PUT",
  headers: {
    Cookie: cookie,
    Origin: "https://other.example",
    "Content-Type": "application/json",
  },
  body: "{}",
});
assert.equal(crossOrigin.status, 403);
console.log("PASS cross-origin mutation denied");
const chatHistory = await request("/api/chat");
assert.deepEqual(await chatHistory.json(), { sessionId: null, messages: [] });
console.log("PASS anonymous history has no access to another session");
if (process.env.SMOKE_MUTATIONS === "1") {
  const savedSettings = await request(
    "/api/admin/settings",
    "PUT",
    { groqKey: "", groqWritingModel: data.groqWritingModel, groqChatModel: data.groqChatModel },
    true,
  );
  assert.equal(savedSettings.status, 200, await savedSettings.clone().text());
  assert.deepEqual(await savedSettings.json(), data);
  const settingsPage = await request("/admin/settings", "GET", undefined, true);
  assert.equal(settingsPage.status, 200);
  const settingsHtml = await settingsPage.text();
  assert(settingsHtml.includes('name="groqKey"'));
  assert(settingsHtml.includes('name="groqWritingModel"'));
  assert(settingsHtml.includes('name="groqChatModel"'));
  assert(!settingsHtml.includes('name="geminiKey"'));
  for (const field of ["groqWritingModel", "groqChatModel"]) {
    const invalidSettings = await request(
      "/api/admin/settings", "PUT",
      { groqKey: "", groqWritingModel: data.groqWritingModel, groqChatModel: data.groqChatModel, [field]: "" },
      true,
    );
    assert.equal(invalidSettings.status, 400);
  }
  console.log("PASS separate model settings render, save without replacing key, and reject empty model IDs");
  async function assertNotPublic(slug, title) {
    const response = await request(`/posts/${slug}`);
    const html = await response.text();
    // Next.js can stream notFound UI with status 200; verify content and noindex.
    assert([200, 404].includes(response.status));
    assert(!html.includes(title), "Draft content must not be disclosed");
    assert(html.includes("Trang này đã đi một lối khác."));
    assert(/name="robots"[^>]*content="noindex/.test(html));
  }
  let postId;
  let chatCookie;
  try {
    const input = {
      title: "SMOKE: Hướng dẫn AI tạm thời",
      category: "Khác",
      summary: "Bài tạm chỉ dùng kiểm tra API, sẽ được xóa tự động.",
      tags: [],
      coverImage: "",
      status: "DRAFT",
      contentJson: [
        { type: "heading", props: { level: 2 }, content: "Hướng dẫn" },
        { type: "paragraph", content: "Thay <name> bằng tên của bạn." },
        {
          type: "table",
          content: {
            type: "tableContent",
            columnWidths: [null, null],
            rows: [
              { cells: ["Tên", "Giá trị"] },
              { cells: ["A | B", "one or other"] },
            ],
          },
        },
      ],
    };
    assert.equal(
      (await request("/api/admin/posts", "POST", input)).status,
      401,
    );
    const created = await request("/api/admin/posts", "POST", input, true);
    assert.equal(created.status, 201, await created.clone().text());
    let post = await created.json();
    postId = post.id;
    await assertNotPublic(post.slug, input.title);
    assert.equal(
      (await request(`/admin/posts/${post.id}`, "GET", undefined, true)).status,
      200,
    );
    console.log(
      "PASS draft creation and protected editor; draft is not public",
    );
    const published = await request(
      `/api/admin/posts/${post.id}`,
      "PUT",
      { ...input, status: "PUBLISHED", updatedAt: post.updatedAt },
      true,
    );
    assert.equal(published.status, 200, await published.clone().text());
    post = await published.json();
    const article = await request(`/posts/${post.slug}`);
    assert.equal(article.status, 200);
    const html = await article.text();
    assert(html.includes("&lt;name&gt;"));
    assert(html.includes("A | B"));
    assert(html.includes("one or other"));
    assert((await (await request("/")).text()).includes(input.title));
    assert(
      (
        await (
          await request(`/posts?category=${encodeURIComponent("Khác")}`)
        ).text()
      ).includes(input.title),
    );
    console.log(
      "PASS published article, literal prompt placeholders, table and category listing",
    );
    const unpublished = await request(
      `/api/admin/posts/${post.id}`,
      "PUT",
      { ...input, updatedAt: post.updatedAt },
      true,
    );
    assert.equal(unpublished.status, 200, await unpublished.clone().text());
    await assertNotPublic(post.slug, input.title);
    console.log("PASS unpublish removes public article");
    const chatResponse = await request("/api/chat", "POST", {
      message: "zzzxxyyuniquetestnomatches",
      sessionId: null,
    });
    assert.equal(chatResponse.status, 200, await chatResponse.clone().text());
    const chatData = await chatResponse.json();
    chatCookie = chatResponse.headers.get("set-cookie")?.split(";")[0];
    assert(chatCookie);
    const owned = await fetch(`${base}/api/chat`, {
      headers: { Cookie: chatCookie },
    });
    const history = await owned.json();
    assert.equal(history.sessionId, chatData.sessionId);
    assert.equal(history.messages.length, 2);
    const forged = await request("/api/chat", "POST", {
      message: "test",
      sessionId: chatData.sessionId,
    });
    assert.equal(forged.status, 410);
    console.log(
      "PASS chat persists short history and rejects a session ID without its capability cookie",
    );
  } finally {
    if (postId)
      assert.equal(
        (await request(`/api/admin/posts/${postId}`, "DELETE", undefined, true))
          .status,
        200,
      );
    if (chatCookie) {
      const cleared = await fetch(`${base}/api/chat`, {
        method: "DELETE",
        headers: { Cookie: chatCookie, Origin: base },
      });
      assert.equal(cleared.status, 200);
      const afterClear = await fetch(`${base}/api/chat`, {
        headers: { Cookie: chatCookie },
      });
      assert.equal((await afterClear.json()).sessionId, null);
    }
    console.log("PASS temporary fixtures and chat history cleaned up");
  }
}
console.log("All HTTP smoke checks passed.");
