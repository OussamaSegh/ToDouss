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
import { billingRouter } from "./routers/billing";
import { attachmentRouter } from "./routers/attachment";
import { teamRouter } from "./routers/team";
import { apiKeyRouter } from "./routers/api-key";
import { workspaceWebhookRouter } from "./routers/workspace-webhook";

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
  billing: billingRouter,
  attachment: attachmentRouter,
  team: teamRouter,
  apiKey: apiKeyRouter,
  workspaceWebhook: workspaceWebhookRouter,
});

export type AppRouter = typeof appRouter;
