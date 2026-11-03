"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PlusIcon,
  Cross2Icon,
  MagicWandIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  ReloadIcon,
  ArrowRightIcon,
} from "@radix-ui/react-icons";
import { TONES, LENGTHS } from "@/lib/constants";
import type { GenerationResult } from "@/lib/ai/generate";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { errorMessage } from "@/lib/client";

export function GenerationForm({
  activeTopics,
  configured,
}: {
  activeTopics: { id: string; title: string }[];
  configured: boolean;
}) {
  const [topics, setTopics] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [tone, setTone] = useState<string>(TONES[0]);
  const [length, setLength] = useState<string>(LENGTHS[1]);
  const [hasImage, setHasImage] = useState(false);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const router = useRouter();
  const batch = useRef<{ fingerprint: string; requestId: string } | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  function add(values: string[]) {
    const valid = values.map((t) => t.trim()).filter(Boolean);
    if (valid.some((t) => t.length < 3 || t.length > 300)) {
      setError("Mỗi chủ đề cần từ 3 đến 300 ký tự.");
      return;
    }
    if (topics.length + valid.length > 50) {
      setError("Tối đa 50 chủ đề mỗi lần tạo.");
      return;
    }
    setTopics((current) => [...current, ...valid]);
    setDraft("");
    setError("");
    setDone(false);
    setResults([]);
  }
  async function generate() {
    if (!topics.length || running) return;
    setRunning(true);
    setResults([]);
    setDone(false);
    setError("");
    abort.current = new AbortController();
    try {
      const fingerprint = JSON.stringify({ topics, tone, length, hasImage });
      if (batch.current?.fingerprint !== fingerprint)
        batch.current = { fingerprint, requestId: crypto.randomUUID() };
      const response = await fetch("/api/admin/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abort.current.signal,
        body: JSON.stringify({
          requestId: batch.current.requestId,
          topics,
          tone,
          length,
          hasImage,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Trình duyệt không hỗ trợ đọc tiến độ.");
      let buffer = "";
      const decoder = new TextDecoder();
      const completed: GenerationResult[] = [];
      function consume(line: string) {
        if (!line.trim()) return;
        const result = JSON.parse(line);
        if (result.status === "fatal") throw new Error(result.message);
        completed.push(result);
        setResults([...completed]);
      }
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        lines.forEach(consume);
      }
      buffer += decoder.decode();
      if (buffer.trim()) consume(buffer);
      if (completed.length !== topics.length)
        throw new Error(
          "Kết nối bị ngắt. Các bản nháp đã hoàn thành vẫn được lưu trong danh sách bài viết.",
        );
      setDone(true);
      router.refresh();
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError"))
        setError(errorMessage(e));
    } finally {
      setRunning(false);
    }
  }
  const created = results.filter((r) => r.status === "created").length;
  return (
    <div className="generation-layout">
      <div>
        <section className="admin-panel">
          <div className="panel-heading">
            <div>
              <h2>Bắt đầu từ chủ đề của bạn</h2>
              <p className="muted">
                Mỗi chủ đề hợp lệ sẽ trở thành một bản nháp riêng.
              </p>
            </div>
            <span className="count-label">{topics.length}/50</span>
          </div>
          <label className="field-label" htmlFor="topics-input">
            Bạn muốn chia sẻ điều gì?
          </label>
          <Textarea
            id="topics-input"
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={running}
            placeholder={
              "Ví dụ: Dùng AI để viết email trả lời khách hàng\nCó thể nhập nhiều chủ đề, mỗi dòng một chủ đề."
            }
          />
          <div className="topic-add-actions">
            <span>Mỗi dòng là một chủ đề</span>
            <Button
              variant="outline"
              size="sm"
              disabled={running || !draft.trim()}
              onClick={() => add(draft.split("\n"))}
            >
              <PlusIcon /> Thêm chủ đề
            </Button>
          </div>
          {activeTopics.length > 0 && (
            <details className="saved-topics">
              <summary>Chọn từ {activeTopics.length} chủ đề đang bật</summary>
              <div>
                {activeTopics.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    disabled={running || topics.length >= 50}
                    onClick={() => add([t.title])}
                  >
                    <PlusIcon />
                    {t.title}
                  </button>
                ))}
              </div>
            </details>
          )}
          {topics.length > 0 && (
            <ol className="generation-topics">
              {topics.map((t, i) => (
                <li key={`${i}-${t}`}>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <p>{t}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={running}
                    aria-label={`Bỏ chủ đề ${t}`}
                    onClick={() => {
                      setTopics(topics.filter((_, index) => i !== index));
                      setDone(false);
                      setResults([]);
                    }}
                  >
                    <Cross2Icon />
                  </Button>
                </li>
              ))}
            </ol>
          )}
        </section>
        {(running || results.length > 0) && (
          <section
            className="admin-panel generation-progress"
            aria-live="polite"
          >
            <div className="panel-heading">
              <h2>
                {running ? "Đang viết từng ý tưởng..." : "Kết quả tạo bản nháp"}
              </h2>
              <span>
                {results.length}/{topics.length}
              </span>
            </div>
            <progress
              value={results.length}
              max={topics.length}
              aria-label="Tiến độ tạo bản nháp"
            />
            {results.map((r) => (
              <div className={`generation-result ${r.status}`} key={r.index}>
                {r.status === "created" ? (
                  <CheckIcon />
                ) : (
                  <ExclamationTriangleIcon />
                )}
                <div>
                  <strong>{r.topic}</strong>
                  <p>{r.message}</p>
                  {r.postId && (
                    <Link
                      className="text-link"
                      href={`/admin/posts/${r.postId}`}
                    >
                      Mở editor <ArrowRightIcon />
                    </Link>
                  )}
                </div>
              </div>
            ))}
            {running && (
              <p className="generation-wait">
                <ReloadIcon className="spin" /> Đang xử lý chủ đề{" "}
                {Math.min(results.length + 1, topics.length)}/{topics.length}.
                Bạn có thể tiếp tục theo dõi tại đây.
              </p>
            )}
            {done && (
              <div className="generation-complete">
                <p>
                  Đã tạo {created}/{topics.length} bản nháp.
                </p>
                {created > 0 && (
                  <Link
                    className="button button-primary"
                    href="/admin/posts?status=DRAFT"
                  >
                    Xem danh sách bản nháp <ArrowRightIcon />
                  </Link>
                )}
              </div>
            )}
          </section>
        )}
      </div>
      <aside className="admin-panel generation-options">
        <h2>Cách bài viết được kể</h2>
        <label>
          Giọng văn
          <select
            className="input"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            disabled={running}
          >
            {TONES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          Độ dài
          <select
            className="input"
            value={length}
            onChange={(e) => setLength(e.target.value)}
            disabled={running}
          >
            {LENGTHS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={hasImage}
            onChange={(e) => setHasImage(e.target.checked)}
            disabled={running}
          />
          <span>
            Gợi ý hình minh họa
            <small>Đề xuất nội dung hình và vị trí đặt trong bài.</small>
          </span>
        </label>
        <div className="generation-note">
          <MagicWandIcon />
          <p>
            Groq viết hướng dẫn từng bước và chọn chuyên mục.
            Bạn kiểm chứng thông tin và bổ sung nguồn trước khi xuất bản.
          </p>
        </div>
        {!configured && (
          <p className="form-message error">
            Chưa cấu hình Groq.{" "}
            <Link href="/admin/settings">Mở cài đặt AI</Link>.
          </p>
        )}
        <Button
          className="w-full"
          disabled={running || !topics.length || !configured || done}
          onClick={generate}
        >
          {running ? <ReloadIcon className="spin" /> : <MagicWandIcon />}
          {running
            ? "Đang tạo bản nháp..."
            : `Tạo ${topics.length || ""} bản nháp`}
        </Button>
        {error && (
          <p className="form-message error" role="alert">
            {error}
          </p>
        )}
        <small className="muted">
          Chủ đề ngoài danh mục sẽ được báo riêng. Không tự động xuất bản.
        </small>
      </aside>
    </div>
  );
}
