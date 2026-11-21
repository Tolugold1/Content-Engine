import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { fileURLToPath } from "node:url";
import type { VideoProps } from "./props";

export interface RenderOptions {
  /** Path to Chrome/Chromium; omit to let Remotion download its own headless shell. */
  browserExecutable?: string | null;
  licenseKey?: string | null;
  onProgress?: (progress: number) => void;
}

let serveUrl: Promise<string> | undefined;

/** Bundles the compositions once per process; later renders reuse the bundle. */
function getServeUrl(): Promise<string> {
  serveUrl ??= bundle({ entryPoint: fileURLToPath(new URL("./remotion/index.ts", import.meta.url)) });
  return serveUrl;
}

export async function renderVideoFile(props: VideoProps, outputLocation: string, options: RenderOptions = {}): Promise<void> {
  const url = await getServeUrl();
  const inputProps = props as unknown as Record<string, unknown>;
  const browserExecutable = options.browserExecutable ?? null;
  const composition = await selectComposition({ serveUrl: url, id: "GoldenGist", inputProps, browserExecutable });
  await renderMedia({
    composition,
    serveUrl: url,
    codec: "h264",
    crf: 20,
    audioCodec: "aac",
    outputLocation,
    inputProps,
    browserExecutable,
    licenseKey: options.licenseKey ?? null,
    concurrency: 2,
    onProgress: ({ progress }) => options.onProgress?.(progress),
  });
}

export async function renderStillFile(props: VideoProps, outputLocation: string, options: RenderOptions = {}): Promise<void> {
  const url = await getServeUrl();
  const inputProps = props as unknown as Record<string, unknown>;
  const browserExecutable = options.browserExecutable ?? null;
  const composition = await selectComposition({ serveUrl: url, id: "GoldenGistStill", inputProps, browserExecutable });
  await renderStill({ composition, serveUrl: url, output: outputLocation, inputProps, browserExecutable, imageFormat: "png" });
}
