import { t } from "../trpc-init";

const pending = new Map<string, Promise<void>>();

// Keep validation, persistence and publication of each match mutation in order.
export const matchMutationMiddleware = t.middleware(async ({ input, type, next }) => {
  if (type !== "mutation") {
    return next();
  }

  const matchId = (input as { matchId: string }).matchId;
  const previous = pending.get(matchId) ?? Promise.resolve();

  let release: () => void = () => undefined;

  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  pending.set(matchId, current);
  await previous;

  try {
    return await next();
  } finally {
    release();

    if (pending.get(matchId) === current) {
      pending.delete(matchId);
    }
  }
});
