import { findDraft } from "@/lib/store";
import { renderPosterSvg } from "@/lib/poster";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const draft = findDraft(id);
  if (!draft) return new Response("Not found", { status: 404 });

  return new Response(renderPosterSvg(draft), {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "private, max-age=300",
    },
  });
}
