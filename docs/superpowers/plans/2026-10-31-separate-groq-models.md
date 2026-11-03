# Chọn model Groq riêng cho từng tính năng

Yêu cầu: cho admin chọn model riêng cho chatbot và tạo bài viết.

Giữ một API key Groq mã hóa, lưu hai model ID `groqChatModel` và `groqWritingModel`. Tạo nháp, phân loại và cron dùng model tạo bài; RAG dùng model chatbot. Settings cho phép chọn gợi ý hoặc nhập ID. Migration chuyển model đang lưu sang cả hai vai trò, không ghi đè cấu hình riêng đã có và không thay đổi khóa/bài viết.

- [x] Viết kiểm tra trên PostgreSQL thật: hai model khác nhau được lưu, mỗi luồng gửi đúng model, để trống khóa vẫn giữ nguyên; xác nhận thất bại với mã cũ.
- [x] Cập nhật service, callers, API, hai trường chọn model và tài liệu.
- [x] 14 integration check, 26 unit test và TypeScript qua.
- [x] Production build thành công; migration giữ model cũ cho cả hai vai trò, không đổi API key và bài viết. Web local được khởi động lại; 19 nhóm HTTP smoke qua, gồm hai ô model, lưu cấu hình và từ chối ID trống. Review độc lập không có phát hiện cần sửa.
