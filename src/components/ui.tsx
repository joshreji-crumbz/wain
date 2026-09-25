import type { Lang, Translate } from "@/lib/i18n";

export function isRtl(text: string) {
  return /[\u0600-\u06FF]/.test(text);
}

export function Spinner() {
  return (
    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-[#F2A23A]" />
  );
}

export function metres(d: number | null | undefined, t?: Translate) {
  if (d === null || d === undefined) return "";
  const unit = d < 1000 ? (t ? t("unit.m") : "m") : t ? t("unit.km") : "km";
  return d < 1000 ? `${d} ${unit}` : `${(d / 1000).toFixed(1)} ${unit}`;
}

/** Arabic reads first in Arabic; the other spelling stays as the subtitle. */
export function names(
  x: { name_en: string; name_ar: string },
  lang: Lang,
): { primary: string; secondary: string } {
  const arabicFirst = lang === "ar" && !!x.name_ar;
  return {
    primary: arabicFirst ? x.name_ar : x.name_en,
    secondary: arabicFirst ? x.name_en : x.name_ar,
  };
}

export function price(aed: number, lang: Lang) {
  return lang === "ar" ? `${aed} درهم` : `AED ${aed}`;
}

const DISH_IMAGES: { test: RegExp; file: string }[] = [
  { test: /burger|slider|patty/i, file: "burger" },
  { test: /chicken|wings|nashville|دجاج|tender/i, file: "chicken" },
  { test: /hummus|mezze|falafel|labneh|حمص|متبل|fattoush|salad/i, file: "mezze" },
  { test: /kebab|grill|shawarma|mixed|lamb|kofta|مشاوي|شاورما|steak/i, file: "grill" },
  { test: /kunafa|dessert|cake|ice|baklava|حلو|كنافة|sweet/i, file: "dessert" },
];

/** Menus have no photos, so each dish falls back to a warm image for its category. */
export function dishImage(name: string) {
  const hit = DISH_IMAGES.find((d) => d.test.test(name));
  return `/dish-${hit?.file ?? "generic"}.jpg`;
}
