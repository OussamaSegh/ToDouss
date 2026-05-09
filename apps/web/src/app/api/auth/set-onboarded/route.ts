import { auth } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";
import { db } from "@todouss/db";
import { ensureDbUser } from "@todouss/trpc/ensure-db-user";
import { cookies } from "next/headers";

/**
 * Called client-side after completeOnboarding succeeds.
 * Verifies the user has completed onboarding (onboardedAt) or already belongs
 * to a workspace (e.g. invite acceptance), then sets the `onboarded` cookie
 * middleware uses so they are not forced through /onboarding on every login.
 */
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  let dbUser: { id: string; onboardedAt: Date | null };
  try {
    const row = await ensureDbUser({ db, userId });
    dbUser = { id: row.id, onboardedAt: row.onboardedAt ?? null };
  } catch (e) {
    if (e instanceof TRPCError) {
      const status =
        e.code === "UNAUTHORIZED" ? 401 : e.code === "BAD_REQUEST" ? 400 : 503;
      return new Response(e.message, { status });
    }
    throw e;
  }

  const hasWorkspace =
    (await db.workspaceMember.count({
      where: { userId: dbUser.id },
    })) > 0;

  if (!dbUser.onboardedAt && !hasWorkspace) {
    return new Response("Not onboarded", { status: 403 });
  }

  const cookieStore = await cookies();
  cookieStore.set("onboarded", "true", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    // Session cookie — expires when browser closes; refreshed on every login
    maxAge: 60 * 60 * 24 * 365, // 1 year
    secure: process.env["NODE_ENV"] === "production",
  });

  return new Response("OK", { status: 200 });
}
