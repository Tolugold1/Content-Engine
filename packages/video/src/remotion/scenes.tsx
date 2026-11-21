import { interpolate, useCurrentFrame } from "remotion";
import type { VideoProps, VideoScene } from "../props";
import { Card, Pop } from "./components";
import { CREAM, FONT, GOLD, goldGradientText } from "./theme";

type Kind = "title" | "poll" | "quote" | "sources" | "score" | "plain";

/** The writer's free-text "visual" note picks a layout; anything unknown falls back to captions only. */
export function visualKind(visual: string, index: number): Kind {
  const v = visual.toLowerCase();
  if (v.includes("poll") || v.includes("question")) return "poll";
  if (v.includes("reaction") || v.includes("quote") || v.includes("take")) return "quote";
  if (v.includes("source")) return "sources";
  if (v.includes("score")) return "score";
  if (index === 0 || v.includes("title")) return "title";
  return "plain";
}

function detail(visual: string): string | null {
  const [, rest] = visual.split(/:(.+)/);
  return rest?.trim() || null;
}

const TOP = { position: "absolute" as const, top: 330, width: "100%" };

export function SceneVisual({ scene, index, props }: { scene: VideoScene; index: number; props: VideoProps }) {
  const kind = visualKind(scene.visual, index);
  const frame = useCurrentFrame();

  switch (kind) {
    case "title":
      return (
        <Pop tone={props.tone} style={{ ...TOP, padding: "0 70px", textAlign: "center" }}>
          <div style={{ fontFamily: FONT, fontSize: 96, fontWeight: 900, lineHeight: 1.05, color: "#FFFFFF", textTransform: "uppercase" }}>
            {index === 0 ? props.hook : (detail(scene.visual) ?? "")}
          </div>
        </Pop>
      );
    case "poll":
      return (
        <Pop tone={props.tone} style={TOP}>
          <Card accent={props.accent} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 34, fontWeight: 700, color: props.accent, letterSpacing: 4 }}>YOUR TAKE</div>
            <div style={{ marginTop: 18, fontSize: 58, fontWeight: 900, lineHeight: 1.15 }}>{props.question}</div>
          </Card>
        </Pop>
      );
    case "quote":
      return (
        <Pop tone={props.tone} style={TOP}>
          <Card accent={props.accent}>
            <div style={{ fontSize: 30, color: props.accent, fontWeight: 700 }}>What people are saying</div>
            <div style={{ marginTop: 16, fontSize: 52, fontWeight: 800, lineHeight: 1.2 }}>“{detail(scene.visual) ?? scene.text}”</div>
          </Card>
        </Pop>
      );
    case "sources":
      return (
        <div style={{ ...TOP, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 22, padding: "0 70px" }}>
          <div
            style={{ width: "100%", textAlign: "center", fontFamily: FONT, fontSize: 34, fontWeight: 700, color: GOLD, letterSpacing: 4 }}
          >
            SOURCES
          </div>
          {(props.sources.length ? props.sources : ["Unconfirmed: social media only"]).slice(0, 4).map((source, i) => (
            <Pop key={source} tone={props.tone} delay={i * 6}>
              <div
                style={{
                  padding: "16px 30px",
                  borderRadius: 999,
                  border: `3px solid ${GOLD}88`,
                  color: CREAM,
                  fontFamily: FONT,
                  fontSize: 40,
                  fontWeight: 700,
                  background: "rgba(0,0,0,0.4)",
                }}
              >
                {source}
              </div>
            </Pop>
          ))}
        </div>
      );
    case "score": {
      const score = scene.visual.match(/(\d+)\s*[-–]\s*(\d+)/);
      const pulse = 1 + Math.sin(frame / 4) * 0.02;
      return (
        <Pop tone={props.tone} style={{ ...TOP, textAlign: "center" }}>
          <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 800, color: props.accent, letterSpacing: 8 }}>MATCHDAY</div>
          <div
            style={{ ...goldGradientText, fontFamily: FONT, fontSize: score ? 220 : 120, fontWeight: 900, transform: `scale(${pulse})` }}
          >
            {score ? `${score[1]} – ${score[2]}` : "LIVE"}
          </div>
        </Pop>
      );
    }
    case "plain": {
      const glow = interpolate(frame % 60, [0, 30, 60], [0.2, 0.5, 0.2]);
      return <div style={{ ...TOP, height: 8, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`, opacity: glow }} />;
    }
  }
}

export function OutroCard({ props }: { props: VideoProps }) {
  return (
    <Pop tone={props.tone} style={{ ...TOP, textAlign: "center" }}>
      <div style={{ ...goldGradientText, fontFamily: FONT, fontSize: 64, fontWeight: 900 }}>That&apos;s your {props.series}</div>
      <Card accent={props.accent} style={{ marginTop: 40 }}>
        <div style={{ fontSize: 56, fontWeight: 900, lineHeight: 1.15 }}>{props.question}</div>
        <div style={{ marginTop: 20, fontSize: 36, color: GOLD }}>Drop your take below 👇 {props.hashtag}</div>
      </Card>
    </Pop>
  );
}
