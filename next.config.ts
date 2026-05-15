import type { NextConfig } from "next";

// When TAURI_BUILD=1, produce a static export for Tauri packaging.
// Standard `pnpm dev` / `pnpm build` use the normal Next.js server mode.
const isTauriBuild = process.env.TAURI_BUILD === "1";

const nextConfig: NextConfig = {
  ...(isTauriBuild ? { output: "export" } : {}),
};

export default nextConfig;
