import { places } from "@/lib/data";

export async function GET() {
  return Response.json({ places });
}
