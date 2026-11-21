import { readFile } from "node:fs/promises";
import path from "node:path";
import { findDraft } from "@/lib/store";
import { renderPosterSvg } from "@/lib/poster";

/**
 * Download the finished video or still.
 *
 * Production: redirect to a short-lived signed R2 URL with
 * Content-Disposition: attachment, so files never pass through this server.
 * Sample mode: serve the bundled sample clip and the generated SVG still.
 */
const SAMPLE_VIDEO = path.join(process.cwd(), "public", "sample", "golden-gist-sample.mp4");

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const draft = findDraft(id);
  if (!draft) return new Response("Not found", { status: 404 });

  const kind = new URL(request.url).searchParams.get("kind") === "still" ? "still" : "video";
  const base = `golden-gist-${draft.slug}`;

  if (kind === "still") {
    if (!draft.stillUrl) return new Response("No still yet", { status: 409 });
    return new Response(renderPosterSvg(draft), {
      headers: {
        "content-type": "image/svg+xml; charset=utf-8",
        "content-disposition": `attachment; filename="${base}-still.svg"`,
      },
    });
  }

  if (!draft.videoUrl) return new Response("This draft has no finished video yet", { status: 409 });
  if (/^https?:\/\//.test(draft.videoUrl)) return Response.redirect(draft.videoUrl, 302);

  const file = await readFile(SAMPLE_VIDEO);
  return new Response(new Uint8Array(file), {
    headers: {
      "content-type": "video/mp4",
      "content-length": String(file.byteLength),
      "content-disposition": `attachment; filename="${base}.mp4"`,
    },
  });
}
