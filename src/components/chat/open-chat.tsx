"use client";
export function openChat(question = "") {
  window.dispatchEvent(new CustomEvent("afw:chat", { detail: question }));
}
export function OpenChat({
  children,
  question = "",
  className = "",
}: {
  children: React.ReactNode;
  question?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => openChat(question)}
    >
      {children}
    </button>
  );
}
