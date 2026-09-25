"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

export type Lang = "ar" | "en";

/**
 * Arabic is the source of truth for the interface: English is the translation,
 * not the other way round.
 */
const AR = {
  "nav.home": "وين",
  "nav.explore": "استكشف",
  "nav.ask": "اسأل",

  "home.see": "شوفها.",
  "home.ask": "اسألها.",
  "home.find": "لقّها.",
  "home.subline": "دليلك الذكي للمطاعم — من اللي تشوفه، وباللهجة اللي تتكلمها.",
  "home.camera": "كاميرا",
  "home.upload": "رفع صورة",
  "home.paste": "لصق رابط",
  "home.askPlaceholder": "اسأل وين…",
  "home.tryAsking": "جرّب تسأل",
  "home.setLocation": "حدد موقعك",
  "home.lat": "خط العرض",
  "home.lng": "خط الطول",
  "home.profile": "حسابي",

  "chips.1": "شو أطلب؟",
  "chips.2": "أبي شي مثله",
  "chips.3": "أماكن حق العائلة",
  "chips.4": "وين أتسحر؟",
  "chips.5": "شي حار تحت ٥٠",

  "gps.default": "الموقع الافتراضي (الماريه)",
  "gps.using": "نستخدم موقعك",
  "gps.unavailable": "الموقع غير متاح، نستخدم الماريه",
  "gps.manual": "موقع يدوي",

  "explore.placeholder": "كنتاكي · kentaki · الفنار · شاورما",
  "explore.find": "دوّر",
  "explore.empty": "دوّر على مكان أو ماركة أو أكلة.",
  "explore.fetching": "نجيب أماكن هذي المنطقة…",
  "explore.closeMap": "إغلاق الخريطة",
  "explore.open": "افتح {name}",
  "explore.wainData": "بيانات وين",
  "explore.openNow": "مفتوح الحين",
  "explore.closed": "مسكّر",
  "explore.areaNone": "ما لقينا مطاعم في هذي المنطقة.",
  "explore.areaCount": "{n} مكان أكل في هذي المنطقة",
  "explore.nothingFound": "ما لقينا شي لـ «{q}» داخل ٥ كم.",
  "explore.googleDown": "بحث قوقل غير متاح — بيانات وين فقط.",
  "explore.fromReel": "من الريل: {name}",

  "analyzing.title": "نحلل صورتك…",
  "analyzing.back": "رجوع",
  "analyzing.step1": "نفهم الصورة",
  "analyzing.step1sub": "لوحات، شعارات، نصوص، أكل…",
  "analyzing.step2": "نتعرّف على المطعم",
  "analyzing.step2sub": "نقرأ اللي في الصورة…",
  "analyzing.step3": "ندوّر أماكن قريبة منك",
  "analyzing.step3sub": "قوقل بليسز · ٥ كم",
  "analyzing.step4": "نتأكد من المنيو والمعلومات",
  "analyzing.step4sub": "الموقع، إنستقرام، المنيو…",

  "place.back": "رجوع",
  "place.directions": "الاتجاهات",
  "place.menu": "المنيو",
  "place.instagram": "إنستقرام",
  "place.website": "الموقع",
  "place.call": "اتصال",
  "place.orderOn": "اطلب من {app}",
  "place.branches": "{n} فروع ثانية قريبة",
  "place.openNow": "مفتوح الحين",
  "place.closed": "مسكّر",
  "place.youSaw": "اللي شفته",
  "place.looksLike": "شكله",
  "place.fromMenu": "درهم (من المنيو)",
  "place.youSawLabel": "شفت: ",
  "place.thisPlace": "هذا المكان",
  "place.whatToTry": "شو تجرّب",
  "place.seeFullMenu": "المنيو كامل ←",
  "place.showLess": "عرض أقل",
  "place.findingMenu": "ندوّر منيوهم…",
  "place.noMenu": "ما عندنا منيوهم — اسأل وين",
  "place.sampleMenu": "منيو تجريبي",
  "place.fromWebsite": "من موقعهم",
  "place.menuFromWeb": "منيو من الإنترنت",
  "place.social": "شفناهم على السوشال",
  "place.findingCreators": "ندوّر كريتورز…",
  "place.mostOrdered": "الأكثر طلباً: {dish}",
  "place.sample": "تجريبي",
  "place.fromTheWeb": "من الإنترنت",
  "place.noCreators": "ما لقينا بوستات كريتورز — هذي حسابات المحل نفسه.",
  "place.reviews": "تقييمات قوقل",
  "place.askAbout": "اسأل عن {name}…",
  "place.noMenuAsk": "شو عندهم؟ ومنيوهم؟",

  "chat.placeholder": "اكتب بالخليجي، Arabizi أو English…",
  "chat.sourceMenu": "المصدر: المنيو",
  "chat.mic": "اسأل بصوتك — اضغط للتسجيل، واضغط مرة ثانية للإرسال",
  "chat.speak": "اسمع الرد",
  "chat.aboutPlace": "نجاوبك عن {name}.",
  "chat.prompt1": "شو أطلب؟ أبي شي حار تحت خمسين",
  "chat.prompt2": "وين أقرب مطعم مفتوح؟",
  "chat.prompt3": "shu fi 7awali?",
  "chat.listening": "نسجّل… اضغط المايك مرة ثانية",

  "reel.title": "لصق ريل",
  "reel.close": "إغلاق",
  "reel.intro":
    "الصق رابط ريل ووين يدوّر عنه على الإنترنت — الكريتور، الكابشن، المكان والأكلة — ويلقى المكان قريب منك. وإذا عندك النص، الصقه بعد.",
  "reel.transcriptPlaceholder": "اختياري: نص الريل (عربي، Arabizi أو English)…",
  "reel.findPlace": "لقّ لي هذا المكان",
  "reel.showMine": "اعرضه بلغتي",
  "reel.maps": "قوقل مابس",
  "reel.whatWebSaid": "شو قال الإنترنت",
  "reel.hideWebSaid": "إخفاء كلام الإنترنت",
  "reel.original": "الأصلي",
  "reel.localised": "بلهجتك",
  "reel.showOriginal": "اعرض الأصلي",
  "reel.showLocalised": "اعرضه بلهجتك",
  "reel.halal": "حلال",
  "reel.alcohol": "يقدّم كحول",
  "reel.pork": "لحم خنزير",

  "busy.searching": "ندوّر حولك…",
  "busy.transcribing": "نحوّل صوتك…",
  "busy.thinking": "…",
  "busy.reelLookup": "ندوّر عن الريل…",
  "busy.reelExtract": "نقرأ الريل…",
  "busy.localising": "نحوّله للهجتك…",
  "busy.reelReadingPost": "نقرأ البوست…",
  "busy.reelWeb": "ندوّر عن المكان بالإنترنت…",
  "busy.reelNear": "نلقاه قريب منك…",
  "busy.reelTranscript": "نقرأ النص…",
  "busy.reelFinding": "نلقى المكان قريب منك…",
  "busy.reelTranslating": "نترجم اللي قالوه…",

  "error.noRecorder": "المتصفح ما يسجّل صوت. اكتب بدال عنه.",
  "error.micDenied": "ما سمحت لنا بالمايك.",
  "error.transcribe": "ما قدرنا نفهم الصوت.",
  "error.reelUnknown":
    "ما عرفنا من وين هذا الريل — البوست مو مفهرس. الصق الكابشن أو النص، أو صورة، ونلقى لك المكان.",

  "lang.toggle": "EN",
  "lang.toggleAria": "Switch to English",
  "currency": "درهم",
  "unit.m": "م",
  "unit.km": "كم",
} as const;

export type Key = keyof typeof AR;

const EN: Record<Key, string> = {
  "nav.home": "WAIN",
  "nav.explore": "Explore",
  "nav.ask": "Ask",

  "home.see": "See it.",
  "home.ask": "Ask it.",
  "home.find": "Find it.",
  "home.subline":
    "Your AI guide to restaurants, powered by what you see, and how you speak.",
  "home.camera": "Camera",
  "home.upload": "Upload",
  "home.paste": "Paste Link",
  "home.askPlaceholder": "Ask WAIN…",
  "home.tryAsking": "Try asking",
  "home.setLocation": "set location",
  "home.lat": "lat",
  "home.lng": "lng",
  "home.profile": "Profile",

  "chips.1": "What should I order?",
  "chips.2": "Somewhere like this",
  "chips.3": "Family-friendly places",
  "chips.4": "Where can I have suhoor?",
  "chips.5": "Something spicy under 50",

  "gps.default": "default location (Al Maryah)",
  "gps.using": "using your GPS",
  "gps.unavailable": "GPS unavailable, using Al Maryah",
  "gps.manual": "manual location",

  "explore.placeholder": "كنتاكي · kentaki · الفنار · shawarma",
  "explore.find": "Find",
  "explore.empty": "Search for a place, a brand or a dish.",
  "explore.fetching": "fetching this area…",
  "explore.closeMap": "Close map",
  "explore.open": "Open {name}",
  "explore.wainData": "WAIN data",
  "explore.openNow": "open now",
  "explore.closed": "closed",
  "explore.areaNone": "No food places found in this area.",
  "explore.areaCount": "{n} food places in this area",
  "explore.nothingFound": "Nothing found for “{q}” within 5 km.",
  "explore.googleDown": "Google search unavailable — WAIN data only.",
  "explore.fromReel": "From the reel: {name}",

  "analyzing.title": "Analyzing your content…",
  "analyzing.back": "Back",
  "analyzing.step1": "Understanding the image",
  "analyzing.step1sub": "Signs, logos, text, food…",
  "analyzing.step2": "Identifying the restaurant",
  "analyzing.step2sub": "Reading what's in the frame…",
  "analyzing.step3": "Finding places near you",
  "analyzing.step3sub": "Google Places · 5 km",
  "analyzing.step4": "Checking menu & info",
  "analyzing.step4sub": "Website, Instagram, menu…",

  "place.back": "Back",
  "place.directions": "Directions",
  "place.menu": "Menu",
  "place.instagram": "Instagram",
  "place.website": "Website",
  "place.call": "Call",
  "place.orderOn": "Order on {app}",
  "place.branches": "{n} other branches nearby",
  "place.openNow": "Open now",
  "place.closed": "Closed",
  "place.youSaw": "You saw",
  "place.looksLike": "This looks like their",
  "place.fromMenu": "AED (from menu)",
  "place.youSawLabel": "You saw: ",
  "place.thisPlace": "this place",
  "place.whatToTry": "What to try",
  "place.seeFullMenu": "See full menu →",
  "place.showLess": "Show less",
  "place.findingMenu": "looking for their menu…",
  "place.noMenu": "No menu yet — ask WAIN",
  "place.sampleMenu": "sample menu",
  "place.fromWebsite": "from their website",
  "place.menuFromWeb": "menu found on the web",
  "place.social": "Seen on social",
  "place.findingCreators": "finding creators…",
  "place.mostOrdered": "most ordered: {dish}",
  "place.sample": "sample",
  "place.fromTheWeb": "from the web",
  "place.noCreators": "No creator posts found — here's the brand itself.",
  "place.reviews": "Google reviews",
  "place.askAbout": "Ask about {name}…",
  "place.noMenuAsk": "What do you know about this place and its menu?",

  "chat.placeholder": "Type in Khaleeji, Arabizi or English…",
  "chat.sourceMenu": "source: menu",
  "chat.mic": "Ask by voice — tap to record, tap again to send",
  "chat.speak": "Read this out loud",
  "chat.aboutPlace": "Answering about {name}.",
  "chat.prompt1": "What's good here under 50?",
  "chat.prompt2": "Where's the closest place open now?",
  "chat.prompt3": "shu fi 7awali?",
  "chat.listening": "recording… tap the mic again",

  "reel.title": "Paste a reel",
  "reel.close": "Close",
  "reel.intro":
    "Paste a reel link and WAIN looks it up on the web — creator, caption, place and dish — then finds that place near you. Add the transcript if you have it.",
  "reel.transcriptPlaceholder":
    "Optional: reel transcript (English, Khaleeji or Arabizi)…",
  "reel.findPlace": "Find this place",
  "reel.showMine": "Show it in my language",
  "reel.maps": "Google Maps",
  "reel.whatWebSaid": "what the web said",
  "reel.hideWebSaid": "hide what the web said",
  "reel.original": "original",
  "reel.localised": "localised",
  "reel.showOriginal": "show original",
  "reel.showLocalised": "show localised",
  "reel.halal": "halal",
  "reel.alcohol": "alcohol",
  "reel.pork": "pork",

  "busy.searching": "Searching nearby…",
  "busy.transcribing": "transcribing…",
  "busy.thinking": "…",
  "busy.reelLookup": "Looking up the reel…",
  "busy.reelExtract": "Extracting from the reel…",
  "busy.localising": "Localising…",
  "busy.reelReadingPost": "Reading the post…",
  "busy.reelWeb": "Searching the web for the place…",
  "busy.reelNear": "Finding it near you…",
  "busy.reelTranscript": "Reading the transcript…",
  "busy.reelFinding": "Finding the place near you…",
  "busy.reelTranslating": "Translating what they said…",

  "error.noRecorder": "This browser can't record audio. Type instead.",
  "error.micDenied": "Microphone permission denied.",
  "error.transcribe": "Could not transcribe that.",
  "error.reelUnknown":
    "Couldn't tell which place that reel is from — the post isn't indexed. Paste its caption or transcript, or send a screenshot, and I'll find the place.",

  "lang.toggle": "AR",
  "lang.toggleAria": "التبديل إلى العربية",
  "currency": "AED",
  "unit.m": "m",
  "unit.km": "km",
};

const DICTS: Record<Lang, Record<Key, string>> = { ar: AR, en: EN };

export type Translate = (key: Key, vars?: Record<string, string | number>) => string;

type LangValue = {
  lang: Lang;
  dir: "rtl" | "ltr";
  t: Translate;
  setLang: (l: Lang) => void;
};

const LangContext = createContext<LangValue | null>(null);

const STORAGE_KEY = "wain.lang";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

export function LangProvider({ children }: { children: React.ReactNode }) {
  // The server always renders Arabic; a saved English preference is read after
  // hydration rather than as initial state, so the markup still matches.
  const saved = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(STORAGE_KEY),
    () => null,
  );
  const [chosen, setChosen] = useState<Lang | null>(null);
  const lang: Lang = chosen ?? (saved === "en" ? "en" : "ar");

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setChosen(l);
    window.localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const value = useMemo<LangValue>(() => {
    const dict = DICTS[lang];
    const t: Translate = (key, vars) => {
      const raw = dict[key];
      if (!vars) return raw;
      return Object.entries(vars).reduce(
        (s, [k, v]) => s.replaceAll(`{${k}}`, String(v)),
        raw,
      );
    };
    return { lang, dir: lang === "ar" ? "rtl" : "ltr", t, setLang };
  }, [lang, setLang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside LangProvider");
  return ctx;
}
