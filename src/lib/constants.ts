export const DEFAULT_CATEGORIES = [
  "Năng suất cá nhân",
  "Soạn thảo & Viết lách",
  "Phân tích dữ liệu",
  "Họp hành & Ghi chú",
  "Quản lý công việc",
  "Dành cho quản lý",
  "Tool & Prompt thực chiến",
  "Khác",
];
export const GROQ_MODELS = [
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
];
export const TONES = [
  "Chuyên nghiệp rõ ràng",
  "Thân thiện gần gũi",
  "Ngắn gọn súc tích",
  "Chi tiết giải thích kỹ",
] as const;
export const LENGTHS = [
  "Ngắn (600–900 từ)",
  "Trung bình (1000–1500 từ)",
  "Dài (1800–2500 từ)",
] as const;
export const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
).replace(/\/$/, "");
