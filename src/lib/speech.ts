"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Speaks WAIN's replies out loud. One audio element for the whole app, so a
 * second tap replaces the first answer instead of talking over it.
 */
export function useSpeech() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [speaking, setSpeaking] = useState<string | null>(null);

  const stop = useCallback(() => {
    audio.current?.pause();
    audio.current = null;
    setSpeaking(null);
  }, []);

  useEffect(() => stop, [stop]);

  const speak = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      stop();
      setSpeaking(text);
      try {
        const res = await fetch("/api/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) throw new Error("speech failed");
        const url = URL.createObjectURL(await res.blob());
        const el = new Audio(url);
        audio.current = el;
        el.onended = () => {
          URL.revokeObjectURL(url);
          setSpeaking((s) => (s === text ? null : s));
        };
        await el.play();
      } catch {
        // A failed or blocked playback just leaves the text reply on screen.
        setSpeaking((s) => (s === text ? null : s));
      }
    },
    [stop],
  );

  return { speak, stop, speaking };
}
