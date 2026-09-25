export function isRtl(text: string) {
  return /[\u0600-\u06FF]/.test(text);
}

export function Spinner() {
  return (
    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-[#F2A23A]" />
  );
}

export function metres(d: number | null | undefined) {
  if (d === null || d === undefined) return "";
  return d < 1000 ? `${d} m` : `${(d / 1000).toFixed(1)} km`;
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
