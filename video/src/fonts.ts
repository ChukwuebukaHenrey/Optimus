/**
 * Preloads the three brand fonts before frame 0 and verifies each one is usable (brief §1 [FONTS];
 * master prompt: no silent fallback typography). loadFont() holds the render until each file loads;
 * the check afterwards cancels the render if a family is still unavailable.
 */
import { loadFont } from "@remotion/fonts";
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";
import { FONTS } from "./config";

const families = [FONTS.display, FONTS.body, FONTS.mono];

const verify = delayRender("Verifying brand fonts");

Promise.all(
  families.map((f) =>
    loadFont({ family: f.family, url: staticFile(f.file), weight: FONTS.weightRange, display: "block" }),
  ),
)
  .then(() => {
    const missing = families.filter((f) => !document.fonts.check(`400 32px "${f.family}"`));
    if (missing.length) {
      throw new Error(`Brand fonts not available after loading: ${missing.map((f) => f.family).join(", ")}`);
    }
    continueRender(verify);
  })
  .catch((err) => cancelRender(err));

export const fontStack = {
  display: `"${FONTS.display.family}", sans-serif`,
  body: `"${FONTS.body.family}", sans-serif`,
  mono: `"${FONTS.mono.family}", monospace`,
} as const;
