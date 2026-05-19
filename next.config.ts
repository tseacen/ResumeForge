import { createRequire } from "module";

import type { NextConfig } from "next";

const require = createRequire(import.meta.url);
const { version } = require("./package.json") as { version: string };

// When TAURI_BUILD=1, produce a static export for Tauri packaging.
// Standard `pnpm dev` / `pnpm build` use the normal Next.js server mode.
const isTauriBuild = process.env.TAURI_BUILD === "1";

const nextConfig: NextConfig = {
  ...(isTauriBuild ? { output: "export" } : {}),
  serverExternalPackages: ["cheerio", "domhandler"],
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
};

export default nextConfig;
