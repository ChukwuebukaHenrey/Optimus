/** Public facts about the project used across the site. */
export const REPO_URL = "https://github.com/ChukwuebukaHenrey/Optimus";

/**
 * The deployed address. On Vercel the production domain is provided at build time; locally the
 * site falls back to the loopback preview. Used for absolute social-preview URLs.
 */
export const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://127.0.0.1:4321";
