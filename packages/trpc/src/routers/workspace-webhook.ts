import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createWebhookSchema, deleteWebhookSchema } from "@todouss/validators";
import { createTRPCRouter, workspaceProcedure } from "../trpc";
import { generateWebhookSecret } from "../lib/crypto-keys";

function assertAdmin(role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER") {
  if (role !== "OWNER" && role !== "ADMIN") throw new TRPCError({ code: "FORBIDDEN" });
}

export const workspaceWebhookRouter = createTRPCRouter({
  list: workspaceProcedure.input(z.object({ workspaceId: z.string().cuid() })).query(async ({ ctx }) => {
    assertAdmin(ctx.member.role);
    return ctx.db.webhook.findMany({
      where: { workspaceId: ctx.workspaceId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        url: true,
        events: true,
        isActive: true,
        lastPingAt: true,
        failCount: true,
        createdAt: true,
      },
    });
  }),

  create: workspaceProcedure.input(createWebhookSchema).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx.member.role);
    const secret = generateWebhookSecret();
    const row = await ctx.db.webhook.create({
      data: {
        workspaceId: ctx.workspaceId,
        url: input.url,
        secret,
        events: input.events,
      },
    });
    return { id: row.id, secret };
  }),

  delete: workspaceProcedure.input(deleteWebhookSchema).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx.member.role);
    const row = await ctx.db.webhook.findFirst({
      where: { id: input.webhookId, workspaceId: ctx.workspaceId },
    });
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    await ctx.db.webhook.delete({ where: { id: row.id } });
    return { success: true as const };
  }),
});
