import { createTRPCRouter } from "./trpc";
import { workspaceRouter } from "./routers/workspace";
import { projectRouter } from "./routers/project";
import { taskRouter } from "./routers/task";
import { labelRouter } from "./routers/label";
import { sectionRouter } from "./routers/section";
import { commentRouter } from "./routers/comment";
import { inviteRouter } from "./routers/invite";
import { notificationRouter } from "./routers/notification";
import { savedViewRouter } from "./routers/saved-view";

export const appRouter = createTRPCRouter({
  workspace: workspaceRouter,
  project: projectRouter,
  task: taskRouter,
  label: labelRouter,
  section: sectionRouter,
  comment: commentRouter,
  invite: inviteRouter,
  notification: notificationRouter,
  savedView: savedViewRouter,
});

export type AppRouter = typeof appRouter;
