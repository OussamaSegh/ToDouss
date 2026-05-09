/** Must match `binaryTargets` for Vercel / AWS Lambda (Node-API library engine). */

export async function register() {
  if (process.env["NEXT_RUNTIME"] === "edge") return;
  const { registerPrismaQueryEnginePath } = await import("./instrumentation.nodejs");
  registerPrismaQueryEnginePath();
}
