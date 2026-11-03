"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, LockClosedIcon } from "@radix-ui/react-icons";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { api, errorMessage } from "@/lib/client";
export function LoginForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <form
      className="form-stack"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setPending(true);
        setError("");
        try {
          await api("/api/admin/login", "POST", {
            email: form.get("email"),
            password: form.get("password"),
          });
          router.replace("/admin/dashboard");
          router.refresh();
        } catch (err) {
          setError(errorMessage(err));
        } finally {
          setPending(false);
        }
      }}
    >
      <label>
        Email quản trị
        <Input
          name="email"
          type="email"
          autoComplete="username"
          required
          placeholder="admin@example.com"
        />
      </label>
      <label>
        Mật khẩu
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={256}
          placeholder="Nhập mật khẩu của bạn"
        />
      </label>
      {error && (
        <p className="form-message error" role="alert">
          {error}
        </p>
      )}
      <Button disabled={pending} type="submit">
        {pending ? "Đang đăng nhập..." : "Vào bàn biên tập"}
        <ArrowRightIcon />
      </Button>
      <p className="login-note">
        <LockClosedIcon /> Chỉ dành cho tài khoản quản trị đã được khởi tạo.
      </p>
    </form>
  );
}
