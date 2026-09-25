"use client";

import { CameraIcon, ChatIcon, MapIcon } from "./icons";
import { type Key, useLang } from "@/lib/i18n";

export type Tab = "home" | "explore" | "ask";

const TABS: {
  id: Tab;
  label: Key;
  Icon: (p: { className?: string }) => React.ReactElement;
}[] = [
  { id: "home", label: "nav.home", Icon: CameraIcon },
  { id: "explore", label: "nav.explore", Icon: MapIcon },
  { id: "ask", label: "nav.ask", Icon: ChatIcon },
];

export default function BottomNav({
  tab,
  onChange,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
}) {
  const { t } = useLang();
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
          {t(label)}
        </button>
      ))}
    </nav>
  );
}
