# AI For Work – Project Plan for Codex

> **Cập nhật theo yêu cầu người dùng (31/10/2026):** Bỏ Gemini, chỉ dùng Groq cho tạo bài, phân loại và chatbot. Phần Gemini/Google Search dưới đây là đặc tả ban đầu và đã được thay thế; xem [hướng dẫn hiện tại](../README.md) và [kế hoạch chuyển đổi](superpowers/plans/2026-10-31-groq-only.md).

> **Tên dự án:** AI For Work  
> **Tagline:** Từ ý tưởng đến thao tác – AI giúp bạn làm việc thông minh hơn  
> **Mục tiêu:** Blog công khai + Chatbot RAG về ứng dụng AI trong công việc hàng ngày, deploy trên Matbao Vibe Host.

---

## 1. Tổng quan dự án

Xây dựng website gồm:

- **Blog công khai**: Đăng các bài hướng dẫn step-by-step thực tế về sử dụng AI trong công việc (tiếng Việt).
- **Chatbot RAG**: Trả lời câu hỏi chỉ dựa trên nội dung các bài đã publish, giải thích đầy đủ + dẫn link nguồn. Chat ẩn danh theo session, nhớ context ngắn.
- **Admin panel**: 
  - Quản lý bài viết (tạo nhiều draft cùng lúc từ danh sách chủ đề do admin nhập).
  - Chỉnh sửa bài bằng BlockNote.js.
  - Cấu hình API Key + Model (Gemini & Groq).
  - Quản lý danh sách chủ đề (topics).
- **Tạo bài hàng loạt**: Admin nhập bao nhiêu chủ đề thì hệ thống tạo đúng bấy nhiêu bản nháp (draft). Có thể gọi qua giao diện admin hoặc API (có thể kết hợp cron nếu muốn chạy định kỳ).

**Yêu cầu đặc biệt:**
- UI thật bắt mắt, Dark mode mặc định.
- Hiệu ứng đẹp: GSAP + Three.js (hero).
- Retrieval dùng BM25-style (PostgreSQL full-text search), **không dùng vector embedding**.
- Chunk strategy: recursive, chunk_size = 512 tokens, overlap = 50, separators = `["\n\n", "\n", ". ", " "]`.

---

## 2. Tech Stack (bắt buộc)

| Thành phần              | Công nghệ                                      |
|-------------------------|------------------------------------------------|
| Framework               | Next.js 15 (App Router) + TypeScript           |
| Styling                 | Tailwind CSS + shadcn/ui                       |
| Animation               | GSAP + ScrollTrigger                           |
| 3D Hero                 | Three.js (hoặc @react-three/fiber)             |
| Editor                  | BlockNote.js                                   |
| Database                | PostgreSQL                                     |
| ORM                     | Prisma                                         |
| Auth Admin              | 1 tài khoản duy nhất (email + password hash)   |
| AI Viết bài + Search    | Google Gemini (có grounding/search)            |
| AI Chatbot              | Groq                                           |
| Full-text Search        | PostgreSQL `tsvector` + `ts_rank`              |
| Markdown/Content        | BlockNote JSON + export Markdown khi cần       |
| Deploy                  | Matbao Vibe Host (hỗ trợ Next.js, PostgreSQL)  |

**Lưu ý quan trọng về tài nguyên:** Gói Starter của Vibe Host khá hạn chế (≈ 1 core / 1GB RAM / 1GB storage). Ưu tiên code nhẹ, tránh thư viện nặng không cần thiết.

---

## 3. Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum PostStatus {
  DRAFT
  PUBLISHED
}

model Setting {
  key   String @id
  value String
}

model Admin {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
}

model Topic {
  id         String    @id @default(cuid())
  title      String
  isActive   Boolean   @default(true)
  lastUsedAt DateTime?
  createdAt  DateTime  @default(now())
}

model Post {
  id          String      @id @default(cuid())
  slug        String      @unique
  title       String
  contentJson Json        // BlockNote document JSON
  contentMd   String?     // plain markdown để chunk & search
  summary     String?
  category    String?     // AI tự gán
  status      PostStatus  @default(DRAFT)
  sourceUrls  Json?       // [{ url: string, title: string }]
  tags        String[]
  coverImage  String?
  publishedAt DateTime?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  chunks      PostChunk[]

  @@index([status, publishedAt])
  @@index([category])
}

model PostChunk {
  id         String @id @default(cuid())
  postId     String
  content    String
  chunkIndex Int
  // search_vector sẽ được tạo bằng raw SQL (generated column hoặc trigger)
  post       Post   @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@index([postId])
}

model ChatSession {
  id        String        @id @default(cuid())
  createdAt DateTime      @default(now())
  messages  ChatMessage[]
}

model ChatMessage {
  id        String      @id @default(cuid())
  sessionId String
  role      String      // "user" | "assistant"
  content   String
  sources   Json?       // [{ title, url, slug }]
  createdAt DateTime    @default(now())
  session   ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
}
```

**Lưu ý Full-text Search:**
- Tạo generated column hoặc dùng raw query với `to_tsvector('simple', content)` và `ts_rank`.
- Nên dùng config `'simple'` hoặc tạo custom text search config hỗ trợ tiếng Việt tốt hơn nếu có thể.

---

## 4. Tính năng chi tiết

### 4.1. Public Blog

- Trang chủ:
  - Hero section có Three.js (particle / abstract network style, tối giản, không quá nặng).
  - Tagline lớn.
  - Nút: “Khám phá bài viết” + “Hỏi AI ngay”.
  - Danh sách chuyên mục nhanh.
  - Bài viết nổi bật + bài mới nhất.
- Trang danh sách bài viết (có filter theo category).
- Trang chi tiết bài viết:
  - Render từ BlockNote JSON.
  - Có mục lục (nếu bài dài).
  - Cuối bài: block “Câu hỏi liên quan” → click mở chatbot với câu hỏi đã điền.
- Dark mode mặc định, có thể có toggle.
- UI minimal sạch sẽ kiểu Notion / Linear, nhưng có chiều sâu nhờ GSAP.

### 4.2. Chatbot (luôn hiển thị)

- Floating button góc dưới phải (có animation nhẹ).
- Click mở Sidebar panel (GSAP slide-in mượt).
- Session ẩn danh (lưu `sessionId` trong localStorage + gửi kèm request).
- Nhớ context: gửi tối đa 6–8 tin nhắn gần nhất.
- Retrieval: Full-text search trên `PostChunk` → lấy top 4–6 chunk liên quan nhất.
- Prompt bắt buộc:
  - Chỉ trả lời dựa trên thông tin được cung cấp.
  - Giải thích đầy đủ, rõ ràng, step-by-step nếu phù hợp.
  - Cuối câu trả lời **bắt buộc** liệt kê nguồn dưới dạng link (title + url/slug).
- Có nút “Xóa hội thoại”.

### 4.3. Admin Panel (bảo vệ bằng login)

**Login:** Chỉ 1 tài khoản admin (seed sẵn hoặc tạo lần đầu).

**Settings (`/admin/settings`):**
- Gemini API Key
- Groq API Key
- Model viết bài (dropdown)
- Model chatbot (dropdown)
- Lưu vào bảng `Setting`.

**Topics (`/admin/topics`):**
- Thêm / sửa / bật-tắt / xóa chủ đề.
- Danh sách này có thể dùng để tạo bài hàng loạt (admin chọn hoặc hệ thống lấy các topic active).

**Tạo bài viết (`/admin/posts/create`):**
- Input để nhập chủ đề + nút “Thêm chủ đề”.
- Danh sách chủ đề đã thêm (có thể xóa từng cái).
- Tùy chọn chung:
  - Giọng văn: Chuyên nghiệp rõ ràng | Thân thiện gần gũi | Ngắn gọn súc tích | Chi tiết giải thích kỹ
  - Độ dài: Ngắn (600–900 từ) | Trung bình (1000–1500) | Dài (1800–2500)
  - Hình minh họa: Có / Không
- Nút “Tạo X bản nháp” → gọi Gemini (có search) cho **từng chủ đề**.
- AI chỉ được chọn category trong danh sách cố định. Nếu không phù hợp → trả về `NEEDS_NEW_CATEGORY` và **không tạo draft**, thay vào đó thông báo cho admin biết để tự thêm danh mục mới rồi tạo lại.
- Progress hiển thị (1/X, 2/X…).
- Sau khi tạo xong các draft hợp lệ → chuyển sang danh sách draft hoặc mở editor.

**Danh sách bài & Editor:**
- Filter theo status (Draft / Published).
- Click vào bài → mở **BlockNote.js editor** để chỉnh sửa.
- Có nút Publish / Unpublish.
- Khi Publish: 
  1. Convert BlockNote JSON → Markdown.
  2. Chạy chunking (recursive, 512 tokens, overlap 50).
  3. Lưu vào `PostChunk`.
  4. Cập nhật `search_vector`.

**Danh sách chuyên mục cố định** (AI chỉ được chọn trong này):
1. Năng suất cá nhân
2. Soạn thảo & Viết lách
3. Phân tích dữ liệu
4. Họp hành & Ghi chú
5. Quản lý công việc
6. Dành cho quản lý
7. Tool & Prompt thực chiến
8. Khác

### 4.4. Tạo bài hàng loạt / Auto Generate (tùy chọn)

- **Cách chính (bắt buộc)**: Trong trang `/admin/posts/create`, admin tự nhập danh sách chủ đề → bấm tạo → hệ thống tạo **đúng số lượng** draft tương ứng với số chủ đề đã thêm.
- **Tùy chọn nâng cao (Phase sau)**: Có thể thêm API `/api/cron/generate-posts` (bảo vệ bằng `CRON_SECRET`) để chạy định kỳ. Khi đó API sẽ lấy các topic đang active trong bảng `Topic` và tạo draft theo danh sách đó (số lượng = số topic được chọn, không cố định 2 bài).
- Không có quy tắc cứng “mỗi ngày 2 bài”. Số bài tạo ra hoàn toàn phụ thuộc vào số chủ đề admin cung cấp.

---

## 5. Chunking Strategy (bắt buộc tuân thủ)

```ts
strategy = "recursive"
chunk_size = 512        // tokens
overlap = 50
separators = ["\n\n", "\n", ". ", " "]
```

Khi publish bài viết phải chạy chunking và lưu vào `PostChunk`.

---

## 6. AI Prompts (có thể chỉnh sửa trong code / Settings sau này)

> **Lưu ý:** Các prompt dưới đây là bản đề xuất. Nên lưu chúng ở dạng template (có thể để trong `lib/ai/prompts.ts` hoặc bảng Setting) để admin/dev dễ chỉnh sửa sau này mà không cần sửa logic.

### 6.1. Prompt viết bài (Gemini)

**System Prompt (đề xuất):**

```text
Bạn là biên tập viên chuyên viết hướng dẫn thực chiến về ứng dụng AI trong công việc hàng ngày cho blog "AI For Work".

Yêu cầu bắt buộc:
- Viết hoàn toàn bằng tiếng Việt.
- Văn phong: {{tone}} (ví dụ: chuyên nghiệp rõ ràng / thân thiện gần gũi / ngắn gọn súc tích / chi tiết giải thích kỹ).
- Độ dài mục tiêu: {{length}} (Ngắn ≈ 600-900 từ | Trung bình ≈ 1000-1500 từ | Dài ≈ 1800-2500 từ).
- Cấu trúc bài viết theo dạng hướng dẫn step-by-step thực tế, dễ áp dụng ngay.
- Có thể sử dụng khả năng search/grounding để lấy thông tin thực tế, chính xác.
- Cuối bài nên có mục "Tóm tắt nhanh" hoặc "Áp dụng ngay trong 5 phút".

Danh sách chuyên mục được phép sử dụng (chỉ được chọn 1):
1. Năng suất cá nhân
2. Soạn thảo & Viết lách
3. Phân tích dữ liệu
4. Họp hành & Ghi chú
5. Quản lý công việc
6. Dành cho quản lý
7. Tool & Prompt thực chiến
8. Khác

Quy tắc phân loại category:
- Bạn PHẢI chọn đúng 1 category nằm trong danh sách trên.
- Nếu chủ đề không phù hợp với bất kỳ category nào trong danh sách, hãy trả về category = "NEEDS_NEW_CATEGORY" và giải thích ngắn gọn lý do trong trường "category_reason".
- Tuyệt đối không tự tạo category mới ngoài danh sách.

Định dạng trả về (JSON):
{
  "title": "Tiêu đề bài viết hấp dẫn",
  "summary": "Tóm tắt 1-2 câu",
  "category": "Tên category hoặc NEEDS_NEW_CATEGORY",
  "category_reason": "Chỉ điền khi category = NEEDS_NEW_CATEGORY",
  "tags": ["tag1", "tag2", "tag3"],
  "source_urls": [{"url": "...", "title": "..."}],
  "content_markdown": "Toàn bộ nội dung bài viết ở định dạng Markdown"
}
```

**User Prompt (khi gọi):**

```text
Hãy viết bài hướng dẫn về chủ đề sau:

Chủ đề: {{topic}}

Yêu cầu thêm:
- Giọng văn: {{tone}}
- Độ dài: {{length}}
- Có kèm gợi ý hình minh họa: {{has_image}} (true/false)
```

**Xử lý phía backend khi nhận kết quả:**
- Nếu `category === "NEEDS_NEW_CATEGORY"` → không tạo draft, trả về thông báo cho admin:  
  “Chủ đề này chưa phù hợp với danh mục hiện có. Lý do: {category_reason}.  
  Vui lòng thêm danh mục mới trong phần Quản lý chuyên mục rồi tạo lại.”
- Nếu category hợp lệ → tiếp tục tạo draft bình thường.

### 6.2. Prompt Chatbot (Groq)

**System Prompt (đề xuất):**

```text
Bạn là trợ lý AI chính thức của blog "AI For Work" – trang hướng dẫn ứng dụng AI thực tế trong công việc hàng ngày.

Quy tắc cứng (bắt buộc tuân thủ):
1. Chỉ được trả lời dựa trên các đoạn thông tin (context) được cung cấp bên dưới.
2. Nếu thông tin không đủ để trả lời chính xác, hãy nói rõ và gợi ý người dùng xem các bài viết liên quan.
3. Trả lời bằng tiếng Việt, đầy đủ, dễ hiểu, ưu tiên cấu trúc rõ ràng (có thể dùng step-by-step nếu phù hợp).
4. Cuối mỗi câu trả lời BẮT BUỘC phải liệt kê nguồn tham khảo theo đúng định dạng:

**Nguồn tham khảo:**
- [Tiêu đề bài viết 1](/posts/slug-1)
- [Tiêu đề bài viết 2](/posts/slug-2)

5. Không bịa thông tin. Không trả lời kiến thức nằm ngoài context được cung cấp.
```

**Khi gọi API:**
- Gửi kèm: system prompt + 6-8 tin nhắn gần nhất (nếu có) + các chunk liên quan nhất từ full-text search.

### 6.3. Convert BlockNote → Markdown (đề xuất cách làm)

- Sử dụng hàm có sẵn của BlockNote hoặc thư viện `@blocknote/core` / `blocknote-to-markdown` (nếu có) để export.
- Nếu không có sẵn, viết helper đơn giản: duyệt qua các block (paragraph, heading, bulletListItem, numberedListItem, codeBlock…) và convert sang Markdown tương ứng.
- Sau khi có Markdown → mới chạy chunking và lưu `contentMd` + `PostChunk`.

---

## 7. Cấu trúc thư mục đề xuất

```
src/
├── app/
│   ├── (public)/
│   │   ├── page.tsx                 # Trang chủ
│   │   ├── posts/
│   │   │   ├── page.tsx             # Danh sách bài
│   │   │   └── [slug]/page.tsx     # Chi tiết bài
│   │   └── layout.tsx
│   ├── admin/
│   │   ├── login/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── posts/
│   │   ├── topics/
│   │   ├── settings/page.tsx
│   │   └── layout.tsx
│   └── api/
│       ├── chat/route.ts
│       ├── admin/
│       └── cron/generate-posts/route.ts
├── components/
│   ├── chat/                        # Floating button + Sidebar
│   ├── editor/                      # BlockNote wrapper
│   ├── blog/
│   ├── admin/
│   └── ui/                          # shadcn
├── lib/
│   ├── prisma.ts
│   ├── ai/
│   │   ├── gemini.ts
│   │   └── groq.ts
│   ├── search.ts                    # full-text helpers
│   ├── chunking.ts
│   └── auth.ts
└── styles/
```

---

## 8. Lộ trình triển khai (Phases)

### Phase 1 – Foundation
- [ ] Khởi tạo Next.js 15 + TypeScript + Tailwind + shadcn/ui
- [ ] Setup Prisma + PostgreSQL schema
- [ ] Seed admin account
- [ ] Auth admin (login / logout / middleware bảo vệ /admin)
- [ ] Trang Settings (lưu Gemini key, Groq key, model)

### Phase 2 – Blog & Editor
- [ ] CRUD Post cơ bản
- [ ] Tích hợp BlockNote.js (editor + render)
- [ ] Trang public: Home, List posts, Single post
- [ ] Chunking khi publish + full-text search setup

### Phase 3 – AI Core
- [ ] Trang tạo nhiều bài viết (thêm chủ đề → tạo đúng số draft)
- [ ] Gemini integration (search + viết bài + tự gán category)
- [ ] Chatbot floating + sidebar
- [ ] Groq integration + retrieval + context ngắn
- [ ] Nút xóa hội thoại

### Phase 4 – Polish & Extra
- [ ] GSAP animations (scroll, chatbot, page transition)
- [ ] Three.js Hero (nhẹ, tối ưu performance)
- [ ] Dark mode hoàn chỉnh
- [ ] Quản lý Topics
- [ ] API hỗ trợ tạo bài hàng loạt từ danh sách Topic (có thể gọi tay hoặc qua cron)
- [ ] SEO cơ bản (metadata, sitemap, OpenGraph)
- [ ] Loading states, error handling, empty states đẹp

---

## 9. Yêu cầu UI/UX bắt buộc

- **Dark mode mặc định**.
- Phong cách: Minimal, sạch sẽ, cao cấp (Notion + Linear vibe).
- Hero trang chủ: có Three.js (không được làm chậm LCP quá nhiều).
- Chatbot: luôn hiện floating button, animation mượt khi mở/đóng.
- Admin: tập trung vào sự rõ ràng và tốc độ thao tác, không cần quá nhiều hiệu ứng.
- Responsive tốt (mobile vẫn dùng chatbot được).

---

## 10. Biến môi trường cần thiết

```env
DATABASE_URL=
ADMIN_EMAIL=
ADMIN_PASSWORD=          # chỉ dùng để seed
JWT_SECRET=
CRON_SECRET=
NEXT_PUBLIC_APP_URL=
```

API Key Gemini & Groq **không** để trong `.env` mà để admin nhập trong Settings (lưu database).

---

## 11. Tiêu chí hoàn thành MVP

- Có thể login admin và cấu hình API key + model.
- Có thể thêm nhiều chủ đề và tạo đúng số lượng draft bằng Gemini.
- Có thể edit draft bằng BlockNote và publish.
- Blog public hiển thị bài viết đẹp.
- Chatbot hoạt động, trả lời dựa trên nội dung blog và có dẫn nguồn.
- Chatbot nhớ context ngắn trong session.
- UI Dark mode, có GSAP cơ bản và Hero có Three.js.

---

**Ghi chú cho Codex:**
- Ưu tiên code sạch, type-safe, tách biệt concern rõ ràng.
- Mọi gọi AI phải handle lỗi và rate limit một cách lịch sự.
- Khi implement full-text search tiếng Việt, ưu tiên trải nghiệm thực tế hơn là độ chính xác tuyệt đối.
- Viết comment rõ ràng ở những chỗ quan trọng (chunking, retrieval, prompt).

Chúc bạn code vui vẻ!  
Sau khi hoàn thành Phase 1–3 có thể quay lại để tối ưu performance và thêm tính năng Phase 4.
