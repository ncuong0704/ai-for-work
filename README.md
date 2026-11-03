# AI For Work

Blog tiếng Việt về ứng dụng AI trong công việc, có quản trị nội dung, tạo bản nháp hàng loạt và chatbot RAG bằng Groq. Theo yêu cầu cập nhật, Groq là nhà cung cấp AI duy nhất, thay thế phần Gemini trong [kế hoạch ban đầu](docs/AI-For-Work-Project-Plan.md).

## Chạy tại máy

Yêu cầu Node.js 22.12 trở lên và PostgreSQL 17/18. Cài dependency:

```sh
npm ci
```

Nếu chưa có PostgreSQL, mở một terminal và giữ lệnh sau chạy:

```sh
npm run db:local
```

Lệnh này khởi chạy PostgreSQL riêng tại `127.0.0.1:55432`, lưu dữ liệu trong `.local/postgres`, đồng thời tạo `.env` với mật khẩu và secret ngẫu nhiên nếu file chưa tồn tại. Nó chỉ phục vụ môi trường phát triển, không cài system service và không thay đổi PostgreSQL có sẵn.

Trong terminal khác:

```sh
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Mở <http://localhost:3000>. Đăng nhập tại `/admin/login` bằng `ADMIN_EMAIL` và `ADMIN_PASSWORD` trong `.env`. Seed chỉ tạo **một** admin và không đặt lại mật khẩu tài khoản đã tồn tại. Không có đăng ký công khai hay mật khẩu mặc định trong mã nguồn.

Nếu dùng PostgreSQL riêng, sao chép `.env.example` thành `.env`, điền `DATABASE_URL`, email/mật khẩu admin, `JWT_SECRET` ít nhất 32 ký tự và `CRON_SECRET` ít nhất 24 ký tự; sau đó chạy generate/migrate/seed như trên. Có thể dùng database trong `compose.yaml` với biến `POSTGRES_PASSWORD` do bạn đặt.

## Dùng ứng dụng

1. Vào **Cài đặt AI**, nhập API key Groq, chọn **Model tạo bài viết** và **Model chatbot** riêng rồi lưu. Model tạo bài dùng cho tạo nháp, phân loại và cron, cần hỗ trợ JSON mode. Model chatbot dùng để trả lời từ nội dung blog. Cả hai dùng chung API key; để trống trường khóa khi lưu để giữ nguyên khóa cũ. Khi nâng cấp, model đang lưu được chuyển sang cả hai lựa chọn.
2. Vào **Chủ đề & chuyên mục**, lưu các ý tưởng và bật/tắt chủ đề. Tám chuyên mục gốc được seed; có thể thêm chuyên mục để xử lý trường hợp `NEEDS_NEW_CATEGORY`.
3. Vào **Tạo bài với AI**, thêm từng chủ đề hoặc dán nhiều dòng. Chọn giọng văn, độ dài và gợi ý hình minh họa, rồi tạo bản nháp. Mỗi chủ đề được xử lý riêng theo thứ tự, có tiến độ và thông báo lỗi. Giới hạn 50 chủ đề/lần để tránh quá tải máy chủ nhỏ. Chủ đề trùng nhau vẫn là các mục riêng.
4. Mở bản nháp bằng BlockNote, biên tập và **Xuất bản**. Có thể viết bài thủ công, xuất Markdown, lưu sửa đổi, gỡ xuất bản hoặc xóa bài. Thay đổi chưa lưu có cảnh báo khi đóng tab; lưu đồng thời ở nhiều tab được bảo vệ bằng kiểm tra phiên bản.
5. Blog chỉ hiển thị bài đã xuất bản. Chatbot lấy tối đa sáu chunk từ các bài đó, gửi tối đa tám tin nhắn lịch sử cho Groq và gắn nguồn bài viết từ kết quả truy xuất.

Lựa chọn hình minh họa tạo **gợi ý bằng chữ**, theo prompt trong đặc tả; không gọi dịch vụ sinh ảnh. Ảnh bìa có thể nhập bằng URL HTTP/HTTPS. Editor không tải file lên máy chủ. JSON BlockNote là nội dung gốc; bộ chuyển Markdown hỗ trợ heading, đoạn văn có định dạng, link, list, checklist, code, quote, bảng và ảnh. Các định dạng Markdown phức tạp ngoài nhóm này cần biên tập lại sau khi tạo nháp.

Bản nháp do Groq tạo không tự truy cập web hay xác minh nguồn trực tuyến. AI không được tự điền danh sách nguồn tham khảo; biên tập viên cần kiểm chứng và bổ sung nguồn trước khi xuất bản. Migration chuyển sang Groq xóa hai cài đặt Gemini cũ, giữ nguyên khóa/model Groq và bài viết hiện có.

## Tìm kiếm và hội thoại

- Chunking recursive dùng tokenizer `cl100k_base`, tối đa **512 token**, overlap **50 token**, ưu tiên `\n\n`, `\n`, `. `, ` `. Biên Unicode được giữ nguyên; ở vị trí cắt giữa các byte của một ký tự, overlap được rút ngắn tới biên ký tự hợp lệ.
- Migration tạo generated `tsvector`, hàm bỏ dấu tiếng Việt và GIN index. Retrieval dùng `simple`, `ts_rank` và OR giữa từ khóa, không cần vector hoặc embedding. Đây là xếp hạng lexical PostgreSQL theo yêu cầu, không phải công thức BM25 chính xác. Thanh tìm bài viết dùng tiêu đề/tóm tắt/tag; RAG truy xuất toàn bộ chunk.
- Publish, sửa bài public và gỡ xuất bản cập nhật/xóa chunk trong cùng transaction. Chỉ truy xuất bài `PUBLISHED` ngay cả khi còn chunk cũ.
- Session ID được ghi localStorage, nhưng quyền truy cập hội thoại cần cookie HttpOnly ký riêng, không dựa vào ID do client tự gửi. Cookie hết hạn sau 30 ngày; tối đa 16 tin nhắn được lưu mỗi phiên. Phiên không hoạt động 30 ngày và rate-limit record hết hạn được dọn khi mở phiên mới. Có nút xóa hội thoại.
- Nếu không tìm được nội dung liên quan, chatbot trả lời rõ giới hạn mà không gọi AI. Câu trả lời có context được bổ sung nguồn bằng mã máy chủ; model vẫn có thể diễn giải sai, nên người đọc cần đối chiếu bài gốc.
- API key được mã hóa AES-256-GCM bằng khóa dẫn xuất từ `JWT_SECRET`, không trả về client hoặc lưu trong biến public. Sao lưu secret cùng cơ sở dữ liệu; thay secret cần nhập lại API key và đăng nhập lại.

## Kiểm tra

```sh
npm test
npm run typecheck
npm run test:integration
npm run build
npm run start
npm run test:smoke
npm audit
```

Integration tests chạy migration trên database **riêng có hậu tố `_test`**. Với `db:local`, database `aiforwork_test` được tạo sẵn. Nếu dùng server riêng, tạo database test rồi đặt `TEST_DATABASE_URL` trước khi chạy. Bộ test xóa fixture trong database test, không đụng database ứng dụng. Các kiểm tra Groq dùng HTTP giả lập có cấu trúc API thực, không tiêu thụ API key hay chi phí. Cần kiểm tra thêm đầu cuối với key thật từ Settings trước khi đưa vào vận hành.

Kết quả đã chạy và giới hạn xác minh nằm trong [báo cáo kiểm tra](docs/Verification.md). Đặt `SMOKE_MUTATIONS=1` khi chạy smoke test để kiểm tra thêm tạo/publish/unpublish và chat bằng fixture tự dọn; mặc định chỉ kiểm tra đọc trang và xác thực.

## Deploy Matbao Vibe Host

Ứng dụng dùng Node.js server, không phải static export. Chưa cấu hình hay kết nối tài khoản hosting; các bước dưới đây áp dụng khi gói của bạn cho phép Next.js và PostgreSQL như đặc tả.

1. Tạo PostgreSQL, điền các biến theo `.env.example` trong dashboard hosting; `DATABASE_URL` nên có `connection_limit=3` và dùng TLS nếu nhà cung cấp yêu cầu.
2. Đặt `NEXT_PUBLIC_APP_URL` thành URL HTTPS thật **trước khi build**. Giữ nguyên `JWT_SECRET` giữa các lần deploy. API key chỉ nhập trong Settings sau đăng nhập.
3. Cài và build: `npm ci`, `npm run db:generate`, `npm run db:migrate`, `npm run db:seed`, `npm run build`. Seed cần `ADMIN_EMAIL` và `ADMIN_PASSWORD`; sau khi seed có thể bỏ `ADMIN_PASSWORD` khỏi môi trường runtime.
4. Lệnh chạy trên host có mã nguồn: `npm start` (đọc biến `PORT` của host). Không cần chỉnh Start Command nếu host đã tự chạy `npm start`; `npm run start:deploy` cũng gọi cùng lệnh này. Lệnh áp dụng migration trước, chỉ mở web khi migration thành công; Prisma CLI nằm trong production dependencies để không bị loại khi cài `--omit=dev`. Script tự chuẩn bị tài nguyên static và chạy standalone server. Dockerfile đóng gói cả Prisma CLI/schema/migrations và cũng chạy migration trước `server.js`. Database phải truy cập được từ container lúc khởi động. Nếu chỉ chuyển thư mục standalone lên host: phải chạy `npm run db:migrate` từ bản mã nguồn có `DATABASE_URL` trỏ đúng database của host trước; sau đó sao chép `.next/static` vào `.next/standalone/.next/static` rồi chạy `node .next/standalone/server.js`. Bản standalone riêng không chứa công cụ migration.
5. Proxy cần giữ nguyên Origin, hỗ trợ response streaming, tắt buffering cho `/api/admin/generate`, cho phép thời gian chờ đủ dài và giới hạn request body 1 MB. Với danh sách dài, tăng timeout theo số chủ đề hoặc chia batch nhỏ. Mỗi chủ đề có timeout 90 giây; route khai báo 300 giây nhưng giới hạn thực do host quyết định.
6. Bắt buộc proxy **ghi đè** `X-Real-IP`/`X-Forwarded-For` từ client, vì rate limit dùng IP từ proxy. Có thể thêm giới hạn IP ở edge. Không công khai trực tiếp cổng Node hoặc PostgreSQL.
7. Build có thể dùng nhiều hơn 1 GB RAM, nên build tại máy/CI hoặc tăng RAM cho giai đoạn build. Runtime giới hạn pool DB, không dùng vector, tải editor/Three.js riêng và chỉ render hero tối đa 30 fps khi đang nhìn thấy. Chưa đo tải thực tế trên gói Starter.
8. Sao lưu PostgreSQL và secret, bật HTTPS, chạy `npm run test:smoke` sau deploy (cần biến admin nếu muốn kiểm tra đăng nhập). Cookie production có `Secure` nên cần HTTPS, kể cả khi tự chạy production ở localhost. `npm run dev` dùng HTTP được.

Hướng dẫn triển khai Next.js: [Self-hosting](https://nextjs.org/docs/app/guides/self-hosting). Tích hợp AI tham chiếu [Groq Chat API](https://console.groq.com/docs/api-reference) và [Groq JSON mode](https://console.groq.com/docs/structured-outputs). Các model có thể thay đổi; Settings cho phép nhập model ID mới.

## API tạo bài theo lịch (tùy chọn)

`POST /api/cron/generate-posts`, header `Authorization: Bearer <CRON_SECRET>`, body:

```json
{
  "requestId": "một UUID mới cho mỗi batch",
  "topicIds": ["id-chủ-đề-đang-bật"]
}
```

Bỏ `topicIds` để lấy toàn bộ topic active (tối đa 50). Không có giới hạn cố định hai bài/ngày. Gọi lại **cùng requestId và cùng thứ tự topic** sẽ không tạo lại những bản nháp đã lưu. Host cần cho phép request dài. API này chỉ là công cụ, chưa tự đăng ký lịch cron.
