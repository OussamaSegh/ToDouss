import {
  listNotificationsSchema,
  markNotificationReadSchema,
  markAllNotificationsReadSchema,
} from "@todouss/validators";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { ensureDbUser } from "../lib/ensure-db-user";

export const notificationRouter = createTRPCRouter({
  list: protectedProcedure
    .input(listNotificationsSchema)
    .query(async ({ ctx, input }) => {
      const dbUser = await ensureDbUser(ctx);
      const rows = await ctx.db.notification.findMany({
        where: { userId: dbUser.id },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      });
      const hasNextPage = rows.length > input.limit;
      if (hasNextPage) rows.pop();
      return {
        notifications: rows,
        nextCursor: hasNextPage ? rows[rows.length - 1]?.id : undefined,
      };
    }),

  markRead: protectedProcedure
    .input(markNotificationReadSchema)
    .mutation(async ({ ctx, input }) => {
      const dbUser = await ensureDbUser(ctx);
      return ctx.db.notification.updateMany({
        where: { id: input.notificationId, userId: dbUser.id, readAt: null },
        data: { readAt: new Date() },
      });
    }),

  markAllRead: protectedProcedure
    .input(markAllNotificationsReadSchema)
    .mutation(async ({ ctx }) => {
      const dbUser = await ensureDbUser(ctx);
      return ctx.db.notification.updateMany({
        where: { userId: dbUser.id, readAt: null },
        data: { readAt: new Date() },
      });
    }),
});
