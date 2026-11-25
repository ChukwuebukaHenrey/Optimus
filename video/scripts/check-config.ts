/**
 * Validates src/config.ts and prints the timeline. Exit 1 on any error.
 *
 *   npm run check
 */
import { DURATION_IN_FRAMES, FOOTAGE, TIMELINE, VIDEO } from "../src/config";
import { checkConfig } from "../src/validate";

const tc = (f: number) => {
  const sec = f / VIDEO.fps;
  return `${Math.floor(sec / 60)}:${(sec % 60).toFixed(2).padStart(5, "0")}`;
};

console.log(`OptimusDemo · ${VIDEO.width}×${VIDEO.height} @ ${VIDEO.fps} fps · footage: ${FOOTAGE}\n`);
console.log("scene  start     end       frames       seconds  name");
for (const sc of TIMELINE) {
  const end = sc.from + sc.frames - 1;
  console.log(
    `${sc.id.padEnd(6)} ${tc(sc.from).padEnd(9)} ${tc(end + 1).padEnd(9)} ${`${sc.from}–${end}`.padEnd(12)} ${(sc.frames / VIDEO.fps).toFixed(1).padStart(7)}  ${sc.name}${sc.needsApproval ? "  [approval]" : ""}`,
  );
}
const max = VIDEO.maxSeconds * VIDEO.fps;
console.log(`\ntotal  ${DURATION_IN_FRAMES} frames = ${tc(DURATION_IN_FRAMES)} (ceiling ${max} frames = ${tc(max)})`);

const { errors, warnings } = checkConfig();
if (warnings.length) console.log(`\nwarnings:\n- ${warnings.join("\n- ")}`);
if (errors.length) {
  console.error(`\nERRORS:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log("\nconfig OK");
