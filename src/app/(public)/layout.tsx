import { Header } from "@/components/blog/header";
import { Footer } from "@/components/blog/footer";
import { ChatWidget } from "@/components/chat/chat-widget";
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <ChatWidget />
    </>
  );
}
