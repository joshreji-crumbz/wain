"use client";

import {
  CameraIcon,
  LinkIcon,
  MicIcon,
  UploadIcon,
  UserIcon,
  WaveIcon,
} from "./icons";
import type { SearchResult } from "@/lib/types";
import { type Key, useLang } from "@/lib/i18n";
import { isRtl, metres, names } from "./ui";

export type PhotoOutcome = {
  tier: "brand" | "dish" | "unclear";
  evidence: string;
  brand: string | null;
  dish: { dish_en: string; dish_ar: string } | null;
  question?: string;
  radius_m: number;
  results: SearchResult[];
  matches?: {
    place_id: string;
    matched_items: { name_en: string; name_ar: string; price_aed: number }[];
  }[];
};

const CHIPS: Key[] = ["chips.1", "chips.2", "chips.3", "chips.4", "chips.5"];

export default function HomeScreen({
  onPhotoPicked,
  outcome,
  onOpen,
  onAsk,
  gpsStatus,
  lat,
  lng,
  setLat,
  setLng,
  showManualGps,
  setShowManualGps,
  onPasteReel,
  input,
  setInput,
  onMic,
  listening,
}: {
  onPhotoPicked: (file: File) => void;
  outcome: PhotoOutcome | null;
  onOpen: (result: SearchResult) => void;
  onAsk: (text?: string) => void;
  gpsStatus: string;
  lat: string;
  lng: string;
  setLat: (v: string) => void;
  setLng: (v: string) => void;
  showManualGps: boolean;
  setShowManualGps: (v: boolean) => void;
  onPasteReel: () => void;
  input: string;
  setInput: (v: string) => void;
  onMic: () => void;
  listening: boolean;
}) {
  const { t, lang, setLang } = useLang();
  return (
    <section className="relative flex min-h-full flex-1 flex-col">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/hero-terrace.jpg)" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B0907]/45 via-[#0B0907]/60 to-[#0B0907]" />

      <div className="relative flex min-h-full flex-1 flex-col px-5 pb-4 pt-[calc(env(safe-area-inset-top)+16px)]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            aria-label={t("lang.toggleAria")}
            className="glass flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-semibold text-white/80"
          >
            {t("lang.toggle")}
          </button>
          <span className="text-xl tracking-[0.25em] text-white">
            WAIN <span className="font-arabic tracking-normal">وين</span>
          </span>
          <span
            aria-label={t("home.profile")}
            className="glass flex h-9 w-9 items-center justify-center rounded-full text-white/80"
          >
            <UserIcon className="h-5 w-5" />
          </span>
        </div>

        <div className="mt-12 shrink-0">
          <h1 className="text-[44px] font-semibold leading-[1.15] text-white">
            {t("home.see")}
            <br />
            {t("home.ask")}
            <br />
            <span className="text-[#F2A23A]">{t("home.find")}</span>
          </h1>
          <p className="mt-4 max-w-[19rem] text-[15px] leading-snug text-white/75">
            {t("home.subline")}
          </p>
        </div>

        <div className="flex-1" />

        {outcome?.tier === "unclear" && (
          <div className="glass mb-3 shrink-0 p-4 text-sm text-white">
            <p className="text-[#A89F94]">{outcome.evidence}</p>
            <p className="mt-1">{outcome.question}</p>
          </div>
        )}

        {outcome && outcome.tier !== "unclear" && outcome.results.length > 0 && (
          // Results must never squeeze the actions out of the screen.
          <div className="mb-3 max-h-[34vh] shrink-0 space-y-2 overflow-y-auto">
            <p className="px-1 text-xs text-[#A89F94]">{outcome.evidence}</p>
            {outcome.results.slice(0, 3).map((r) => (
              <button
                key={r.id}
                onClick={() => onOpen(r)}
                className="glass flex w-full items-center justify-between p-3 text-left text-sm text-white"
              >
                <span className="min-w-0 truncate">{names(r, lang).primary}</span>
                <span className="ltr-nums shrink-0 text-xs text-[#A89F94]">
                  {metres(r.distance_m, t)}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="glass flex shrink-0 overflow-hidden p-1">
          <label className="flex flex-1 cursor-pointer flex-col items-center gap-1.5 rounded-2xl py-3 text-[13px] font-medium text-white">
            <CameraIcon className="h-6 w-6 text-[#F2A23A]" />
            {t("home.camera")}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => e.target.files?.[0] && onPhotoPicked(e.target.files[0])}
              className="hidden"
            />
          </label>
          <label className="flex flex-1 cursor-pointer flex-col items-center gap-1.5 rounded-2xl py-3 text-[13px] font-medium text-white/85">
            <UploadIcon className="h-6 w-6" />
            {t("home.upload")}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && onPhotoPicked(e.target.files[0])}
              className="hidden"
            />
          </label>
          <button
            onClick={onPasteReel}
            className="flex flex-1 flex-col items-center gap-1.5 rounded-2xl py-3 text-[13px] font-medium text-white/85"
          >
            <LinkIcon className="h-6 w-6" />
            {t("home.paste")}
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) onAsk(input);
          }}
          className="mt-3 flex shrink-0 items-center gap-2 rounded-full border border-[#F2A23A]/60 bg-black/40 px-4 py-2 shadow-[0_0_24px_rgba(242,162,58,0.25)] backdrop-blur"
        >
          <WaveIcon className="h-5 w-5 text-[#F2A23A]" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            dir={input ? (isRtl(input) ? "rtl" : "ltr") : undefined}
            placeholder={t("home.askPlaceholder")}
            className="min-w-0 flex-1 bg-transparent py-1.5 text-[15px] text-white outline-none placeholder:text-white/50"
          />
          <button
            type="button"
            onClick={onMic}
            aria-label={t("chat.mic")}
            className={`flex h-9 w-9 items-center justify-center rounded-full ${
              listening ? "bg-rose-500 text-white" : "bg-white/10 text-white"
            }`}
          >
            <MicIcon className="h-5 w-5" />
          </button>
        </form>

        <p className="mt-4 shrink-0 text-xs text-[#A89F94]">{t("home.tryAsking")}</p>
        <div className="no-scrollbar -mx-5 mt-2 flex shrink-0 gap-2 overflow-x-auto px-5">
          {CHIPS.map((c) => (
            <button
              key={c}
              onClick={() => onAsk(t(c))}
              className="glass shrink-0 whitespace-nowrap px-4 py-2 text-[13px] text-white/90"
            >
              {t(c)}
            </button>
          ))}
        </div>

        <div className="mt-4 flex shrink-0 items-center justify-between text-[11px] text-[#A89F94]">
          <span>{gpsStatus}</span>
          <button onClick={() => setShowManualGps(!showManualGps)} className="underline">
            {t("home.setLocation")}
          </button>
        </div>

        {showManualGps && (
          <div className="mt-2 flex gap-2">
            <input
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className="w-32 rounded-lg border border-white/15 bg-transparent px-2 py-1 text-xs text-white"
              placeholder={t("home.lat")}
            />
            <input
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              className="w-32 rounded-lg border border-white/15 bg-transparent px-2 py-1 text-xs text-white"
              placeholder={t("home.lng")}
            />
          </div>
        )}
      </div>
    </section>
  );
}
