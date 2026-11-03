export default function Loading() {
  return (
    <div className="loading-page" role="status">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-panel" />
      <span className="sr-only">Đang tải bàn biên tập...</span>
    </div>
  );
}
