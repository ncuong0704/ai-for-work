# Kết quả kiểm tra AI For Work

Ngày kiểm tra: 31/10/2026, môi trường Windows, Node.js 22.12.0, Next.js 15.5.28, PostgreSQL 18.6 riêng trong workspace.

| Kiểm tra | Kết quả |
| --- | --- |
| `npm test` | 26 test qua (gồm tạo bài Groq JSON mode, từ chối bài bị cắt, nguồn chưa xác minh và lỗi provider không lộ khóa) |
| `npm run typecheck` | Qua, không lỗi TypeScript |
| `npx prisma validate` | Schema hợp lệ |
| `npm run test:integration` | 14 kiểm tra qua trên PostgreSQL thật, gồm hai model độc lập cho tạo bài/chatbot và giữ khóa khi lưu trống |
| `npm run build` | Production build thành công |
| `npm run start` | Standalone server khởi động, phục vụ được localhost IPv4/IPv6 |
| `npm run test:smoke`, bật `SMOKE_MUTATIONS=1` | 19 nhóm kiểm tra HTTP qua, gồm hiển thị/lưu hai model riêng, giữ khóa khi để trống và từ chối model ID trống |
| `npm audit` và `npm audit --omit=dev` | 0 lỗ hổng được báo tại thời điểm kiểm tra |

Các kiểm tra HTTP xác nhận trang chủ, thư viện, login, sitemap và robots hoạt động; chặn truy cập admin ẩn danh và request khác Origin; đăng nhập bằng admin đã seed; API Settings không trả khóa; tạo nháp và mở editor; nháp không lộ nội dung ra public; publish hiển thị bài cùng bảng và prompt placeholder; unpublish ẩn bài; chat lưu lịch sử, không chấp nhận session ID thiếu capability cookie; xóa hội thoại và dọn fixture.

Unit/integration tests bao gồm: giới hạn chunk 512 token/overlap 50, Unicode tiếng Việt, mã hóa khóa, token hết hạn/giả mạo/sai scope, JSON/table BlockNote sau serialization, lưu xung đột nhiều tab, thay thế/xóa chỉ mục khi publish/edit/unpublish, bỏ dấu và chữ hoa dưới locale C, đúng số lần tạo theo chủ đề, từ chối category và AI response lỗi, retry không lặp draft đã lưu, giới hạn lịch sử, giới hạn request, không gọi AI khi retrieval trống và chỉ render link nguồn từ các bài đã truy xuất.

Model tạo bài và chatbot được kiểm tra bằng hai ID khác nhau: mỗi luồng gửi đúng model đã lưu, cùng khóa Groq; lưu khóa trống giữ nguyên credential. Migration trên database ứng dụng đã xác nhận chuyển model cũ sang cả hai vai trò, không thay đổi khóa hay số lượng bài viết.

Một lượt review mã nguồn độc lập đã được thực hiện. Các lỗi phát hiện về bảng, block không hỗ trợ, retry batch, literal prompt và các dạng link trích dẫn đã được sửa. Các trường hợp mất nội dung bảng, prompt placeholder và link trích dẫn có kiểm tra hồi quy. Client giữ lại request ID khi retry batch không đổi đầu vào.

## Giới hạn xác minh

- Đã chuyển toàn bộ AI sang Groq theo yêu cầu người dùng. Với khóa/model Groq đã lưu, tạo bài JSON và trả lời RAG có nguồn blog đều thành công qua API thật. Kiểm tra thêm qua HTTP `/api/admin/generate`: nhận tiến độ, lưu đúng một bản nháp và mở được editor; bản nháp kiểm tra đã được xóa. Migration xóa cài đặt nhà cung cấp cũ, xác nhận nguyên vẹn hai bản ghi cấu hình Groq và số lượng bài viết. Các test tự động dùng HTTP giả lập; tạo bài không tự truy cập web hay xác minh nguồn trực tuyến.
- Không kiểm tra trực quan bằng trình duyệt: công cụ báo browser access host không khả dụng. HTTP và render Markdown phía server đã được kiểm tra; cần xem thêm bố cục, thao tác editor, WebGL và animation trên thiết bị thật.
- Chưa deploy hoặc đo tải trên Matbao Vibe Host; đã chuẩn bị standalone server, Dockerfile, migration và hướng dẫn cấu hình.
- HTTP streaming của Next.js có thể trả status 200 cho giao diện not-found. Smoke test xác minh bài draft không xuất hiện và trang có `noindex`, thay vì suy luận quyền truy cập chỉ từ status. Tham khảo [Next.js not-found](https://nextjs.org/docs/15/app/api-reference/file-conventions/not-found).

PostgreSQL và tài khoản admin local đã được khởi tạo. Mật khẩu/secret nằm trong `.env` được gitignore, không ghi vào báo cáo. Không seed bài mẫu hoặc khóa provider. Các fixture trong kiểm tra HTTP đã bị xóa.
