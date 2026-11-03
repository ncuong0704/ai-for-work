import Link from "next/link";
import { Brand } from "../brand";
export function Footer() {
  return (
    <footer className="site-footer container">
      <div>
        <Brand />
        <p>
          Từ ý tưởng đến thao tác.
          <br />
          Một cách làm việc thông minh hơn, mỗi ngày.
        </p>
      </div>
      <div className="footer-links">
        <Link href="/posts">Khám phá bài viết</Link>
        <Link href="/admin">Dành cho biên tập viên</Link>
        <span>© {new Date().getFullYear()} AI For Work</span>
      </div>
    </footer>
  );
}
