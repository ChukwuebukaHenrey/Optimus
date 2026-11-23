import path from "node:path";
import type { NextConfig } from "next";

/**
 * Static export: every page is rendered to HTML at build time, so the real verdicts read from
 * the comparison bundle are in the delivered HTML, not fetched by the browser.
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  // Pixel art must never be resampled; the export also has no image server.
  images: { unoptimized: true },
  turbopack: {
    // The site validates the bundle with the backend's own schema in ../src/report/schema.ts.
    root: path.join(__dirname, ".."),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
