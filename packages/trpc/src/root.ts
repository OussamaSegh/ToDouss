import { createTRPCRouter } from "./trpc";
import { workspaceRouter } from "./routers/workspace";
import { projectRouter } from "./routers/project";
import { taskRouter } from "./routers/task";
import { labelRouter } from "./routers/label";
import { sectionRouter } from "./routers/section";

export const appRouter = createTRPCRouter({
  workspace: workspaceRouter,
  project: projectRouter,
  task: taskRouter,
  label: labelRouter,
  section: sectionRouter,
});

export type AppRouter = typeof appRouter;
