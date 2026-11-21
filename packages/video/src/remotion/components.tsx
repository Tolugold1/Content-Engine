import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { TimedWord, VideoProps } from "../props";
import { CREAM, FONT, GOLD, goldGradientText, INK, MOTION } from "./theme";

/** Shared building blocks for the video and the still. */

export function Background({ accent }: { accent: string }) {
  const frame = useCurrentFrame();
  const drift = (frame * 0.6) % 96;
  return (
    <AbsoluteFill style={{ backgroundColor: INK }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(70% 45% at 50% 30%, ${GOLD}55, transparent 70%), radial-gradient(50% 30% at 85% 90%, ${accent}33, transparent 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          top: "62%",
          backgroundImage: `linear-gradient(${GOLD}38 2px, transparent 2px), linear-gradient(90deg, ${GOLD}38 2px, transparent 2px)`,
          backgroundSize: "96px 96px",
          backgroundPosition: `0 ${drift}px`,
          transform: "perspective(700px) rotateX(62deg)",
          transformOrigin: "top center",
          maskImage: "linear-gradient(to bottom, black, transparent 85%)",
        }}
      />
    </AbsoluteFill>
  );
}

export function BrandBar({ props }: { props: Pick<VideoProps, "series" | "templateName" | "accent"> }) {
  return (
    <div style={{ position: "absolute", top: 110, width: "100%", textAlign: "center", fontFamily: FONT }}>
      <div style={{ ...goldGradientText, fontSize: 54, fontWeight: 900, letterSpacing: 12 }}>{props.series.toUpperCase()}</div>
      <div
        style={{
          display: "inline-block",
          marginTop: 22,
          padding: "12px 30px",
          borderRadius: 999,
          border: `3px solid ${props.accent}AA`,
          background: `${props.accent}22`,
          color: props.accent,
          fontSize: 32,
          fontWeight: 700,
        }}
      >
        {props.templateName}
      </div>
    </div>
  );
}

export function Watermark({ handle }: { handle: string }) {
  return (
    <div
      style={{
        position: "absolute",
        right: 48,
        bottom: 64,
        display: "flex",
        alignItems: "center",
        gap: 14,
        fontFamily: FONT,
        opacity: 0.9,
      }}
    >
      <Coin size={56} />
      <span style={{ color: CREAM, fontSize: 32, fontWeight: 700 }}>{handle}</span>
    </div>
  );
}

export function Coin({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        background: `radial-gradient(circle at 35% 30%, #FBEAB0, ${GOLD} 45%, #7A5C18)`,
        color: "#2A1F06",
        fontWeight: 900,
        fontSize: size * 0.5,
        fontFamily: FONT,
      }}
    >
      G
    </div>
  );
}

export function ProgressBar({ durationSec }: { durationSec: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = Math.min(1, frame / (durationSec * fps));
  return <div style={{ position: "absolute", top: 0, left: 0, height: 10, width: `${progress * 100}%`, background: GOLD }} />;
}

/** Pops in with the template's spring. */
export function Pop({
  children,
  delay = 0,
  tone,
  style,
}: {
  children: ReactNode;
  delay?: number;
  tone: VideoProps["tone"];
  style?: CSSProperties;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const motion = MOTION[tone];
  const progress = spring({ frame: frame - delay, fps, config: { damping: motion.damping, stiffness: motion.stiffness } });
  return <div style={{ ...style, transform: `scale(${0.6 + progress * 0.4})`, opacity: progress }}>{children}</div>;
}

export function Card({ children, accent, style }: { children: ReactNode; accent: string; style?: CSSProperties }) {
  return (
    <div
      style={{
        margin: "0 80px",
        padding: "40px 48px",
        borderRadius: 40,
        background: "rgba(255,255,255,0.06)",
        border: `3px solid ${accent}66`,
        boxShadow: `0 30px 80px -30px ${GOLD}66`,
        color: CREAM,
        fontFamily: FONT,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Groups words into short caption lines that change on punctuation or every five words. */
export function chunkWords(words: TimedWord[], maxWords = 5): TimedWord[][] {
  const chunks: TimedWord[][] = [];
  let current: TimedWord[] = [];
  for (const word of words) {
    current.push(word);
    if (current.length >= maxWords || /[.!?,]$/.test(word.text)) {
      chunks.push(current);
      current = [];
    }
  }
  if (current.length) chunks.push(current);
  return chunks;
}

/** Word-by-word captions: the line on screen follows the voice, the spoken word lights up gold. */
export function Captions({ chunks, tone, hideBefore = 0 }: { chunks: TimedWord[][]; tone: VideoProps["tone"]; hideBefore?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;
  if (time < hideBefore) return null;
  const chunk = chunks.find((line) => time >= (line[0]?.start ?? 0) - 0.05 && time <= (line.at(-1)?.end ?? 0) + 0.25);
  if (!chunk) return null;
  // Exactly one active word: the last one that has started.
  const activeIndex = chunk.reduce((found, word, i) => (time >= word.start ? i : found), -1);
  const scale = MOTION[tone].captionScale;
  return (
    <div style={{ position: "absolute", top: "58%", width: "100%", padding: "0 70px", textAlign: "center", fontFamily: FONT }}>
      {chunk.map((word, i) => {
        const active = i === activeIndex;
        return (
          <span
            key={`${word.start}-${i}`}
            style={{
              display: "inline-block",
              margin: "0 18px",
              fontSize: 84,
              fontWeight: 900,
              lineHeight: 1.15,
              color: active ? GOLD : "#FFFFFF",
              transform: `scale(${active ? scale : 1})`,
              textShadow: "0 6px 24px rgba(0,0,0,0.8)",
            }}
          >
            {word.text}
          </span>
        );
      })}
    </div>
  );
}

/** Gold shimmer with the series name, shown once just after the hook. */
export function BrandSting({ series, handle }: { series: string; handle: string }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const sweep = interpolate(frame, [0, durationInFrames], [-60, 160]);
  const opacity = interpolate(frame, [0, 6, durationInFrames - 6, durationInFrames], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity, fontFamily: FONT }}>
      <div
        style={{
          padding: "26px 60px",
          borderRadius: 30,
          background: `linear-gradient(100deg, ${INK} ${sweep - 30}%, ${GOLD} ${sweep}%, ${INK} ${sweep + 30}%)`,
          border: `3px solid ${GOLD}`,
          color: CREAM,
          fontSize: 48,
          fontWeight: 900,
          letterSpacing: 6,
        }}
      >
        {series.toUpperCase()} <span style={{ fontWeight: 500, letterSpacing: 0 }}>by {handle.replace("@", "")}</span>
      </div>
    </AbsoluteFill>
  );
}
