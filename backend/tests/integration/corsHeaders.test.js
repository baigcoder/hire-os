import request from "supertest";
import { app } from "../../index.js";

// Browsers preflight custom headers; supertest doesn't, so check it here
describe("CORS preflight", () => {
  it("allows the copilot audio chunk headers from the app's origin", async () => {
    const res = await request(app)
      .options("/api/v1/copilot/6ad94489986bcfe53e3f9826/audio")
      .set("Origin", "http://localhost:5173")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "authorization,content-type,x-chunk-seq,x-chunk-started-at");
    expect(res.status).toBe(204);
    const allowed = res.headers["access-control-allow-headers"].toLowerCase();
    for (const h of ["authorization", "content-type", "x-chunk-seq", "x-chunk-started-at"]) {
      expect(allowed).toContain(h);
    }
  });
});
