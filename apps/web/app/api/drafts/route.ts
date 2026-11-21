import { DraftStatus, Tone } from "@content-engine/core";
import { getRepository } from "@content-engine/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { handle } from "@/lib/api";

const Query = z.object({
  status: DraftStatus.optional(),
  tone: Tone.optional(),
  q: z.string().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

/** GET /api/drafts?status=&tone=&q=&limit= — newest first. */
export async function GET(request: Request) {
  return handle(async () => {
    const query = Query.parse(Object.fromEntries(new URL(request.url).searchParams));
    const drafts = await getRepository().listDrafts(query);
    return NextResponse.json({ data: drafts });
  });
}
