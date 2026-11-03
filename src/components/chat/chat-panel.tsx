"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpIcon,
  ChatBubbleIcon,
  ReloadIcon,
  TrashIcon,
  LockClosedIcon,
} from "@radix-ui/react-icons";
import gsap from "gsap";
import { DialogContent, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Markdown } from "../blog/markdown";
import { api, errorMessage } from "@/lib/client";

interface Message {
  id: string;
  role: string;
  content: string;
}
interface History {
  sessionId: string | null;
  messages: Message[];
}
const suggestions = [
  "Tôi nên bắt đầu ứng dụng AI từ đâu?",
  "Làm sao viết email nhanh hơn với AI?",
  "AI có thể giúp phân tích dữ liệu như thế nào?",
];

export default function ChatPanel({
  question,
  onQuestionConsumed,
}: {
  question: string;
  onQuestionConsumed: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState(question);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const body = useRef<HTMLDivElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    let active = true;
    api<History>("/api/chat")
      .then((data) => {
        if (!active) return;
        setMessages(data.messages);
        setSessionId(data.sessionId);
        try {
          if (data.sessionId)
            localStorage.setItem("afw_session", data.sessionId);
          else localStorage.removeItem("afw_session");
        } catch {}
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    if (
      body.current &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      gsap.fromTo(
        body.current,
        { x: 48, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.35, ease: "power2.out" },
      );
    return () => {
      active = false;
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (question) {
      setInput(question);
      onQuestionConsumed();
    }
  }, [question, onQuestionConsumed]);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "auto", block: "nearest" });
  }, [messages, pending]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const message = input.trim();
    if (!message || pending || loading) return;
    setPending(true);
    setError("");
    setInput("");
    setMessages((current) => [
      ...current,
      { id: "sending", role: "user", content: message },
    ]);
    try {
      const data = await api<{ sessionId: string; message: Message }>(
        "/api/chat",
        "POST",
        { message, sessionId },
      );
      setSessionId(data.sessionId);
      try {
        localStorage.setItem("afw_session", data.sessionId);
      } catch {}
      setMessages((current) => [
        ...current.filter((m) => m.id !== "sending"),
        { id: crypto.randomUUID(), role: "user", content: message },
        data.message,
      ]);
    } catch (e) {
      setError(errorMessage(e));
      setInput(message);
      setMessages((current) => current.filter((m) => m.id !== "sending"));
      try {
        const history = await api<History>("/api/chat");
        setSessionId(history.sessionId);
      } catch {}
    } finally {
      setPending(false);
    }
  }
  async function clear() {
    if (pending) return;
    setError("");
    setPending(true);
    try {
      await api("/api/chat", "DELETE");
      setMessages([]);
      setSessionId(null);
      try {
        localStorage.removeItem("afw_session");
      } catch {}
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }
  return (
    <DialogContent className="chat-panel">
      <div ref={body} className="chat-panel-inner">
        <header className="chat-header">
          <div className="chat-avatar">
            <ChatBubbleIcon />
          </div>
          <div>
            <DialogTitle>AI For Work</DialogTitle>
            <DialogDescription>
              Trợ lý từ kho kiến thức của blog
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="chat-clear"
            aria-label="Xóa hội thoại"
            title="Xóa hội thoại"
            onClick={clear}
            disabled={pending || loading}
          >
            <TrashIcon />
          </Button>
        </header>
        <div
          className="chat-messages"
          role="log"
          aria-label="Nội dung hội thoại"
          aria-live="polite"
        >
          {loading ? (
            <p className="muted">Đang tải hội thoại...</p>
          ) : messages.length ? (
            messages.map((m) => (
              <div key={m.id} className={`chat-message chat-message-${m.role}`}>
                {m.role === "assistant" && (
                  <span className="message-author">AI FOR WORK</span>
                )}
                {m.role === "assistant" ? (
                  <Markdown content={m.content} headings={false} />
                ) : (
                  <p>{m.content}</p>
                )}
              </div>
            ))
          ) : (
            <div className="chat-welcome">
              <div className="welcome-icon">
                <ChatBubbleIcon />
              </div>
              <h2>
                Công việc nào
                <br />
                đang cần một ý tưởng?
              </h2>
              <p>
                Mình giúp bạn tìm cách ứng dụng AI từ những hướng dẫn đã xuất
                bản trên blog.
              </p>
              <div className="chat-suggestions">
                {suggestions.map((q) => (
                  <button key={q} onClick={() => setInput(q)}>
                    {q}
                    <ArrowUpIcon />
                  </button>
                ))}
              </div>
            </div>
          )}
          {pending && (
            <div className="chat-thinking" role="status">
              <ReloadIcon className="spin" /> Đang tìm câu trả lời...
            </div>
          )}
          <div ref={end} />
        </div>
        <footer className="chat-composer">
          {error && (
            <div className="form-message error" role="alert">
              {error}
            </div>
          )}
          <form onSubmit={send}>
            <label htmlFor="chat-input" className="sr-only">
              Câu hỏi của bạn
            </label>
            <Textarea
              id="chat-input"
              value={input}
              maxLength={2000}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Hỏi về công việc của bạn..."
              rows={2}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <Button
              size="icon"
              type="submit"
              disabled={pending || loading || !input.trim()}
              aria-label="Gửi câu hỏi"
            >
              <ArrowUpIcon />
            </Button>
          </form>
          <p>
            <LockClosedIcon /> Hội thoại ẩn danh · Câu trả lời có dẫn nguồn
          </p>
        </footer>
      </div>
    </DialogContent>
  );
}
