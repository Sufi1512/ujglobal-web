import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { CONTENT_TAGS, type ContentTag } from "@/lib/content";

/*
 * Called by the API's background worker after an editor changes content, so cached public pages refresh
 * straight away. Protected by a secret shared with the API (REVALIDATE_SECRET in both).
 */

function secretMatches(given: string | null): boolean {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!secretMatches(request.headers.get("x-revalidate-secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let tags: unknown;
  try {
    tags = (await request.json()).tags;
  } catch {
    return NextResponse.json({ error: "Body must be JSON: {\"tags\": [...]}" }, { status: 400 });
  }
  const known = Array.isArray(tags)
    ? tags.filter((tag): tag is ContentTag => (CONTENT_TAGS as readonly string[]).includes(tag))
    : [];
  if (known.length === 0) {
    return NextResponse.json({ error: `tags must include one of: ${CONTENT_TAGS.join(", ")}` }, { status: 400 });
  }
  for (const tag of known) revalidateTag(tag);
  return NextResponse.json({ revalidated: known });
}
