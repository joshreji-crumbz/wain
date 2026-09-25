import { WAIN_STT_MODEL } from "@/lib/config";
import { openai } from "@/lib/llm";

export async function POST(request: Request) {
  const form = await request.formData();
  const audio = form.get("audio");
  if (!(audio instanceof File)) {
    return Response.json({ error: "audio required" }, { status: 400 });
  }

  const transcription = await openai().audio.transcriptions.create({
    file: audio,
    model: WAIN_STT_MODEL,
    prompt:
      "Gulf Arabic (Khaleeji) or English speech about restaurants and food in the UAE. Dish and restaurant names may be English words spoken inside an Arabic sentence. Transcribe exactly what is said, in the language it is said.",
  });

  return Response.json({ text: transcription.text.trim() });
}
