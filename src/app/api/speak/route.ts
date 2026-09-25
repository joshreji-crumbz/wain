import { WAIN_TTS_MODEL } from "@/lib/config";
import { openai } from "@/lib/llm";

/** Arabic script anywhere means the reply should be read as Gulf Arabic. */
function isArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

/** The voice misreads Arabic-Indic digits (٦٨ becomes 660), Latin ones it gets right. */
function latinDigits(text: string): string {
  return text.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (d) =>
    String((d.codePointAt(0) ?? 0) % 16),
  );
}

export async function POST(request: Request) {
  const { text } = (await request.json()) as { text?: string };
  if (!text?.trim()) return Response.json({ error: "text required" }, { status: 400 });

  const speech = await openai().audio.speech.create({
    model: WAIN_TTS_MODEL,
    voice: "alloy",
    input: latinDigits(text).slice(0, 1200),
    instructions: isArabic(text)
      ? "Speak Gulf Arabic (Khaleeji) the way someone from the UAE speaks it — relaxed, friendly, not a news reader. Read Latin restaurant and dish names naturally inside the Arabic sentence."
      : "Speak in a warm, friendly Gulf-English accent, relaxed and conversational. Read Arabic names naturally.",
    response_format: "mp3",
  });

  return new Response(await speech.arrayBuffer(), {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
  });
}
