import type { Metadata, Viewport } from "next";
import "@fontsource-variable/geist";
import "./globals.css";
import { APP_URL } from "@/lib/constants";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "AI For Work | Làm việc thông minh hơn",
    template: "%s | AI For Work",
  },
  description:
    "Hướng dẫn ứng dụng AI vào công việc hàng ngày. Từ ý tưởng đến thao tác, từng bước thực tế bằng tiếng Việt.",
  openGraph: { locale: "vi_VN", type: "website", siteName: "AI For Work" },
  twitter: { card: "summary_large_image" },
};
export const viewport: Viewport = {
  themeColor: "#0b0f0e",
  width: "device-width",
  initialScale: 1,
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className="dark">
      <body>
        <a className="skip-link" href="#main">
          Bỏ qua đến nội dung
        </a>
        {children}
      </body>
    </html>
  );
}
