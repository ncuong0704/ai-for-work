"use client";
import { useState } from "react";
import {
  CheckIcon,
  LockClosedIcon,
  MixerHorizontalIcon,
} from "@radix-ui/react-icons";
import { GROQ_MODELS } from "@/lib/constants";
import { api, errorMessage } from "@/lib/client";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
interface Settings {
  groqConfigured: boolean;
  groqWritingModel: string;
  groqChatModel: string;
}
export function SettingsForm({ initial }: { initial: Settings }) {
  const [settings, setSettings] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  return (
    <form
      className="settings-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = new FormData(form);
        setPending(true);
        setError("");
        setSuccess(false);
        try {
          const result = await api<Settings>(
            "/api/admin/settings",
            "PUT",
            Object.fromEntries(data.entries()),
          );
          setSettings(result);
          (form.elements.namedItem("groqKey") as HTMLInputElement).value = "";
          setSuccess(true);
        } catch (err) {
          setError(errorMessage(err));
        } finally {
          setPending(false);
        }
      }}
    >
      <section className="admin-panel provider-panel">
        <div className="provider-heading">
          <div className="provider-symbol">
            <MixerHorizontalIcon />
          </div>
          <div>
            <h2>Groq</h2>
            <p>
              Tạo bản nháp, chọn chuyên mục và trả lời câu hỏi từ nội dung blog.
            </p>
          </div>
          <span
            className={`status-badge ${settings.groqConfigured ? "published" : ""}`}
          >
            {settings.groqConfigured ? "Đã cấu hình" : "Chưa kết nối"}
          </span>
        </div>
        <div className="settings-fields">
          <label>
            API key
            <Input
              type="password"
              name="groqKey"
              autoComplete="new-password"
              placeholder={
                settings.groqConfigured
                  ? "Đã lưu khóa. Để trống để giữ nguyên."
                  : "Nhập API key Groq"
              }
              maxLength={500}
            />
            <small>
              Khóa được mã hóa trong cơ sở dữ liệu và chỉ dùng trên máy chủ.
            </small>
          </label>
          {([
            {
              name: "groqWritingModel",
              label: "Model tạo bài viết",
              hint: "Dùng cho tạo nháp, chọn chuyên mục và tạo bài theo lịch. Cần hỗ trợ JSON mode.",
            },
            {
              name: "groqChatModel",
              label: "Model chatbot",
              hint: "Dùng để trả lời câu hỏi dựa trên nội dung blog đã xuất bản.",
            },
          ] as const).map(({ name, label, hint }) => (
            <label key={name}>
              {label}
              <Input
                name={name}
                list="groq-models"
                defaultValue={settings[name]}
                required
                maxLength={100}
              />
              <small>{hint} Chọn gợi ý hoặc nhập model ID tài khoản hỗ trợ.</small>
            </label>
          ))}
          <datalist id="groq-models">
            {GROQ_MODELS.map((model) => (
              <option value={model} key={model} />
            ))}
          </datalist>
        </div>
      </section>
      <div className="settings-footer">
        <p>
          <LockClosedIcon /> Đổi JWT_SECRET sẽ cần nhập lại các khóa API đã lưu.
        </p>
        <Button disabled={pending} type="submit">
          {pending ? "Đang lưu..." : "Lưu cài đặt"}
          <CheckIcon />
        </Button>
      </div>
      {error && (
        <p className="form-message error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="form-message success" role="status">
          Đã lưu cài đặt. API key không được gửi trở lại trình duyệt.
        </p>
      )}
    </form>
  );
}
