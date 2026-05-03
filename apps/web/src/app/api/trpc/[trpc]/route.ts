import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter, createTRPCContext } from "@todouss/trpc";
import type { NextRequest } from "next/server";

const isDev = process.env["NODE_ENV"] === "development";

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: (opts) => createTRPCContext(opts),
    ...(isDev
      ? {
          onError: ({ path, error }: { path: string | undefined; error: Error }) => {
            console.error(`tRPC error on ${path ?? "<no-path>"}:`, error);
          },
        }
      : {}),
  });

export { handler as GET, handler as POST };
