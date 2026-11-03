import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../../index.js";
import { User } from "../../models/user.model.js";
import { Job } from "../../models/job.model.js";
import { Company } from "../../models/company.model.js";
import { parseSalary, parseYears } from "../../controllers/job.controller.js";

let phone = 9960000000;
const createUser = (fields) => User.create({ phoneNumber: String(phone++), password: "test-password-hash", fullname: fields.role, ...fields });
const auth = (user) => ({ Authorization: `Bearer ${jwt.sign({ userId: user._id.toString() }, process.env.SECRET_KEY)}` });

const ownerOf = async (name) => {
  const owner = await createUser({ email: `ceo@${name}.test`, role: "company_admin" });
  const company = await Company.create({
    subscription: { status: "active" },
    name,
    email: `hr@${name}.test`,
    description: `${name} builds logistics software for everyone.`,
    website: `https://${name}.test`,
    location: "Remote",
    adminUser: owner._id,
  });
  await User.updateOne({ _id: owner._id }, { companyId: company._id });
  return { owner, company };
};

describe("reading job fields", () => {
  it("parses salaries and experience the way people type them", () => {
    expect(parseSalary("80,000 - 120,000 PKR")).toBe(80000);
    expect(parseSalary(150000)).toBe(150000);
    expect(parseSalary("negotiable")).toBe(0);
    expect(parseYears("1-2 years")).toBe(1);
    expect(parseYears("6+ years")).toBe(6);
    expect(parseYears("Senior Level")).toBe(6);
    expect(parseYears("Fresher")).toBe(0);
    expect(parseYears(3)).toBe(3);
  });
});

describe("editing a job", () => {
  let acme, other, job;
  beforeEach(async () => {
    acme = await ownerOf("acme");
    other = await ownerOf("other");
    job = await Job.create({
      title: "Backend",
      description: "Build APIs with Node.js and PostgreSQL for our platform.",
      requirements: ["Node.js"],
      salary: 1000,
      location: "Remote",
      jobType: "Full-time",
      experienceLevel: 2,
      position: 1,
      company: acme.company._id,
      created_by: acme.owner._id,
    });
  });

  const edit = (user, body) => request(app).put(`/api/v1/job/update/${job._id}`).set(auth(user)).send(body);

  it("changes the editable fields, read like a new post", async () => {
    const res = await edit(acme.owner, { title: "  Senior backend engineer ", salary: "200,000 - 250,000", experience: "4-6 years", requirements: "Node.js, AWS" });
    expect(res.status).toBe(200);
    const saved = await Job.findById(job._id).lean();
    expect(saved).toMatchObject({ title: "Senior backend engineer", salary: 200000, experienceLevel: 4, requirements: ["Node.js", "AWS"] });
  });

  it("ignores fields an edit must never change", async () => {
    await edit(acme.owner, { title: "Backend v2", company: other.company._id, created_by: other.owner._id, views: 9999, applications: [] });
    const saved = await Job.findById(job._id).lean();
    expect(String(saved.company)).toBe(String(acme.company._id));
    expect(String(saved.created_by)).toBe(String(acme.owner._id));
    expect(saved.views).toBe(0);
    expect(saved.title).toBe("Backend v2");
  });

  it("refuses an empty edit and another company's owner", async () => {
    expect((await edit(acme.owner, { company: other.company._id })).status).toBe(400);
    expect((await edit(other.owner, { title: "Hijacked" })).status).toBe(403);
  });
});
