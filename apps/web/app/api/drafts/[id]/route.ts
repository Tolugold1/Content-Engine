import { getRepository } from "@content-engine/db";
import { NextResponse } from "next/server";
import { handle, problem } from "@/lib/api";

/** GET /api/drafts/:id — one draft with claims, evidence, review, posts, metrics and timeline. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const draft = await getRepository().getDraft((await params).id);
    return draft ? NextResponse.json({ data: draft }) : problem(404, "Draft not found");
  });
}
