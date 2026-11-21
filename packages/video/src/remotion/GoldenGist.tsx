import { useMemo } from "react";
import { AbsoluteFill, Audio, Sequence, useVideoConfig } from "remotion";
import type { VideoProps } from "../props";
import { Background, BrandBar, BrandSting, Captions, chunkWords, Coin, ProgressBar, Watermark } from "./components";
import { OutroCard, SceneVisual } from "./scenes";
import { FONT, CREAM, GOLD, goldGradientText } from "./theme";

const STING_SECONDS = 1.2;

/** The Golden Gist vertical video: hook first, brand sting after it, captions synced to the voice. */
export function GoldenGist(props: VideoProps) {
  const { fps } = useVideoConfig();
  const chunks = useMemo(() => chunkWords(props.words), [props.words]);
  const frames = (seconds: number) => Math.max(1, Math.round(seconds * fps));
  const hookEnd = props.scenes[0]?.end ?? 2;

  return (
    <AbsoluteFill>
      <Background accent={props.accent} />
      {props.audioUrl ? <Audio src={props.audioUrl} /> : null}
      <BrandBar props={props} />

      {props.scenes.map((scene, index) => (
        <Sequence key={index} from={frames(scene.start)} durationInFrames={frames(scene.end - scene.start)} name={`Scene ${index + 1}`}>
          <SceneVisual scene={scene} index={index} props={props} />
        </Sequence>
      ))}

      <Sequence from={frames(hookEnd - 0.2)} durationInFrames={frames(STING_SECONDS)} name="Brand sting">
        <BrandSting series={props.series} handle={props.handle} />
      </Sequence>

      <Sequence from={frames(props.outroStart)} name="Outro">
        <OutroCard props={props} />
      </Sequence>

      {/* Scene 1 shows the hook as a big title, so captions start after it. */}
      <Captions chunks={chunks} tone={props.tone} hideBefore={hookEnd} />
      <Watermark handle={props.handle} />
      <ProgressBar durationSec={props.durationSec} />
    </AbsoluteFill>
  );
}

/** The still for feeds and thumbnails: same brand pieces, no motion. */
export function GoldenGistStill(props: VideoProps) {
  return (
    <AbsoluteFill>
      <Background accent={props.accent} />
      <BrandBar props={props} />
      <div style={{ position: "absolute", top: 560, width: "100%", padding: "0 80px", textAlign: "center", fontFamily: FONT }}>
        <div style={{ fontSize: 108, fontWeight: 900, lineHeight: 1.05, color: "#FFFFFF", textTransform: "uppercase" }}>{props.hook}</div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 300,
          left: 120,
          right: 120,
          padding: "36px 40px",
          borderRadius: 36,
          border: `3px solid ${GOLD}66`,
          background: "rgba(255,255,255,0.06)",
          textAlign: "center",
          fontFamily: FONT,
        }}
      >
        <div style={{ color: CREAM, fontSize: 46, fontWeight: 800 }}>{props.question}</div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 190,
          width: "100%",
          textAlign: "center",
          fontFamily: FONT,
          fontSize: 40,
          fontWeight: 800,
          ...goldGradientText,
        }}
      >
        {props.hashtag}
      </div>
      <div style={{ position: "absolute", right: 48, bottom: 64, display: "flex", alignItems: "center", gap: 14 }}>
        <Coin size={56} />
        <span style={{ color: CREAM, fontFamily: FONT, fontSize: 32, fontWeight: 700 }}>{props.handle}</span>
      </div>
    </AbsoluteFill>
  );
}
