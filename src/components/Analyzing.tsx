"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  BackIcon,
  CheckIcon,
  DocIcon,
  DotsIcon,
  EyeIcon,
  PeopleIcon,
  PinIcon,
} from "./icons";

export const ANALYZING_STEPS = [
  {
    icon: EyeIcon,
    title: "Understanding the image",
    subtitle: "Signs, logos, text, food…",
  },
  {
    icon: PinIcon,
    title: "Identifying the restaurant",
    subtitle: "Reading what's in the frame…",
  },
  {
    icon: DocIcon,
    title: "Finding places near you",
    subtitle: "Google Places · 5 km",
  },
  {
    icon: PeopleIcon,
    title: "Checking menu & info",
    subtitle: "Website, Instagram, menu…",
  },
];

/**
 * The photo request is one round trip: steps 1, 3 and 4 advance on a timer while
 * step 2 only resolves — with the real evidence line — once the answer lands.
 */
export default function Analyzing({
  photo,
  done,
  evidence,
  onBack,
}: {
  photo: string | null;
  done: boolean;
  evidence: string | null;
  onBack: () => void;
}) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (done) return;
    const t = setInterval(
      () => setStep((s) => Math.min(s + 1, ANALYZING_STEPS.length - 1)),
      1200,
    );
    return () => clearInterval(t);
  }, [done]);

  const progress = done ? 100 : ((step + 1) / (ANALYZING_STEPS.length + 1)) * 100;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0B0907]">
      {photo && (
        <Image
          src={photo}
          alt=""
          fill
          unoptimized
          className="object-cover opacity-45"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B0907]/70 via-[#0B0907]/30 to-[#0B0907]/90" />

      <div className="relative flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+14px)]">
        <button
          onClick={onBack}
          aria-label="Back"
          className="rounded-full p-2 text-white/80"
        >
          <BackIcon />
        </button>
        <span className="text-sm text-white/90">Analyzing your content…</span>
        <span className="rounded-full p-2 text-white/50">
          <DotsIcon />
        </span>
      </div>

      <div className="relative flex flex-1 items-center px-5">
        <div className="glass w-full p-5">
          <ul className="space-y-5">
            {ANALYZING_STEPS.map((s, i) => {
              // Step 2 waits for the real answer; the rest can tick on the timer.
              const complete = i === 1 ? !!evidence : done || i < step;
              const Icon = s.icon;
              const subtitle = i === 1 && evidence ? evidence : s.subtitle;
              return (
                <li key={s.title} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/8 text-[#F2A23A]">
                    <Icon />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold text-white">
                      {s.title}
                    </span>
                    <span className="block truncate text-[13px] text-[#A89F94]">
                      {subtitle}
                    </span>
                  </span>
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      complete
                        ? "border-[#F2A23A] bg-[#F2A23A] text-black"
                        : "border-white/15 text-transparent"
                    }`}
                  >
                    <CheckIcon className="h-4 w-4" />
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#F2A23A] transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
