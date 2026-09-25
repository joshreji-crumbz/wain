export function isRtl(text: string) {
  return /[\u0600-\u06FF]/.test(text);
}

export function Spinner() {
  return (
    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-amber-400" />
  );
}

export function metres(d: number | null | undefined) {
  if (d === null || d === undefined) return "";
  return d < 1000 ? `${d} m` : `${(d / 1000).toFixed(1)} km`;
}
