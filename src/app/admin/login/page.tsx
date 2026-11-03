import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { LoginForm } from "@/components/admin/login-form";
import { currentAdmin } from "@/lib/auth";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Đăng nhập quản trị",
  robots: { index: false, follow: false },
};
export default async function Login() {
  if (await currentAdmin()) redirect("/admin/dashboard");
  return (
    <main id="main" className="login-page">
      <div className="login-brand">
        <Brand />
      </div>
      <div className="login-card">
        <span className="workspace-label">DÀNH CHO BIÊN TẬP VIÊN</span>
        <h1>
          Ý tưởng tiếp theo
          <br />
          bắt đầu tại đây.
        </h1>
        <p>Đăng nhập để xây dựng kho kiến thức AI For Work.</p>
        <LoginForm />
      </div>
      <Link href="/" className="back-link">
        ← Quay lại website
      </Link>
    </main>
  );
}
