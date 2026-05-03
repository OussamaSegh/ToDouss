import { createTRPCRouter } from "./trpc";
import { workspaceRouter } from "./routers/workspace";
import { projectRouter } from "./routers/project";
import { taskRouter } from "./routers/task";

export const appRouter = createTRPCRouter({
  workspace: workspaceRouter,
  project: projectRouter,
  task: taskRouter,
});

export type AppRouter = typeof appRouter;
