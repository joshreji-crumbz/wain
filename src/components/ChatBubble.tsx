"use client";

import type { ChatMessage } from "@/lib/types";
import { SpeakerIcon } from "./icons";
import { useLang } from "@/lib/i18n";
import { Spinner, isRtl } from "./ui";

/**
 * A chat line. WAIN's own replies can be read out loud, which is the point of
 * asking in Khaleeji in the first place.
 */
export default function ChatBubble({
  message,
  onSpeak,
  speaking,
  compact,
}: {
  message: ChatMessage;
  onSpeak: (text: string) => void;
  speaking: boolean;
  compact?: boolean;
}) {
  const { t } = useLang();
  const mine = message.role === "user";
  return (
    <div
      dir={isRtl(message.content) ? "rtl" : "ltr"}
      className={`w-fit max-w-[85%] text-sm ${
        compact ? "rounded-2xl px-3 py-2" : "px-4 py-2.5"
      } ${
        mine
          ? `ms-auto bg-[#F2A23A] text-black${compact ? "" : " rounded-3xl rounded-ee-md"}`
          : `me-auto glass text-white${compact ? "" : " rounded-3xl rounded-es-md"}`
      }`}
    >
      {message.content}
      {!mine && (
        <button
          onClick={() => onSpeak(message.content)}
          aria-label={t("chat.speak")}
          className="ms-2 inline-flex translate-y-0.5 items-center text-[#F2A23A]"
        >
          {speaking ? <Spinner /> : <SpeakerIcon className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}
