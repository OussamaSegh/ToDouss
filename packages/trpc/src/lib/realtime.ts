import Pusher from "pusher";

let pusher: Pusher | null = null;

function getPusher() {
  if (pusher) return pusher;
  const appId = process.env["PUSHER_APP_ID"];
  const key = process.env["PUSHER_KEY"];
  const secret = process.env["PUSHER_SECRET"];
  const cluster = process.env["PUSHER_CLUSTER"];
  if (!appId || !key || !secret || !cluster) return null;

  pusher = new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  });
  return pusher;
}

export async function publishWorkspaceEvent(
  workspaceId: string,
  event: string,
  payload: Record<string, unknown>,
) {
  const client = getPusher();
  if (!client) return;
  try {
    await client.trigger(`workspace-${workspaceId}`, event, payload);
  } catch (error) {
    console.warn("Failed to publish workspace event", { workspaceId, event, error });
  }
}

export async function publishTaskEvent(
  taskId: string,
  event: string,
  payload: Record<string, unknown>,
) {
  const client = getPusher();
  if (!client) return;
  try {
    await client.trigger(`task-${taskId}`, event, payload);
  } catch (error) {
    console.warn("Failed to publish task event", { taskId, event, error });
  }
}

export async function publishProjectEvent(
  projectId: string,
  event: string,
  payload: Record<string, unknown>,
) {
  const client = getPusher();
  if (!client) return;
  try {
    await client.trigger(`project-${projectId}`, event, payload);
  } catch (error) {
    console.warn("Failed to publish project event", { projectId, event, error });
  }
}
