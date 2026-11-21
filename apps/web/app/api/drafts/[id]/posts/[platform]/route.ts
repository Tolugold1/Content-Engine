import { Platform } from "@content-engine/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { handle, readJson } from "@/lib/api";
import { reviews } from "@/lib/service";

const Body = z.object({ url: z.string().max(2_000) });

/** PUT /api/drafts/:id/posts/:platform — records where the video went live (idempotent per platform). */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string; platform: string }> }) {
  return handle(async () => {
    const { id, platform } = await params;
    const { url } = await readJson(request, Body);
    const draft = await reviews().recordPost(id, Platform.parse(platform), url);
    return NextResponse.json({ data: draft });
  });
}
