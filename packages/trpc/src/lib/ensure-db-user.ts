import { TRPCError } from "@trpc/server";
import { clerkClient } from "@clerk/nextjs/server";
import type { PrismaClient } from "@todouss/db";

export async function ensureDbUser(ctx: {
  db: PrismaClient;
  userId: string | null | undefined;
}) {
  if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

  const existing = await ctx.db.user.findUnique({
    where: { clerkId: ctx.userId },
  });
  if (existing) return existing;

  const client = await clerkClient();
  const clerkUser = await client.users.getUser(ctx.userId);
  const primaryEmail = clerkUser.emailAddresses.find(
    (e) => e.id === clerkUser.primaryEmailAddressId,
  )?.emailAddress;

  if (!primaryEmail) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No primary email on Clerk user",
    });
  }

  return ctx.db.user.create({
    data: {
      clerkId: ctx.userId,
      email: primaryEmail,
      name:
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
        null,
      avatarUrl: clerkUser.imageUrl || null,
    },
  });
}
