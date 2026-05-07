"use client";

import { trpc } from "@/lib/trpc/provider";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@todouss/trpc";

type RouterOutput = inferRouterOutputs<AppRouter>;
type ProjectListOutput = RouterOutput["project"]["list"];
type ProjectListItem = ProjectListOutput[number];

export function useCreateProject() {
  const utils = trpc.useUtils();

  return trpc.project.create.useMutation({
    onMutate: async (input) => {
      await utils.project.list.cancel({ workspaceId: input.workspaceId });
      const snapshot = utils.project.list.getData({ workspaceId: input.workspaceId });

      const optimistic: ProjectListItem = {
        id: `optimistic-${Date.now()}`,
        workspaceId: input.workspaceId,
        name: input.name,
        description: input.description ?? null,
        color: input.color ?? "#6366f1",
        icon: input.icon ?? "folder",
        status: "ACTIVE",
        isPrivate: input.isPrivate ?? false,
        isInbox: false,
        sortOrder: snapshot ? snapshot.length : 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (snapshot) {
        utils.project.list.setData(
          { workspaceId: input.workspaceId },
          [...snapshot, optimistic],
        );
      }

      return { snapshot };
    },

    onError: (_err, input, ctx) => {
      if (ctx?.snapshot) {
        utils.project.list.setData({ workspaceId: input.workspaceId }, ctx.snapshot);
      }
    },

    onSettled: (_data, _err, input) => {
      void utils.project.list.invalidate({ workspaceId: input.workspaceId });
    },
  });
}
