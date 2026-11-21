import { NextResponse } from "next/server";
import { z } from "zod";
import { handle, readJson } from "@/lib/api";
import { reviews } from "@/lib/service";

const Body = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("approved") }),
  z.object({ decision: z.literal("rejected"), reason: z.string().trim().min(1).max(500) }),
]);

/**
 * POST /api/drafts/:id/review — records the decision once.
 * 200 with the draft, 409 if Telegram (or another tab) decided first, 422 if the rules forbid it.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const body = await readJson(request, Body);
    const draft = await reviews().review((await params).id, { ...body, channel: "web" });
    return NextResponse.json({ data: draft });
  });
}
