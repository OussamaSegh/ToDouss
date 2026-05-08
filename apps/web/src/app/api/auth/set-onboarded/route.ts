import { auth } from "@clerk/nextjs/server";
import { db } from "@todouss/db";
import { cookies } from "next/headers";

/**
 * Called client-side after completeOnboarding succeeds.
 * Verifies the user is genuinely onboarded in the DB, then sets a
 * plain `onboarded` cookie that the middleware can read synchronously —
 * avoiding Clerk JWT cache timing issues.
 */
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const dbUser = await db.user.findUnique({
    where: { clerkId: userId },
    select: { onboardedAt: true },
  });

  if (!dbUser?.onboardedAt) {
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
