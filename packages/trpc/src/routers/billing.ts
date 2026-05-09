import { z } from "zod";
import { formatStorageLimit, getPlanLimits } from "@todouss/billing";
import { createTRPCRouter, workspaceProcedure } from "../trpc";

export const billingRouter = createTRPCRouter({
  summary: workspaceProcedure
    .input(z.object({ workspaceId: z.string().cuid() }))
    .query(async ({ ctx }) => {
      const [projectCount, memberCount, subscription] = await Promise.all([
        ctx.db.project.count({
          where: { workspaceId: ctx.workspaceId, status: "ACTIVE" },
        }),
        ctx.db.workspaceMember.count({ where: { workspaceId: ctx.workspaceId } }),
        ctx.db.subscription.findUnique({ where: { workspaceId: ctx.workspaceId } }),
      ]);

      const plan = ctx.workspace.plan;
      const limits = getPlanLimits(plan);

      return {
        plan,
        limits: {
          maxActiveProjects: limits.maxActiveProjects,
          maxMembers: limits.maxMembers,
          maxStorageBytes: limits.maxStorageBytes,
          storageLimitLabel: formatStorageLimit(limits.maxStorageBytes),
        },
        usage: {
          activeProjects: projectCount,
          members: memberCount,
          storageUsedBytes: ctx.workspace.storageUsed,
          storageUsedLabel: formatStorageLimit(ctx.workspace.storageUsed),
        },
        subscription: subscription
          ? {
              status: subscription.status,
              plan: subscription.plan,
              stripePriceId: subscription.stripePriceId,
              stripeCurrentPeriodEnd: subscription.stripeCurrentPeriodEnd,
              cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
              seats: subscription.seats,
              hasStripeCustomer: Boolean(subscription.stripeCustomerId),
            }
          : null,
      };
    }),
});
