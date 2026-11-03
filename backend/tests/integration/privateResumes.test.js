import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../../index.js";
import { User } from "../../models/user.model.js";
import { Job } from "../../models/job.model.js";
import { Company } from "../../models/company.model.js";
import { Application } from "../../models/application.model.js";
import { setStorageAdminForTests, supabaseUrl } from "../../utils/supabase.js";
import { fetchResumeFile } from "../../modules/screening/resumeSource.js";

process.env.SECRET_KEY = process.env.SECRET_KEY || "test-secret-key";

const PDF_BYTES = Buffer.from("%PDF-1.4\n% fake resume for tests\n%%EOF\n");

/** In-memory stand-in for the Supabase service-role storage client. */
const makeFakeStorage = () => {
  const objects = new Map();
  const signed = [];
  return {
    objects,
    signed,
    from: (bucket) => ({
      upload: async (path, buffer, options) => {
        objects.set(`${bucket}/${path}`, { buffer, options });
        return { data: { path }, error: null };
      },
      createSignedUrl: async (path, expiresIn, options) => {
        signed.push({ bucket, path, expiresIn, options });
        return {
          data: {
            signedUrl: `https://signed.test/${bucket}/${path}?ttl=${expiresIn}`,
          },
          error: null,
        };
      },
      download: async (path) => {
        const object = objects.get(`${bucket}/${path}`);
        return object
          ? { data: new Blob([object.buffer]), error: null }
          : { data: null, error: new Error("Object not found") };
      },
    }),
  };
};

let phone = 9500000000;
const createUser = (fields) =>
  User.create({
    phoneNumber: String(phone++),
    password: "test-password",
    ...fields,
  });
const auth = (user) => ({
  Authorization: `Bearer ${jwt.sign({ userId: user._id.toString() }, process.env.SECRET_KEY)}`,
});

describe("private resumes (S11)", () => {
  let storage, student, otherStudent, recruiter, outsider, job;

  beforeEach(async () => {
    storage = makeFakeStorage();
    setStorageAdminForTests(storage);

    student = await createUser({
      fullname: "Student",
      email: "s@test.com",
      role: "student",
    });
    otherStudent = await createUser({
      fullname: "Other",
      email: "o@test.com",
      role: "student",
    });
    recruiter = await createUser({
      fullname: "Rec",
      email: "r@acme.test",
      role: "recruiter",
    });
    outsider = await createUser({
      fullname: "Out",
      email: "r@other.test",
      role: "recruiter",
    });
    const company = await Company.create({
      name: "Acme",
      email: "hr@acme.test",
      description: "Acme builds logistics software for everyone.",
      website: "https://acme.test",
      location: "Remote",
      adminUser: recruiter._id,
      userId: recruiter._id,
    });
    await User.updateOne({ _id: recruiter._id }, { companyId: company._id });
    job = await Job.create({
      title: "Engineer",
      description:
        "A job description that is long enough to pass the model validation.",
      salary: 1,
      location: "Remote",
      jobType: "Full-time",
      experienceLevel: 1,
      position: 1,
      company: company._id,
      created_by: recruiter._id,
    });
  });

  afterEach(() => setStorageAdminForTests(null));

  const uploadResume = (user) =>
    request(app)
      .post("/api/v1/user/profile/update")
      .set(auth(user))
      .attach("file", PDF_BYTES, {
        filename: "My CV.pdf",
        contentType: "application/pdf",
      });

  it("uploads to the private bucket and stores a path plus an API link", async () => {
    const res = await uploadResume(student);
    expect(res.status).toBe(200);

    const saved = await User.findById(student._id).lean();
    expect(saved.profile.resumePath).toMatch(
      new RegExp(`^${student._id}/\\d+-\\w+\\.pdf$`),
    );
    expect(saved.profile.resume).toMatch(
      new RegExp(
        `^http://127\\.0\\.0\\.1:\\d+/api/v1/resumes/${student._id}\\?v=\\d+$`,
      ),
    );
    expect(saved.profile.resumeOriginalName).toBe("My CV.pdf");
    expect([...storage.objects.keys()]).toEqual([
      `resumes/${saved.profile.resumePath}`,
    ]);
    expect(storage.objects.values().next().value.options.contentType).toBe(
      "application/pdf",
    );
  });

  it("redirects authorized viewers to a 60-second signed URL", async () => {
    await uploadResume(student);
    const { profile } = await User.findById(student._id).lean();

    const own = await request(app)
      .get(`/api/v1/resumes/${student._id}`)
      .set(auth(student));
    expect(own.status).toBe(302);
    expect(own.headers.location).toBe(
      `https://signed.test/resumes/${profile.resumePath}?ttl=60`,
    );
    expect(own.headers["cache-control"]).toBe("no-store");
    expect(storage.signed[0].options).toEqual({ download: "My CV.pdf" });

    // Recruiters only once the student applied to their company's job
    const before = await request(app)
      .get(`/api/v1/resumes/${student._id}`)
      .set(auth(recruiter));
    expect(before.status).toBe(404);
    await Application.create({ job: job._id, applicant: student._id });
    const after = await request(app)
      .get(`/api/v1/resumes/${student._id}`)
      .set(auth(recruiter));
    expect(after.status).toBe(302);

    for (const viewer of [outsider, otherStudent]) {
      const res = await request(app)
        .get(`/api/v1/resumes/${student._id}`)
        .set(auth(viewer));
      expect(res.status).toBe(404);
    }
    const anonymous = await request(app).get(`/api/v1/resumes/${student._id}`);
    expect(anonymous.status).toBe(401);
  });

  it("serves legacy public-URL records from the private bucket", async () => {
    await User.updateOne(
      { _id: student._id },
      {
        "profile.resume": `${supabaseUrl}/storage/v1/object/public/resumes/legacy/old%20cv.pdf`,
      },
    );
    const res = await request(app)
      .get(`/api/v1/resumes/${student._id}`)
      .set(auth(student));
    expect(res.status).toBe(302);
    expect(storage.signed[0].path).toBe("legacy/old cv.pdf");

    await User.updateOne(
      { _id: otherStudent._id },
      {
        "profile.resume": `${supabaseUrl}/storage/v1/object/public/avatars/x.png`,
      },
    );
    const wrongBucket = await request(app)
      .get(`/api/v1/resumes/${otherStudent._id}`)
      .set(auth(otherStudent));
    expect(wrongBucket.status).toBe(404);
  });

  it("lets screening read private resumes by path and refuses other buckets", async () => {
    await uploadResume(student);
    const { profile } = await User.findById(student._id).lean();

    const file = await fetchResumeFile({ path: profile.resumePath });
    expect(file.mimetype).toBe("application/pdf");
    expect(file.buffer.equals(PDF_BYTES)).toBe(true);

    await expect(
      fetchResumeFile(`${supabaseUrl}/storage/v1/object/public/avatars/a.pdf`),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_SOURCE" });
    await expect(
      fetchResumeFile({ path: "missing.pdf" }),
    ).rejects.toMatchObject({
      code: "DOWNLOAD_FAILED",
    });
  });

  it("fails clearly when the service-role key isn't configured", async () => {
    setStorageAdminForTests(null);
    const saved = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    try {
      const res = await uploadResume(student);
      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/Failed to upload resume/);
    } finally {
      if (saved !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = saved;
    }
  });
});
