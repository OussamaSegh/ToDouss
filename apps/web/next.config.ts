import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@todouss/db",
    "@todouss/trpc",
    "@todouss/ui",
    "@todouss/validators",
  ],
  // Prisma Query Engine (.node): keep Node resolution + avoid stripping binaries from the server bundle (Vercel).
  serverExternalPackages: ["@prisma/client", "prisma"],
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
