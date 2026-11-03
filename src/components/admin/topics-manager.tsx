"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PlusIcon,
  Pencil1Icon,
  TrashIcon,
  CheckIcon,
  Cross2Icon,
} from "@radix-ui/react-icons";
import { api, errorMessage } from "@/lib/client";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
interface Topic {
  id: string;
  title: string;
  isActive: boolean;
  lastUsedAt: string | null;
}

export function TopicsManager({
  topics,
  categories,
}: {
  topics: Topic[];
  categories: string[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  async function mutate(
    key: string,
    url: string,
    method: string,
    data?: unknown,
  ) {
    setPending(key);
    setError("");
    try {
      await api(url, method, data);
      setEditing(null);
      router.refresh();
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    } finally {
      setPending("");
    }
  }
  return (
    <div className="topics-layout">
      <section className="admin-panel">
        <div className="panel-heading">
          <div>
            <h2>Ngân hàng ý tưởng</h2>
            <p className="muted">
              Bật chủ đề để sử dụng khi tạo bài hàng loạt.
            </p>
          </div>
          <span className="count-label">{topics.length}</span>
        </div>
        <form
          className="inline-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const value = String(new FormData(form).get("title"));
            if (
              await mutate("new", "/api/admin/topics", "POST", {
                title: value,
                isActive: true,
              })
            )
              form.reset();
          }}
        >
          <label className="sr-only" htmlFor="new-topic">
            Chủ đề mới
          </label>
          <Input
            id="new-topic"
            name="title"
            placeholder="Một chủ đề bạn muốn viết..."
            required
            minLength={3}
            maxLength={300}
          />
          <Button type="submit" disabled={Boolean(pending)}>
            <PlusIcon /> Thêm
          </Button>
        </form>
        {topics.length ? (
          <div className="topic-list">
            {topics.map((topic) => (
              <div className="topic-row" key={topic.id}>
                {editing === topic.id ? (
                  <form
                    className="inline-form"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      await mutate(
                        topic.id,
                        `/api/admin/topics/${topic.id}`,
                        "PUT",
                        { title, isActive: topic.isActive },
                      );
                    }}
                  >
                    <label className="sr-only" htmlFor={`topic-${topic.id}`}>
                      Sửa chủ đề
                    </label>
                    <Input
                      id={`topic-${topic.id}`}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      minLength={3}
                      maxLength={300}
                      required
                      autoFocus
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={Boolean(pending)}
                      aria-label="Lưu"
                    >
                      <CheckIcon />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditing(null)}
                      aria-label="Hủy"
                    >
                      <Cross2Icon />
                    </Button>
                  </form>
                ) : (
                  <>
                    <button
                      className={`switch ${topic.isActive ? "on" : ""}`}
                      role="switch"
                      aria-checked={topic.isActive}
                      aria-label={`${topic.isActive ? "Tắt" : "Bật"} chủ đề ${topic.title}`}
                      disabled={Boolean(pending)}
                      onClick={() =>
                        mutate(
                          topic.id,
                          `/api/admin/topics/${topic.id}`,
                          "PUT",
                          { title: topic.title, isActive: !topic.isActive },
                        )
                      }
                    >
                      <span />
                    </button>
                    <span className="topic-title">
                      {topic.title}
                      <small>
                        {topic.lastUsedAt
                          ? "Đã sử dụng để tạo bài"
                          : "Chưa sử dụng"}
                      </small>
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Sửa ${topic.title}`}
                      onClick={() => {
                        setEditing(topic.id);
                        setTitle(topic.title);
                      }}
                      disabled={Boolean(pending)}
                    >
                      <Pencil1Icon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Xóa ${topic.title}`}
                      onClick={() =>
                        mutate(
                          topic.id,
                          `/api/admin/topics/${topic.id}`,
                          "DELETE",
                        )
                      }
                      disabled={Boolean(pending)}
                    >
                      <TrashIcon />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="admin-empty">
            <h3>Lưu một ý tưởng cho ngày mai.</h3>
            <p>Thêm các chủ đề bạn muốn chia sẻ cùng người đọc.</p>
          </div>
        )}
      </section>
      <section className="admin-panel categories-panel">
        <div className="panel-heading">
          <div>
            <h2>Chuyên mục được phép</h2>
            <p className="muted">AI chỉ phân loại trong danh sách này.</p>
          </div>
        </div>
        <div className="category-list">
          {categories.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            if (
              await mutate("category", "/api/admin/categories", "POST", {
                name: new FormData(form).get("name"),
              })
            )
              form.reset();
          }}
        >
          <label>
            Thêm chuyên mục
            <Input
              name="name"
              required
              minLength={2}
              maxLength={100}
              placeholder="Tên chuyên mục mới"
            />
          </label>
          <Button variant="outline" disabled={Boolean(pending)} type="submit">
            <PlusIcon /> Thêm vào danh sách
          </Button>
        </form>
      </section>
      {error && (
        <p className="form-message error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
