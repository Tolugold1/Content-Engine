import { Composition, Still, type CalculateMetadataFunction } from "remotion";
import { FPS, HEIGHT, SAMPLE_PROPS, WIDTH, type VideoProps } from "../props";
import { GoldenGist, GoldenGistStill } from "./GoldenGist";

const calculateMetadata: CalculateMetadataFunction<VideoProps> = ({ props }) => ({
  durationInFrames: Math.max(1, Math.ceil(props.durationSec * FPS)),
});

export function Root() {
  return (
    <>
      <Composition
        id="GoldenGist"
        component={GoldenGist}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        durationInFrames={Math.ceil(SAMPLE_PROPS.durationSec * FPS)}
        defaultProps={SAMPLE_PROPS}
        calculateMetadata={calculateMetadata}
      />
      <Still id="GoldenGistStill" component={GoldenGistStill} width={WIDTH} height={HEIGHT} defaultProps={SAMPLE_PROPS} />
    </>
  );
}
