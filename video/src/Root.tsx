import { Composition } from "remotion";
import { DURATION_IN_FRAMES, VIDEO } from "./config";
import { OptimusDemo } from "./OptimusDemo";
import { assertConfig } from "./validate";

// An invalid config (gaps, over-length, unapproved numbers, unreadable lines) stops the Studio and renders.
assertConfig();

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="OptimusDemo"
      component={OptimusDemo}
      durationInFrames={DURATION_IN_FRAMES}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
  );
};
