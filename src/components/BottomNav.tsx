"use client";

import { CameraIcon, ChatIcon, MapIcon } from "./icons";

export type Tab = "home" | "explore" | "ask";

const TABS: { id: Tab; label: string; Icon: (p: { className?: string }) => React.ReactElement }[] = [
  { id: "home", label: "وين", Icon: CameraIcon },
  { id: "explore", label: "Explore", Icon: MapIcon },
  { id: "ask", label: "Ask", Icon: ChatIcon },
];

export default function BottomNav({
  tab,
  onChange,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
}) {
  return (
    <nav className="sticky bottom-0 z-30 flex border-t border-white/8 bg-[#0B0907]/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          aria-current={tab === id}
          className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] ${
            tab === id ? "text-[#F2A23A]" : "text-[#A89F94]"
          }`}
        >
          <Icon className="h-5 w-5" />
          {label}
        </button>
      ))}
    </nav>
  );
}
