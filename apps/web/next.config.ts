import path from "node:path";
import type { NextConfig } from "next";

/** Monorepo root — `pnpm build` / Vercel run this from `apps/web`. */
const outputFileTracingRoot = path.resolve(process.cwd(), "../..");

const nextConfig: NextConfig = {
  transpilePackages: [
    "@todouss/db",
    "@todouss/trpc",
    "@todouss/ui",
    "@todouss/validators",
  ],
  // Prisma Query Engine (.node): keep Node resolution + avoid stripping binaries from the server bundle (Vercel).
  serverExternalPackages: ["@prisma/client", "prisma"],
  outputFileTracingRoot,
  // Paths are relative to this Next app root (`apps/web`); include resolves against tracing root + app root per Next docs.
  outputFileTracingIncludes: {
    "/*": ["../../packages/db/src/generated/client/**/*"],
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
