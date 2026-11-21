import { Platform } from "@content-engine/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { handle, readJson } from "@/lib/api";
import { reviews } from "@/lib/service";

const Body = z.object({ text: z.string().max(70_000) });

/** PUT /api/drafts/:id/captions/:platform — replaces one caption (idempotent). */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string; platform: string }> }) {
  return handle(async () => {
    const { id, platform } = await params;
    const { text } = await readJson(request, Body);
    const draft = await reviews().editCaption(id, Platform.parse(platform), text, "web");
    return NextResponse.json({ data: draft });
  });
}
