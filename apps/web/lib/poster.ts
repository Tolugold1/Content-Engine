import { BRAND, TEMPLATE_BY_TONE, type Draft } from "@content-engine/core";

/**
 * Renders a 1080x1920 still for a draft as SVG. In production the renderer
 * exports a PNG still next to the MP4; in sample mode this stands in for it.
 */

function escapeXml(text: string): string {
  return text.replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[char]!);
}

function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1]}…`;
    return kept;
  }
  return lines;
}

export function renderPosterSvg(draft: Pick<Draft, "hook" | "tone" | "engagementQuestion" | "trend">): string {
  const template = TEMPLATE_BY_TONE[draft.tone];
  const lines = wrap(draft.hook.toUpperCase(), 15, 5);
  const lineHeight = 132;
  const startY = 960 - ((lines.length - 1) * lineHeight) / 2;
  const question = wrap(draft.engagementQuestion, 34, 2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs>
    <radialGradient id="glow" cx="50%" cy="38%" r="70%">
      <stop offset="0%" stop-color="${BRAND.gold}" stop-opacity="0.38"/>
      <stop offset="55%" stop-color="${BRAND.gold}" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="${BRAND.black}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F7E7A9"/>
      <stop offset="50%" stop-color="${BRAND.gold}"/>
      <stop offset="100%" stop-color="#8C6B1F"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1920" fill="${BRAND.black}"/>
  <rect width="1080" height="1920" fill="url(#glow)"/>
  <rect x="36" y="36" width="1008" height="1848" rx="56" fill="none" stroke="url(#gold)" stroke-width="4" opacity="0.7"/>
  <text x="540" y="210" text-anchor="middle" font-family="Arial Black, Helvetica, sans-serif" font-weight="900" font-size="64" letter-spacing="10" fill="url(#gold)">${escapeXml(BRAND.series.toUpperCase())}</text>
  <text x="540" y="270" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="34" fill="#F7F3E8" opacity="0.8">by ${escapeXml(BRAND.name)}</text>
  <rect x="${540 - template.name.length * 13 - 40}" y="380" width="${template.name.length * 26 + 80}" height="76" rx="38" fill="${template.accent}" fill-opacity="0.16" stroke="${template.accent}" stroke-opacity="0.7" stroke-width="2"/>
  <text x="540" y="430" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="34" fill="${template.accent}">${escapeXml(template.name)}</text>
  ${lines
    .map(
      (line, index) =>
        `<text x="540" y="${startY + index * lineHeight}" text-anchor="middle" font-family="Arial Black, Helvetica, sans-serif" font-weight="900" font-size="104" fill="#FFFFFF">${escapeXml(line)}</text>`,
    )
    .join("\n  ")}
  <rect x="140" y="1520" width="800" height="${question.length * 52 + 70}" rx="32" fill="#FFFFFF" fill-opacity="0.06" stroke="${BRAND.gold}" stroke-opacity="0.35"/>
  ${question
    .map(
      (line, index) =>
        `<text x="540" y="${1580 + index * 52}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="40" fill="#F7F3E8">${escapeXml(line)}</text>`,
    )
    .join("\n  ")}
  <text x="540" y="1800" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="38" fill="url(#gold)">#GoldenGist</text>
</svg>`;
}
