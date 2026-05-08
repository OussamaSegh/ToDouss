import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { auth } from "@clerk/nextjs/server";
import { db } from "@todouss/db";

export async function createTRPCContext(opts: FetchCreateContextFnOptions) {
  let userId: string | null = null;
  try {
    const authState = await auth();
    userId = authState.userId;
  } catch {
    // Surface unauthenticated access through protectedProcedure/workspaceProcedure
    // as a typed tRPC error instead of letting auth() bubble an HTML error page.
    userId = null;
  }

  return {
    db,
    userId,
    headers: opts.req.headers,
  };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;
