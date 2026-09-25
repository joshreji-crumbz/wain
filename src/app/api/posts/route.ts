import { getPlace, getPosts } from "@/lib/data";
import { askJson } from "@/lib/llm";
import type { Post } from "@/lib/types";

type Summaries = { summaries: { index: number; summary: string }[] };

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summaries: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { index: { type: "number" }, summary: { type: "string" } },
        required: ["index", "summary"],
      },
    },
  },
  required: ["summaries"],
};

function rank(a: Post, b: Post): number {
  const score = (p: Post) =>
    (p.lang.startsWith("ar") || p.lang === "arabizi" ? 2 : 0) +
    (p.creator_region === "gulf" ? 1 : 0);
  const diff = score(b) - score(a);
  if (diff !== 0) return diff;
  return b.posted.localeCompare(a.posted);
}

export async function POST(request: Request) {
  const { placeId, register } = (await request.json()) as {
    placeId: string;
    register: string;
  };
  const place = getPlace(placeId);
  if (!place) return Response.json({ error: "unknown place" }, { status: 404 });

  const ranked = [...getPosts(placeId)].sort(rank);

  const target =
    register === "english"
      ? "natural casual English"
      : register === "arabizi"
        ? "Gulf Arabizi (Latin letters with 3/7/5 digits)"
        : "natural spoken Khaleeji Arabic, never Modern Standard Arabic";

  let summaries: Record<number, string> = {};
  if (ranked.length > 0) {
    const result = await askJson<Summaries>({
      instructions: `For each numbered creator post about a Gulf restaurant, write ONE short line in ${target} saying what they ordered and what they thought. Prices in AED. Base it only on the post text.`,
      content: ranked
        .map((p, i) => `${i}. [${p.lang}] ${p.transcript}`)
        .join("\n"),
      schemaName: "post_summaries",
      schema: SCHEMA,
    });
    summaries = Object.fromEntries(
      result.summaries.map((s) => [s.index, s.summary]),
    );
  }

  const counts = new Map<string, number>();
  for (const p of ranked) {
    for (const d of p.dishes_mentioned) counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  const mostOrdered = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];

  return Response.json({
    posts: ranked.map((p, i) => ({ ...p, summary: summaries[i] ?? p.transcript })),
    most_ordered: mostOrdered
      ? { dish: mostOrdered[0], count: mostOrdered[1] }
      : null,
  });
}
