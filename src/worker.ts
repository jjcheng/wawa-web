import vinextHandler from "vinext/server/fetch-handler";

const PASSTHROUGH_HOSTNAMES = new Set([
  "api.wawago.app",
  "www.wawago.app",
  "wawago.app",
]);

type WorkerContext = {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException?(): void;
};

const worker = {
  fetch(request: Request, env: unknown, ctx: WorkerContext) {
    const url = new URL(request.url);

    if (PASSTHROUGH_HOSTNAMES.has(url.hostname)) {
      return fetch(request);
    }

    return vinextHandler.fetch(request, env, ctx);
  },
};

export default worker;
