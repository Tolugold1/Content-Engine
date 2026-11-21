import { getRepository } from "@content-engine/db";
import { getStorage } from "@content-engine/media";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { handle, problem } from "@/lib/api";
import { renderPosterSvg } from "@/lib/poster";

const Kind = z.enum(["video", "still"]);
const SAMPLE_VIDEO = path.join(process.cwd(), "public", "sample", "golden-gist-sample.mp4");

/**
 * GET /api/drafts/:id/media/:kind[?download=1]
 * Redirects to a short-lived signed R2 link (inline, or as a download).
 * In sample mode it serves the bundled sample clip and a generated still.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string; kind: string }> }) {
  return handle(async () => {
    const { id, kind: rawKind } = await params;
    const kind = Kind.parse(rawKind);
    const draft = await getRepository().getDraft(id);
    if (!draft) return problem(404, "Draft not found");
    const key = draft.media[kind];
    if (!key) return problem(409, "Not rendered yet", `This draft has no ${kind} yet.`);

    const download = new URL(request.url).searchParams.get("download") === "1";
    const sample = key.startsWith("sample:");
    const extension = kind === "video" ? "mp4" : sample ? "svg" : "png";
    const filename = `golden-gist-${draft.slug}.${extension}`;

    if (sample) {
      const body = kind === "video" ? new Uint8Array(await readFile(SAMPLE_VIDEO)) : renderPosterSvg(draft);
      return new Response(body, {
        headers: {
          "content-type": kind === "video" ? "video/mp4" : "image/svg+xml; charset=utf-8",
          "content-disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
          "cache-control": "private, max-age=300",
        },
      });
    }

    const url = await getStorage().signedUrl(key, { expiresInSeconds: 900, ...(download ? { downloadName: filename } : {}) });
    return Response.redirect(url, 302);
  });
}
