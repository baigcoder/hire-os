/**
 * In-process pub/sub for the recruiter's live integrity stream (SSE).
 *
 * Works on one long-running API instance. On serverless or multiple
 * instances a subscriber may sit on a different instance than the ingest,
 * so the recruiter client also polls GET /integrity/:id/live — the stream
 * is a latency optimisation, never the only path.
 */
import { EventEmitter } from "events";

const bus = new EventEmitter();
bus.setMaxListeners(0);

export const publish = (interviewId, payload) => {
  bus.emit(`interview:${interviewId}`, { ...payload, sentAt: new Date().toISOString() });
};

/** @returns unsubscribe */
export const subscribe = (interviewId, listener) => {
  const channel = `interview:${interviewId}`;
  bus.on(channel, listener);
  return () => bus.off(channel, listener);
};

export const subscriberCount = (interviewId) =>
  bus.listenerCount(`interview:${interviewId}`);
