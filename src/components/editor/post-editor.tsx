"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowTopRightIcon,
  CheckIcon,
  PaperPlaneIcon,
  TrashIcon,
  ReloadIcon,
  DownloadIcon,
} from "@radix-ui/react-icons";
import type { ContentBlock } from "@/lib/validation";
import { api, errorMessage } from "@/lib/client";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
const BlockEditor = dynamic(() => import("./block-editor"), {
  ssr: false,
  loading: () => (
    <div className="editor-loading">
      <ReloadIcon className="spin" /> Đang mở editor...
    </div>
  ),
});
export interface EditablePost {
  id: string;
  title: string;
  summary: string | null;
  category: string | null;
  tags: string[];
  coverImage: string | null;
  contentJson: ContentBlock[];
  status: "DRAFT" | "PUBLISHED";
  updatedAt: string;
  slug: string;
}
export function PostEditor({
  post,
  categories,
}: {
  post: EditablePost | null;
  categories: string[];
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(post);
  const [title, setTitle] = useState(post?.title || "");
  const [summary, setSummary] = useState(post?.summary || "");
  const [category, setCategory] = useState(post?.category || categories[0]);
  const [tags, setTags] = useState(post?.tags.join(", ") || "");
  const [coverImage, setCoverImage] = useState(post?.coverImage || "");
  const document = useRef<ContentBlock[]>(
    post?.contentJson || [{ type: "paragraph", content: [] }],
  );
  const [pending, setPending] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function save(status: "DRAFT" | "PUBLISHED") {
    setPending(true);
    setError("");
    setSuccess("");
    try {
      const result = await api<EditablePost>(
        current ? `/api/admin/posts/${current.id}` : "/api/admin/posts",
        current ? "PUT" : "POST",
        {
          title,
          summary,
          category,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          coverImage,
          contentJson: document.current,
          status,
          updatedAt: current?.updatedAt,
        },
      );
      setCurrent(result);
      setDirty(false);
      setSuccess(
        status === "PUBLISHED"
          ? "Đã xuất bản và cập nhật chỉ mục tìm kiếm cho chatbot."
          : "Đã lưu bản nháp. Bài chưa hiển thị công khai.",
      );
      if (!current) router.replace(`/admin/posts/${result.id}`);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }
  return (
    <fieldset
      disabled={pending}
      className="editor-fieldset"
      aria-label="Biên tập bài viết"
    >
      <Link className="back-link" href="/admin/posts">
        <ArrowLeftIcon /> Danh sách bài viết
      </Link>
      <header className="admin-page-header editor-header">
        <div>
          <h1>
            {post ? "Để ý tưởng thật rõ ràng." : "Viết điều hữu ích tiếp theo."}
          </h1>
          <span
            className={`status-badge ${current?.status === "PUBLISHED" ? "published" : ""}`}
          >
            {current?.status === "PUBLISHED" ? "Đã xuất bản" : "Bản nháp"}
          </span>
          {dirty && <span className="unsaved">Có thay đổi chưa lưu</span>}
        </div>
        <div className="header-actions">
          {current?.status === "PUBLISHED" && (
            <Link
              className="button button-ghost"
              target="_blank"
              href={`/posts/${current.slug}`}
            >
              Xem bài <ArrowTopRightIcon />
            </Link>
          )}
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              save(current?.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT")
            }
          >
            <CheckIcon />
            {pending ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
          {current?.status === "PUBLISHED" ? (
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => save("DRAFT")}
            >
              Gỡ xuất bản
            </Button>
          ) : (
            <Button disabled={pending} onClick={() => save("PUBLISHED")}>
              <PaperPlaneIcon /> Xuất bản
            </Button>
          )}
        </div>
      </header>
      {error && (
        <p className="form-message error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="form-message success" role="status">
          {success}
        </p>
      )}
      <div className="editor-layout">
        <section className="admin-panel editor-main">
          <label className="sr-only" htmlFor="post-title">
            Tiêu đề bài viết
          </label>
          <Textarea
            id="post-title"
            className="editor-title"
            placeholder="Một tiêu đề đáng để đọc..."
            value={title}
            maxLength={250}
            onChange={(e) => {
              setTitle(e.target.value);
              setDirty(true);
            }}
            rows={2}
          />
          <p className="editor-hint">
            Gõ / để thêm block. Chọn văn bản để định dạng.
          </p>
          <div className={pending ? "block-editor saving" : "block-editor"}>
            <BlockEditor
              initial={document.current}
              onChange={(value) => {
                document.current = value;
                setDirty(true);
              }}
            />
          </div>
        </section>
        <aside className="editor-details admin-panel">
          <h2>Thông tin bài viết</h2>
          <label>
            Chuyên mục
            <select
              className="input"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setDirty(true);
              }}
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Tóm tắt
            <Textarea
              rows={4}
              value={summary}
              onChange={(e) => {
                setSummary(e.target.value);
                setDirty(true);
              }}
              maxLength={1000}
              placeholder="Một vài câu giúp người đọc muốn bắt đầu."
            />
          </label>
          <label>
            Tags
            <Input
              value={tags}
              onChange={(e) => {
                setTags(e.target.value);
                setDirty(true);
              }}
              placeholder="email, prompt, năng suất"
            />
            <small>Phân cách bằng dấu phẩy.</small>
          </label>
          <label>
            URL ảnh bìa
            <Input
              type="url"
              value={coverImage}
              onChange={(e) => {
                setCoverImage(e.target.value);
                setDirty(true);
              }}
              placeholder="https://..."
              maxLength={2048}
            />
            <small>Dùng ảnh HTTPS có quyền sử dụng.</small>
          </label>
          <Button
            variant="outline"
            onClick={async () => {
              const { blocksToMarkdown } = await import("@/lib/content");
              const blob = new Blob([blocksToMarkdown(document.current)], {
                type: "text/markdown;charset=utf-8",
              });
              const url = URL.createObjectURL(blob);
              const a = window.document.createElement("a");
              a.href = url;
              a.download = `${current?.slug || "bai-viet"}.md`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <DownloadIcon /> Xuất Markdown
          </Button>
          {current && (
            <Button
              variant="ghost"
              className="delete-post"
              disabled={pending}
              onClick={() => setConfirmDelete(true)}
            >
              <TrashIcon /> Xóa bài viết
            </Button>
          )}
        </aside>
      </div>
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogTitle>Xóa bài viết này?</DialogTitle>
          <DialogDescription>
            Bài viết và các đoạn tìm kiếm liên quan sẽ bị xóa vĩnh viễn.
          </DialogDescription>
          <div className="dialog-actions">
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Giữ lại
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={async () => {
                if (!current) return;
                setPending(true);
                try {
                  await api(`/api/admin/posts/${current.id}`, "DELETE");
                  router.push("/admin/posts");
                  router.refresh();
                } catch (e) {
                  setError(errorMessage(e));
                  setConfirmDelete(false);
                } finally {
                  setPending(false);
                }
              }}
            >
              Xóa bài viết
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </fieldset>
  );
}
