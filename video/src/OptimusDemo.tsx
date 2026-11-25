/**
 * Master composition: scenes in storyboard order, timed entirely from src/config.ts.
 * A scene without a component yet falls back to its labelled storyboard placeholder.
 */
import { Audio } from "@remotion/media";
import { getInputProps, interpolate, Sequence, staticFile, Track } from "remotion";
import { AUDIO, TIMELINE, VIDEO, VO_TAKE, type Scene, type VoId } from "./config";
import { Scene1 } from "./scenes/Scene1";
import { Scene2 } from "./scenes/Scene2";
import { Scene3 } from "./scenes/Scene3";
import {
  Scene4a,
  Scene4b,
  Scene4c,
  Scene4d,
  Scene4e,
  Scene4f,
} from "./scenes/Scene4";
import { Scene5 } from "./scenes/Scene5";
import { Scene6 } from "./scenes/Scene6";
import { StoryboardScene } from "./scenes/StoryboardScene";
import "./fonts";

/** Frames where the voice speaks (each block's placement in its scene). */
const VOICE = TIMELINE.flatMap((sc) =>
  VO_TAKE.blocks[sc.vo as VoId].map((clip) => {
    const from = sc.from + Math.round(clip.at * VIDEO.fps);
    return { from, to: from + Math.round((clip.take[1] - clip.take[0]) * VIDEO.fps) };
  }),
);

/** Music gain: ducked about 11 dB under the voice, rising between blocks, with short ramps. */
const musicVolume = (f: number) => {
  const { music, musicUnderVo, duckRamp, voReady } = AUDIO.mix;
  if (!voReady) return music;
  const ramp = duckRamp * VIDEO.fps;
  let duck = 0;
  for (const v of VOICE) {
    duck = Math.max(duck, interpolate(f, [v.from - ramp, v.from, v.to, v.to + ramp], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  }
  return music + (musicUnderVo - music) * duck;
};

const SCENE_COMPONENTS: Record<string, React.FC<{ readonly scene: Scene }>> = {
  "1": Scene1,
  "2": Scene2,
  "3": Scene3,
  "4a": Scene4a,
  "4b": Scene4b,
  "4c": Scene4c,
  "4d": Scene4d,
  "4e": Scene4e,
  "4f": Scene4f,
  "5": Scene5,
  "6": Scene6,
};

export const OptimusDemo: React.FC = () => {
  return (
    <>
      <Track name="Scenes">
        {TIMELINE.map((scene) => {
          const Component = SCENE_COMPONENTS[scene.id];
          return (
            <Sequence
              key={scene.id}
              name={`${scene.id} · ${scene.name}`}
              from={scene.from}
              durationInFrames={scene.frames}
            >
              {Component ? (
                <Component scene={scene} />
              ) : (
                <StoryboardScene scene={scene} from={scene.from} />
              )}
            </Sequence>
          );
        })}
      </Track>
      {/* Stems stay separate files (brief §2); levels from AUDIO.mix. */}
      {/* `--props='{"voice":false}'` renders the brief's version without voiceover (same music mix). */}
      {getInputProps().voice === false ? null : (
        <Track name="Voice">
          <Audio name="vo.wav" src={staticFile(AUDIO.stems.vo)} volume={AUDIO.mix.voice} />
        </Track>
      )}
      <Track name="Music">
        <Audio name="music.wav" src={staticFile(AUDIO.stems.music)} volume={musicVolume} />
      </Track>
      <Track name="SFX">
        <Audio
          name="sfx.wav"
          src={staticFile(AUDIO.stems.sfx)}
          volume={AUDIO.mix.sfx}
        />
      </Track>
    </>
  );
};
