"use client";

export type Tab = "home" | "explore" | "ask";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "home", label: "وين", icon: "📷" },
  { id: "explore", label: "Explore", icon: "🗺" },
  { id: "ask", label: "Ask", icon: "💬" },
];

export default function BottomNav({
  tab,
  onChange,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
}) {
  return (
    <nav className="sticky bottom-0 z-30 flex border-t border-white/10 bg-[#100d0b]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          aria-current={tab === t.id}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] ${
            tab === t.id ? "text-amber-400" : "text-zinc-500"
          }`}
        >
          <span className="text-lg leading-none">{t.icon}</span>
          {t.label}
        </button>
      ))}
    </nav>
  );
}
