import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  addTeamMemberSchema,
  createTeamSchema,
  deleteTeamSchema,
  removeTeamMemberSchema,
  setProjectTeamsSchema,
  updateTeamSchema,
} from "@todouss/validators";
import { createTRPCRouter, workspaceProcedure } from "../trpc";

const workspaceIdOnly = z.object({ workspaceId: z.string().cuid() });

function assertTeamAdmin(role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER") {
  if (role !== "OWNER" && role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
}

export const teamRouter = createTRPCRouter({
  list: workspaceProcedure.input(workspaceIdOnly).query(({ ctx }) =>
    ctx.db.team.findMany({
      where: { workspaceId: ctx.workspaceId },
      orderBy: { name: "asc" },
      include: {
        members: {
          include: {
            member: {
              include: {
                user: { select: { id: true, name: true, email: true, avatarUrl: true } },
              },
            },
          },
        },
        projects: { include: { project: { select: { id: true, name: true, color: true } } } },
      },
    }),
  ),

  create: workspaceProcedure.input(createTeamSchema).mutation(async ({ ctx, input }) => {
    assertTeamAdmin(ctx.member.role);
    return ctx.db.team.create({
      data: {
        workspaceId: ctx.workspaceId,
        name: input.name,
        description: input.description,
        color: input.color,
      },
    });
  }),

  update: workspaceProcedure.input(updateTeamSchema).mutation(async ({ ctx, input }) => {
    assertTeamAdmin(ctx.member.role);
    const { teamId, workspaceId: _w, ...data } = input;
    const team = await ctx.db.team.findFirst({
      where: { id: teamId, workspaceId: ctx.workspaceId },
    });
    if (!team) throw new TRPCError({ code: "NOT_FOUND" });
    return ctx.db.team.update({ where: { id: teamId }, data });
  }),

  delete: workspaceProcedure.input(deleteTeamSchema).mutation(async ({ ctx, input }) => {
    assertTeamAdmin(ctx.member.role);
    const team = await ctx.db.team.findFirst({
      where: { id: input.teamId, workspaceId: ctx.workspaceId },
    });
    if (!team) throw new TRPCError({ code: "NOT_FOUND" });
    await ctx.db.team.delete({ where: { id: input.teamId } });
    return { success: true as const };
  }),

  addMember: workspaceProcedure.input(addTeamMemberSchema).mutation(async ({ ctx, input }) => {
    assertTeamAdmin(ctx.member.role);
    const team = await ctx.db.team.findFirst({
      where: { id: input.teamId, workspaceId: ctx.workspaceId },
    });
    if (!team) throw new TRPCError({ code: "NOT_FOUND" });

    const wm = await ctx.db.workspaceMember.findFirst({
      where: { id: input.workspaceMemberId, workspaceId: ctx.workspaceId },
    });
    if (!wm) throw new TRPCError({ code: "BAD_REQUEST", message: "Workspace member not found" });

    return ctx.db.teamMember.create({
      data: {
        teamId: input.teamId,
        memberId: input.workspaceMemberId,
        role: input.role,
      },
    });
  }),

  removeMember: workspaceProcedure.input(removeTeamMemberSchema).mutation(async ({ ctx, input }) => {
    assertTeamAdmin(ctx.member.role);
    const row = await ctx.db.teamMember.findFirst({
      where: {
        id: input.teamMemberId,
        team: { id: input.teamId, workspaceId: ctx.workspaceId },
      },
    });
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    await ctx.db.teamMember.delete({ where: { id: row.id } });
    return { success: true as const };
  }),

  setProjectTeams: workspaceProcedure.input(setProjectTeamsSchema).mutation(async ({ ctx, input }) => {
    assertTeamAdmin(ctx.member.role);
    const project = await ctx.db.project.findFirst({
      where: { id: input.projectId, workspaceId: ctx.workspaceId },
    });
    if (!project) throw new TRPCError({ code: "NOT_FOUND" });

    if (input.teamIds.length) {
      const teams = await ctx.db.team.findMany({
        where: { id: { in: input.teamIds }, workspaceId: ctx.workspaceId },
        select: { id: true },
      });
      if (teams.length !== input.teamIds.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "One or more teams are invalid" });
      }
    }

    await ctx.db.$transaction(async (tx) => {
      await tx.projectTeam.deleteMany({ where: { projectId: input.projectId } });
      if (input.teamIds.length) {
        await tx.projectTeam.createMany({
          data: input.teamIds.map((teamId) => ({ projectId: input.projectId, teamId })),
        });
      }
    });

    return { success: true as const };
  }),
});
