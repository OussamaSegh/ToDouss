import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createApiKeySchema, revokeApiKeySchema } from "@todouss/validators";
import { createTRPCRouter, workspaceProcedure } from "../trpc";
import { ensureDbUser } from "../lib/ensure-db-user";
import { generateApiKey, hashApiKey } from "../lib/crypto-keys";

function assertAdmin(role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER") {
  if (role !== "OWNER" && role !== "ADMIN") throw new TRPCError({ code: "FORBIDDEN" });
}

export const apiKeyRouter = createTRPCRouter({
  list: workspaceProcedure.input(z.object({ workspaceId: z.string().cuid() })).query(async ({ ctx }) => {
    assertAdmin(ctx.member.role);
    return ctx.db.apiKey.findMany({
      where: { workspaceId: ctx.workspaceId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        prefix: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }),

  create: workspaceProcedure.input(createApiKeySchema).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx.member.role);
    const dbUser = await ensureDbUser(ctx);
    const raw = generateApiKey();
    const keyHash = hashApiKey(raw);
    const prefix = raw.slice(0, 12);

    await ctx.db.apiKey.create({
      data: {
        workspaceId: ctx.workspaceId,
        userId: dbUser.id,
        name: input.name,
        keyHash,
        prefix,
        expiresAt: input.expiresAt ?? null,
      },
    });

    return { key: raw, prefix };
  }),

  revoke: workspaceProcedure.input(revokeApiKeySchema).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx.member.role);
    const row = await ctx.db.apiKey.findFirst({
      where: { id: input.apiKeyId, workspaceId: ctx.workspaceId },
    });
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    await ctx.db.apiKey.delete({ where: { id: row.id } });
    return { success: true as const };
  }),
});
