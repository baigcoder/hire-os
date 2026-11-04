import request from "supertest";
import { app } from "../../index.js";

describe("POST /api/v1/contact", () => {
  const ok = { name: "Sana", email: "sana@example.com", topic: "Sales", message: "We'd like a demo for our team of twelve." };

  it("refuses a message without a reply address or with too little to say", async () => {
    expect((await request(app).post("/api/v1/contact").send({ ...ok, email: "nope" })).status).toBe(400);
    expect((await request(app).post("/api/v1/contact").send({ ...ok, message: "hi" })).status).toBe(400);
    expect((await request(app).post("/api/v1/contact").send({ ...ok, name: "" })).status).toBe(400);
  });

  it("says plainly when mail isn't configured instead of claiming it was sent", async () => {
    const saved = { host: process.env.SMTP_HOST, user: process.env.SMTP_USER, pass: process.env.SMTP_PASS };
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    const res = await request(app).post("/api/v1/contact").send(ok);
    Object.assign(process.env, Object.fromEntries(Object.entries({ SMTP_HOST: saved.host, SMTP_USER: saved.user, SMTP_PASS: saved.pass }).filter(([, v]) => v)));
    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
  });
});
