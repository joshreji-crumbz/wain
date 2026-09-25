import OpenAI from "openai";
import { WAIN_MODEL } from "./config";

let client: OpenAI | null = null;

export function openai(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    client = new OpenAI({ apiKey });
  }
  return client;
}

type ContentPart =
  | { type: "input_text"; text: string }
  | { type: "input_image"; image_url: string; detail: "auto" };

export async function askJson<T>({
  instructions,
  content,
  schemaName,
  schema,
}: {
  instructions: string;
  content: string | ContentPart[];
  schemaName: string;
  schema: Record<string, unknown>;
}): Promise<T> {
  const response = await openai().responses.create({
    model: WAIN_MODEL,
    instructions,
    input: [
      {
        role: "user",
        content:
          typeof content === "string"
            ? [{ type: "input_text" as const, text: content }]
            : content,
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: schemaName,
        strict: true,
        schema,
      },
    },
  });
  return JSON.parse(response.output_text) as T;
}

export async function askText({
  instructions,
  content,
}: {
  instructions: string;
  content: string;
}): Promise<string> {
  const response = await openai().responses.create({
    model: WAIN_MODEL,
    instructions,
    input: content,
  });
  return response.output_text;
}

export function imagePart(dataUrl: string): ContentPart {
  return { type: "input_image", image_url: dataUrl, detail: "auto" };
}

export function textPart(text: string): ContentPart {
  return { type: "input_text", text };
}
