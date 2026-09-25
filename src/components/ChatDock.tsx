"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage, MenuItem } from "@/lib/types";
import { isRtl } from "./ui";

export default function ChatDock({
  messages,
  dishes,
  input,
  setInput,
  onSend,
  onMic,
  listening,
  busy,
  placeholder,
  prompts = [],
  pinned,
}: {
  messages: ChatMessage[];
  dishes: MenuItem[];
  input: string;
  setInput: (v: string) => void;
  onSend: (text: string) => void;
  onMic: () => void;
  listening: boolean;
  busy: boolean;
  placeholder: string;
  prompts?: string[];
  /** Sticks the composer to the bottom of the scroll container. */
  pinned?: boolean;
}) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className={pinned ? "sticky bottom-0 bg-[#100d0b]/95 backdrop-blur" : ""}>
      {!pinned && (
        <div className="space-y-2 pb-3">
          {messages.map((m, i) => (
            <div
              key={i}
              dir={isRtl(m.content) ? "rtl" : "ltr"}
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                m.role === "user"
                  ? "ml-auto bg-amber-500 text-black"
                  : "bg-white/10 text-zinc-100"
              }`}
            >
              {m.content}
            </div>
          ))}
          <div ref={end} />
        </div>
      )}

      {dishes.length > 0 && (
        <ul className="space-y-1 pb-2">
          {dishes.map((d) => (
            <li
              key={d.name_en}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
            >
              <span>
                {d.name_en} <span dir="rtl">· {d.name_ar}</span>
              </span>
              <span className="font-semibold text-amber-400">{d.price_aed} AED</span>
            </li>
          ))}
        </ul>
      )}

      {prompts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pb-2">
          {prompts.map((q) => (
            <button
              key={q}
              onClick={() => onSend(q)}
              disabled={busy}
              dir={isRtl(q) ? "rtl" : "ltr"}
              className="rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-400 disabled:opacity-40"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSend(input);
        }}
        className="flex gap-2 pb-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          dir={isRtl(input) ? "rtl" : "ltr"}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm placeholder:text-zinc-500"
        />
        <button
          type="button"
          onClick={onMic}
          disabled={busy}
          title="Ask by voice — tap to record, tap again to send"
          className={`rounded-full px-3 py-2 text-sm ${
            listening ? "bg-rose-500 text-white" : "border border-white/15 text-zinc-300"
          } disabled:opacity-40`}
        >
          {listening ? "● stop" : "🎙"}
        </button>
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
