import Link from "next/link";
import { ArrowTopRightIcon } from "@radix-ui/react-icons";
import { Brand } from "../brand";
import { OpenChat } from "../chat/open-chat";
export function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Brand />
        <nav aria-label="Điều hướng chính">
          <Link href="/posts">Bài viết</Link>
          <Link href="/posts#categories" className="nav-categories">
            Chuyên mục
          </Link>
          <OpenChat className="nav-chat">
            Hỏi trợ lý AI <ArrowTopRightIcon />
          </OpenChat>
        </nav>
      </div>
    </header>
  );
}
