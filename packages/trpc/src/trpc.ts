import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { createTRPCContext } from "./context";

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const mergeRouters = t.mergeRouters;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});

export const workspaceProcedure = protectedProcedure
  .input((input: unknown) => {
    const { workspaceId } = input as { workspaceId?: string };
    if (!workspaceId) throw new TRPCError({ code: "BAD_REQUEST", message: "workspaceId required" });
    return input as { workspaceId: string } & Record<string, unknown>;
  })
  .use(async ({ ctx, input, next }) => {
    const member = await ctx.db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: input.workspaceId,
          userId: ctx.userId!,
        },
      },
      include: { workspace: true },
    });

    if (!member) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this workspace" });
    }

    return next({
      ctx: {
        ...ctx,
        workspaceId: input.workspaceId,
        member,
        workspace: member.workspace,
      },
    });
  });
