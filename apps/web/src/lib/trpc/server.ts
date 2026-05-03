import "server-only";
import { createCallerFactory, appRouter, createTRPCContext } from "@todouss/trpc";
import { cache } from "react";

const createCachedContext = cache(() =>
  createTRPCContext({
    req: new Request("http://internal"),
    resHeaders: new Headers(),
    info: {
      isBatchCall: false,
      calls: [],
      accept: null,
      type: "unknown",
      connectionParams: null,
      signal: new AbortController().signal,
      url: new URL("http://internal"),
    },
  }),
);

const createCaller = createCallerFactory(appRouter);

export const api = createCaller(createCachedContext);
