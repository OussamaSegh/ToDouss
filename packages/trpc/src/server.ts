import "server-only";
import { createCallerFactory, createTRPCRouter } from "./trpc";
import { createTRPCContext } from "./context";
import { appRouter } from "./root";

const createCaller = createCallerFactory(appRouter);

export { createCaller, createTRPCContext, createTRPCRouter, appRouter };
export type { AppRouter } from "./root";
