/**
 * Ordered, signed delivery of candidate batches. Each batch gets the next
 * sequence number when it's created and is signed when it's sent (so a
 * retry carries a fresh timestamp). Network failures keep the batch for
 * the next attempt; batches the server has already seen or can't accept
 * are dropped (the server records the gap as a sequence gap).
 */
import { signBatch } from "./signing.js";

const errorCode = (error) => error?.response?.data?.code;

const MAX_QUEUED = 30;
const FATAL = new Set(["SESSION_ENDED", "NO_CONSENT"]);
const DROP = new Set(["REPLAYED_BATCH", "BAD_SIGNATURE", "STALE_BATCH", "BAD_SEQUENCE", "BATCH_TOO_LARGE"]);

export const createBatchSender = ({ cryptoKey, send, onFatal, onSent, now = () => Date.now() }) => {
  let nextSeq = 1;
  let queue = [];
  let flushing = false;

  const enqueue = (events, stats) => {
    queue.push({ seq: nextSeq++, events, stats });
    if (queue.length > MAX_QUEUED) queue = queue.slice(-MAX_QUEUED);
  };

  const flush = async () => {
    if (flushing) return;
    flushing = true;
    try {
      while (queue.length) {
        const { seq, events, stats } = queue[0];
        const sentAt = now();
        const sig = await signBatch(cryptoKey, { seq, sentAt, events });
        try {
          const result = await send({ seq, sentAt, events, stats, sig });
          queue.shift();
          onSent?.(result);
        } catch (error) {
          const code = errorCode(error);
          if (FATAL.has(code)) {
            queue = [];
            onFatal?.(code);
            return;
          }
          if (DROP.has(code)) {
            queue.shift();
            continue;
          }
          return; // network or server error: retry on the next tick
        }
      }
    } finally {
      flushing = false;
    }
  };

  return { enqueue, flush, pending: () => queue.length };
};
