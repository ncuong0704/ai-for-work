export default function Loading() {
  return (
    <div
      className="container loading-page"
      role="status"
      aria-label="Đang tải nội dung"
    >
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-line" />
      <div className="skeleton skeleton-panel" />
      <span className="sr-only">Đang tải...</span>
    </div>
  );
}
