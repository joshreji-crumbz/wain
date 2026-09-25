"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import ChatBubble from "./ChatBubble";
import { MicIcon, WaveIcon } from "./icons";
import type { ChatMessage, MenuItem } from "@/lib/types";
import { dishImage, isRtl } from "./ui";

export default function ChatDock({
  messages,
  dishes,
  input,
  setInput,
  onSend,
  onMic,
  onSpeak,
  speaking,
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
  onSpeak: (text: string) => void;
  /** The reply currently being read out loud, if any. */
  speaking: string | null;
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
    <div className={pinned ? "sticky bottom-0" : ""}>
      {!pinned && (
        <div className="space-y-2 pb-3">
          {messages.map((m, i) => (
            <ChatBubble
              key={i}
              message={m}
              onSpeak={onSpeak}
              speaking={speaking === m.content}
            />
          ))}
          <div ref={end} />
        </div>
      )}

      {dishes.length > 0 && (
        <>
          <ul className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
            {dishes.map((d) => (
              <li key={d.name_en} className="w-32 shrink-0">
                <Image
                  src={dishImage(`${d.name_en} ${d.name_ar}`)}
                  alt={d.name_en}
                  width={160}
                  height={120}
                  className="h-24 w-32 rounded-2xl object-cover"
                />
                <p className="mt-1.5 truncate text-[13px] font-medium text-white">
                  {d.name_en}
                </p>
                <p className="text-[12px] text-[#A89F94]">AED {d.price_aed}</p>
              </li>
            ))}
          </ul>
          <p className="pb-2">
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-[#A89F94]">
              source: menu
            </span>
          </p>
        </>
      )}

      {prompts.length > 0 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
          {prompts.map((q) => (
            <button
              key={q}
              onClick={() => onSend(q)}
              disabled={busy}
              dir={isRtl(q) ? "rtl" : "ltr"}
              className="glass shrink-0 whitespace-nowrap px-3.5 py-1.5 text-xs text-white/85 disabled:opacity-40"
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
        className="mb-2 flex items-center gap-2 rounded-full border border-[#F2A23A]/50 bg-black/40 px-4 py-1.5 backdrop-blur"
      >
        <WaveIcon className="h-5 w-5 shrink-0 text-[#F2A23A]" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          dir={isRtl(input) ? "rtl" : "ltr"}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-white outline-none placeholder:text-white/45"
        />
        <button
          type="button"
          onClick={onMic}
          disabled={busy}
          aria-label="Ask by voice — tap to record, tap again to send"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            listening ? "bg-rose-500 text-white" : "bg-white/10 text-white"
          } disabled:opacity-40`}
        >
          <MicIcon className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
