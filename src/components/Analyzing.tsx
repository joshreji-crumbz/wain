"use client";

import { useEffect, useState } from "react";

export const ANALYZING_STEPS = [
  "Reading the image",
  "Looking for a brand or a dish",
  "Searching within 5 km",
  "Ranking what's nearby",
];

/**
 * The photo request is one round trip, so the steps advance on a timer and the
 * last one only completes when the response lands — it never claims to be
 * finished before the answer exists.
 */
export default function Analyzing({ done }: { done: boolean }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (done) return;
    const t = setInterval(
      () => setStep((s) => Math.min(s + 1, ANALYZING_STEPS.length - 1)),
      1400,
    );
    return () => clearInterval(t);
  }, [done]);

  return (
    <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4 backdrop-blur">
      <p className="text-sm font-semibold text-amber-200">Analyzing…</p>
      <ul className="mt-3 space-y-2">
        {ANALYZING_STEPS.map((label, i) => {
          const complete = done || i < step;
          const current = !done && i === step;
          return (
            <li key={label} className="flex items-center gap-2 text-sm">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${
                  complete
                    ? "border-amber-400 bg-amber-400 text-black"
                    : current
                      ? "border-amber-400 text-amber-300"
                      : "border-white/15 text-zinc-600"
                }`}
              >
                {complete ? "✓" : current ? "•" : ""}
              </span>
              <span
                className={
                  complete ? "text-zinc-300" : current ? "text-amber-200" : "text-zinc-600"
                }
              >
                {label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
