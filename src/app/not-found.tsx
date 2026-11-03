import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="container standalone-state">
      <span className="state-code">404</span>
      <h1>Trang này đã đi một lối khác.</h1>
      <p>Bài viết có thể chưa được xuất bản hoặc liên kết không còn tồn tại.</p>
      <Link href="/" className="button button-primary">
        Về trang chủ
      </Link>
    </main>
  );
}
