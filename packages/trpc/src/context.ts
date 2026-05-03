import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { auth } from "@clerk/nextjs/server";
import { db } from "@todouss/db";

export async function createTRPCContext(opts: FetchCreateContextFnOptions) {
  const { userId } = await auth();

  return {
    db,
    userId,
    headers: opts.req.headers,
  };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;
