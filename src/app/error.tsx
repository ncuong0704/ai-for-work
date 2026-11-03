"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="container standalone-state">
      <h1>Chưa thể tải nội dung.</h1>
      <p>Kiểm tra kết nối cơ sở dữ liệu hoặc thử lại sau một lát.</p>
      <button className="button button-primary" onClick={reset}>
        Thử lại
      </button>
    </main>
  );
}
