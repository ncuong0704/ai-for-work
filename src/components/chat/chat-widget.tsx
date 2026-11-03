"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ChatBubbleIcon, ArrowTopRightIcon } from "@radix-ui/react-icons";
import { Dialog } from "../ui/dialog";

const ChatPanel = dynamic(() => import("./chat-panel"), { ssr: false });
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [question, setQuestion] = useState("");
  useEffect(() => {
    const listener = (event: Event) => {
      setQuestion((event as CustomEvent<string>).detail || "");
      setOpen(true);
      setMounted(true);
    };
    window.addEventListener("afw:chat", listener);
    return () => window.removeEventListener("afw:chat", listener);
  }, []);
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value) setMounted(true);
      }}
    >
      <button
        className="chat-launcher"
        aria-label="Mở trợ lý AI For Work"
        onClick={() => {
          setOpen(true);
          setMounted(true);
        }}
      >
        <ChatBubbleIcon />
        <span>Hỏi AI For Work</span>
        <ArrowTopRightIcon />
      </button>
      {mounted && (
        <ChatPanel
          question={question}
          onQuestionConsumed={() => setQuestion("")}
        />
      )}
    </Dialog>
  );
}
