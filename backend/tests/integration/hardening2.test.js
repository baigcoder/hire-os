/**
 * Regression tests for the second hardening round: zip-bomb DOCX uploads and the
 * shared rate-limit store.
 */
import JSZip from "jszip";
import { assertSafeZip, extractResume, ExtractionError } from "../../modules/resume-intel/extract.js";
import { RedisRateLimitStore } from "../../middlewares/rateLimiters.js";

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const zipOf = async (files) => {
  const zip = new JSZip();
  for (const [name, data] of Object.entries(files)) zip.file(name, data);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
};

describe("DOCX zip-bomb guard", () => {
  it("rejects a tiny archive that declares tens of MB of XML", async () => {
    const bomb = await zipOf({ "word/document.xml": Buffer.alloc(40 * 1024 * 1024, 0x41) });
    expect(bomb.length).toBeLessThan(1024 * 1024); // compresses to well under 1 MB
    expect(() => assertSafeZip(bomb)).toThrow(ExtractionError);
    await expect(extractResume({ buffer: bomb, mimetype: DOCX })).rejects.toMatchObject({ code: "UNREADABLE_FILE" });
  });

  it("rejects an archive with too many entries", async () => {
    const files = {};
    for (let i = 0; i < 1100; i++) files[`f${i}.txt`] = "x";
    const many = await zipOf(files);
    expect(() => assertSafeZip(many)).toThrow(ExtractionError);
  });

  it("accepts a normal-sized archive and rejects non-zip bytes", async () => {
    const ok = await zipOf({ "word/document.xml": "<w:document>hello</w:document>" });
    expect(() => assertSafeZip(ok)).not.toThrow();
    expect(() => assertSafeZip(Buffer.from("not a zip at all"))).toThrow(ExtractionError);
  });
});

describe("rate-limit store", () => {
  it("counts per key within the window and resets after it", async () => {
    const store = new RedisRateLimitStore("t:");
    store.init({ windowMs: 50 });
    expect((await store.increment("a")).totalHits).toBe(1);
    expect((await store.increment("a")).totalHits).toBe(2);
    expect((await store.increment("b")).totalHits).toBe(1);
    await new Promise((r) => setTimeout(r, 70));
    expect((await store.increment("a")).totalHits).toBe(1);
  });

  it("supports decrement and resetKey", async () => {
    const store = new RedisRateLimitStore("t:");
    store.init({ windowMs: 1000 });
    await store.increment("k");
    await store.increment("k");
    await store.decrement("k");
    expect((await store.increment("k")).totalHits).toBe(2);
    await store.resetKey("k");
    expect((await store.increment("k")).totalHits).toBe(1);
  });
});
