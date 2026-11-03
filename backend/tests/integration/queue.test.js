import { createQueue } from "../../platform/queue/queue.js";
import { BackgroundJob } from "../../models/backgroundJob.model.js";

describe("Mongo job queue", () => {
  beforeAll(() => BackgroundJob.syncIndexes());

  const makeQueue = (options = {}) =>
    createQueue({ backoffBaseMs: 0, pollIntervalMs: 10, ...options });

  it("runs a job and stores its result and progress", async () => {
    const queue = makeQueue();
    queue.register("double", async (data, ctx) => {
      await ctx.setProgress({ step: "halfway" });
      return { value: data.n * 2 };
    });

    const job = await queue.enqueue("double", { n: 21 });
    await queue.drain();

    const saved = await queue.get(job._id);
    expect(saved.status).toBe("succeeded");
    expect(saved.result).toEqual({ value: 42 });
    expect(saved.progress).toEqual({ step: "halfway" });
    expect(saved.attempts).toBe(1);
    expect(saved.finishedAt).toBeInstanceOf(Date);
  });

  it("retries failures and succeeds on a later attempt", async () => {
    const queue = makeQueue();
    let calls = 0;
    queue.register("flaky", async (_data, ctx) => {
      calls++;
      if (ctx.attempt < 3) throw new Error(`attempt ${ctx.attempt} failed`);
      return "ok";
    });

    const job = await queue.enqueue("flaky", {}, { maxAttempts: 3 });
    await queue.drain();

    const saved = await queue.get(job._id);
    expect(calls).toBe(3);
    expect(saved.status).toBe("succeeded");
    expect(saved.lastError).toBeNull();
  });

  it("marks a job failed after maxAttempts", async () => {
    const queue = makeQueue();
    queue.register("broken", async () => {
      throw new Error("always fails");
    });

    const job = await queue.enqueue("broken", {}, { maxAttempts: 2 });
    await queue.drain();

    const saved = await queue.get(job._id);
    expect(saved.status).toBe("failed");
    expect(saved.attempts).toBe(2);
    expect(saved.lastError).toBe("always fails");
  });

  it("waits out the retry backoff instead of retrying immediately", async () => {
    const queue = makeQueue({ backoffBaseMs: 60_000 });
    queue.register("slow-retry", async () => {
      throw new Error("nope");
    });

    const job = await queue.enqueue("slow-retry", {}, { maxAttempts: 3 });
    await queue.drain();

    const saved = await queue.get(job._id);
    expect(saved.status).toBe("queued");
    expect(saved.attempts).toBe(1);
    expect(saved.runAt.getTime()).toBeGreaterThan(Date.now() + 50_000);
  });

  it("deduplicates active jobs by dedupeKey", async () => {
    const queue = makeQueue();
    queue.register("dedupe", async () => "done");

    const first = await queue.enqueue("dedupe", {}, { dedupeKey: "k1" });
    const second = await queue.enqueue("dedupe", {}, { dedupeKey: "k1" });
    expect(String(second._id)).toBe(String(first._id));

    await queue.drain();
    // Once finished, the key is free again
    const third = await queue.enqueue("dedupe", {}, { dedupeKey: "k1" });
    expect(String(third._id)).not.toBe(String(first._id));
  });

  it("re-claims a job whose worker stalled", async () => {
    const stalled = await BackgroundJob.create({
      name: "rescue",
      status: "running",
      attempts: 1,
      lockedBy: "dead-worker",
      lockedAt: new Date(Date.now() - 10 * 60 * 1000),
    });

    const queue = makeQueue({ lockTimeoutMs: 60_000 });
    queue.register("rescue", async () => "rescued");
    await queue.drain();

    const saved = await queue.get(stalled._id);
    expect(saved.status).toBe("succeeded");
    expect(saved.attempts).toBe(2);
  });

  it("only claims jobs it has handlers for and respects priority", async () => {
    const queue = makeQueue();
    const order = [];
    queue.register("ordered", async (data) => order.push(data.id));

    await queue.enqueue("ordered", { id: "low" }, { priority: 0 });
    await queue.enqueue("ordered", { id: "high" }, { priority: 5 });
    const other = await queue.enqueue("unhandled", {});
    await queue.drain();

    expect(order).toEqual(["high", "low"]);
    expect((await queue.get(other._id)).status).toBe("queued");
  });

  it("processes jobs while started and stops cleanly", async () => {
    const queue = makeQueue();
    queue.register("live", async () => "ok");
    queue.start();
    const job = await queue.enqueue("live", {});

    for (let i = 0; i < 100; i++) {
      if ((await queue.get(job._id)).status === "succeeded") break;
      await new Promise((r) => setTimeout(r, 20));
    }
    await queue.stop();
    expect((await queue.get(job._id)).status).toBe("succeeded");
  });
});
