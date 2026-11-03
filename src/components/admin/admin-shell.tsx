"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  DashboardIcon,
  ReaderIcon,
  PlusCircledIcon,
  BookmarkIcon,
  GearIcon,
  ExitIcon,
  ArrowTopRightIcon,
} from "@radix-ui/react-icons";
import { Brand } from "../brand";
import { api } from "@/lib/client";
import { useState } from "react";
const links = [
  { href: "/admin/dashboard", label: "Tổng quan", icon: DashboardIcon },
  { href: "/admin/posts", label: "Bài viết", icon: ReaderIcon },
  {
    href: "/admin/posts/create",
    label: "Tạo bài với AI",
    icon: PlusCircledIcon,
  },
  { href: "/admin/topics", label: "Chủ đề & chuyên mục", icon: BookmarkIcon },
  { href: "/admin/settings", label: "Cài đặt AI", icon: GearIcon },
];
export function AdminShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [error, setError] = useState("");
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Brand />
        <span className="workspace-label">BÀN BIÊN TẬP</span>
        <nav aria-label="Quản trị">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={
                pathname === href ||
                (href === "/admin/posts" &&
                  pathname.startsWith(href) &&
                  !pathname.endsWith("create"))
                  ? "active"
                  : ""
              }
            >
              <Icon />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link href="/" target="_blank">
            Xem website <ArrowTopRightIcon />
          </Link>
          <span className="admin-email">{email}</span>
          <button
            onClick={async () => {
              try {
                await api("/api/admin/logout", "POST");
                router.push("/admin/login");
                router.refresh();
              } catch {
                setError("Chưa thể đăng xuất. Vui lòng thử lại.");
              }
            }}
          >
            <ExitIcon /> Đăng xuất
          </button>
          {error && <p className="form-message error">{error}</p>}
        </div>
      </aside>
      <main id="main" className="admin-main">
        {children}
      </main>
    </div>
  );
}
