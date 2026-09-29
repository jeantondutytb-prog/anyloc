import { Composition } from "remotion";
import { FPS, HEIGHT, sec, WIDTH } from "./theme";
import { Vsl, VSL_END } from "./Vsl";

const VSL_DURATION = sec(VSL_END);

export const Root: React.FC = () => (
  <Composition
    id="Vsl"
    component={Vsl}
    durationInFrames={VSL_DURATION}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
  />
);
