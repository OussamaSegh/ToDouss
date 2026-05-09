import path from "node:path";
import type { NextConfig } from "next";

/** Monorepo root — `pnpm build` / Vercel run this from `apps/web`. */
const monorepoRoot = path.resolve(process.cwd(), "../..");
/** Resolved from `outputFileTracingRoot` (repo root), not `apps/web`. */
const prismaClientBundle = "./packages/db/src/generated/client/**/*";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@todouss/db",
    "@todouss/trpc",
    "@todouss/ui",
    "@todouss/validators",
  ],
  // Prisma Query Engine (.node/.wasm): keep Node resolution + avoid stripping binaries from the server bundle (Vercel).
  serverExternalPackages: ["@prisma/client", "prisma"],
  outputFileTracingRoot: monorepoRoot,
  outputFileTracingIncludes: {
    "/*": [prismaClientBundle],
    "/**": [prismaClientBundle],
  },
  images: {
    remotePatterns: [
      { hostname: "img.clerk.com" },
      { hostname: "images.clerk.dev" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "@todouss/ui"],
  },
};

export default nextConfig;
