import { safeHttpUrl } from "@/utils/safeUrl";
import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import api from "@/utils/api";
import { toast } from "sonner";
import { setUser } from "@/redux/authSlice";
import { USER_API_END_POINT } from "@/utils/constant";

const ROLE = { student: "Candidate", recruiter: "Recruiter", company_admin: "Owner" };

const LINKS = [
  ["linkedin", "LinkedIn"],
  ["github", "GitHub"],
  ["twitter", "X / Twitter"],
  ["website", "Website"],
];

const initials = (name) =>
  (name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const fromUser = (user) => ({
  fullname: user?.fullname || "",
  phoneNumber: user?.phoneNumber || "",
  bio: user?.profile?.bio || "",
  location: typeof user?.profile?.location === "object" ? user?.profile?.location?.city || "" : user?.profile?.location || "",
  skills: user?.profile?.skills?.join(", ") || "",
  linkedin: user?.profile?.socialLinks?.linkedin || "",
  github: user?.profile?.socialLinks?.github || "",
  twitter: user?.profile?.socialLinks?.twitter || "",
  website: user?.profile?.socialLinks?.website || user?.profile?.socialLinks?.portfolio || "",
});

/** Your profile: who you are, what you can do, and your resume. One edit mode for all of it. */
const ProfilePage = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((store) => store.auth);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => fromUser(user));
  const [resumeFile, setResumeFile] = useState(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const isCandidate = user?.role === "student";
  const skills = user?.profile?.skills ?? [];
  const location = fromUser(user).location;

  // What's missing, so the completeness bar comes with what to do about it
  const checks = [
    ["Phone", user?.phoneNumber],
    ["About", user?.profile?.bio],
    ["Skills", skills.length],
    ["Resume", user?.profile?.resume],
    ["Photo", user?.profile?.profilePhoto],
  ];
  const done = checks.filter(([, v]) => v).length;
  const missing = checks.filter(([, v]) => !v).map(([k]) => k);

  // The same stage counts the candidate's Today uses, so the two never disagree
  const [pipeline, setPipeline] = useState(null);
  useEffect(() => {
    if (user?.role !== "student") return;
    api
      .get("/overview")
      .then(({ data }) => setPipeline(data.pipeline))
      .catch(() => setPipeline({ stages: [], total: 0 }));
  }, [user?.role]);
  const stages = (pipeline?.stages ?? []).filter((s) => s.count > 0 || ["new", "interviewing", "hired"].includes(s.key));

  const uploadPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    try {
      const res = await api.post(`${USER_API_END_POINT}/profile/photo`, body, { headers: { "Content-Type": "multipart/form-data" } });
      if (res.data.success) {
        dispatch(setUser({ ...user, profile: { ...(user?.profile || {}), profilePhoto: res.data.profilePhoto } }));
        toast.success("Photo updated");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't upload the photo");
    }
  };

  const pickResume = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") return toast.error("Upload a PDF");
    if (file.size > 5 * 1024 * 1024) return toast.error("Keep it under 5 MB");
    setResumeFile(file);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = new FormData();
      ["fullname", "phoneNumber", "bio", "location", "skills"].forEach((k) => body.append(k, form[k]));
      body.append("socialLinks", JSON.stringify({ linkedin: form.linkedin, github: form.github, twitter: form.twitter, website: form.website }));
      if (resumeFile) body.append("file", resumeFile);
      const res = await api.post(`${USER_API_END_POINT}/profile/update`, body, { headers: { "Content-Type": "multipart/form-data" } });
      if (res.data.success) {
        dispatch(setUser(res.data.user));
        toast.success("Profile saved");
        setEditing(false);
        setResumeFile(null);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't save the profile");
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setForm(fromUser(user));
    setResumeFile(null);
    setEditing(false);
  };

  const dash = <span className="app-meta">—</span>;

  return (
    <form onSubmit={save}>
      <div className="app-title-row">
        <div className="app-person">
          <div className="app-person-photo">
            {user?.profile?.profilePhoto ? <img src={user.profile.profilePhoto} alt="" /> : initials(user?.fullname)}
            <label title="Change photo">
              <span className="sr-only">Change photo</span>
              <input type="file" accept="image/*" hidden onChange={uploadPhoto} />
            </label>
          </div>
          <div>
            <h1 className="app-h1">{user?.fullname}</h1>
            <p className="app-meta">{[ROLE[user?.role], location].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
        {editing ? (
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="app-btn" onClick={cancel}>
              Cancel
            </button>
            <button type="submit" className="app-btn app-btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        ) : (
          <button type="button" className="app-btn" onClick={() => setEditing(true)}>
            Edit profile
          </button>
        )}
      </div>

      <div className="app-grid">
        <div className="span-8 app-col">
          <section className="app-panel" aria-labelledby="about-h">
            <h2 className="app-h2" id="about-h" style={{ marginBottom: 12 }}>
              About
            </h2>
            {editing ? (
              <textarea className="app-input" value={form.bio} onChange={set("bio")} maxLength={600} aria-label="About you" />
            ) : user?.profile?.bio ? (
              <p style={{ margin: 0 }}>{user.profile.bio}</p>
            ) : (
              <p className="app-meta" style={{ margin: 0 }}>
                Nothing here yet.
              </p>
            )}
          </section>

          <section className="app-panel" aria-labelledby="details-h">
            <h2 className="app-h2" id="details-h">
              Details
            </h2>
            <dl className="app-dl">
              <div>
                <dt>Name</dt>
                <dd>{editing ? <input className="app-input" value={form.fullname} onChange={set("fullname")} required aria-label="Name" /> : user?.fullname}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{user?.email}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{editing ? <input className="app-input" value={form.phoneNumber} onChange={set("phoneNumber")} type="tel" aria-label="Phone" /> : user?.phoneNumber || dash}</dd>
              </div>
              <div>
                <dt>City</dt>
                <dd>{editing ? <input className="app-input" value={form.location} onChange={set("location")} aria-label="City" /> : location || dash}</dd>
              </div>
            </dl>
          </section>

          <section className="app-panel" aria-labelledby="skills-h">
            <h2 className="app-h2" id="skills-h" style={{ marginBottom: 12 }}>
              Skills
            </h2>
            {editing ? (
              <input className="app-input" value={form.skills} onChange={set("skills")} aria-label="Skills, separated by commas" placeholder="Node.js, PostgreSQL, AWS" />
            ) : skills.length ? (
              <div className="app-chips">
                {skills.map((s) => (
                  <span className="app-chip" key={s}>
                    {s}
                  </span>
                ))}
              </div>
            ) : (
              <p className="app-meta" style={{ margin: 0 }}>
                Add skills to see jobs matched to them.
              </p>
            )}
          </section>

          <section className="app-panel" aria-labelledby="links-h">
            <h2 className="app-h2" id="links-h">
              Links
            </h2>
            <dl className="app-dl">
              {LINKS.map(([key, label]) => (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>
                    {editing ? (
                      <input className="app-input" value={form[key]} onChange={set(key)} type="url" placeholder="https://" aria-label={label} />
                    ) : safeHttpUrl(user?.profile?.socialLinks?.[key]) ? (
                      <a className="app-link" href={safeHttpUrl(user.profile.socialLinks[key])} target="_blank" rel="noreferrer">
                        {user.profile.socialLinks[key].replace(/^https?:\/\/(www\.)?/, "")}
                      </a>
                    ) : (
                      dash
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <div className="span-4 app-col">
          {isCandidate && (
            <section className="app-panel" aria-labelledby="resume-h">
              <h2 className="app-h2" id="resume-h" style={{ marginBottom: 12 }}>
                Resume
              </h2>
              {user?.profile?.resume ? (
                <a className="app-link" href={user.profile.resume} target="_blank" rel="noreferrer">
                  {user.profile.resumeOriginalName || "Your resume (PDF)"}
                </a>
              ) : (
                <p className="app-meta" style={{ margin: 0 }}>
                  No resume yet.
                </p>
              )}
              {editing && (
                <label className="app-btn" style={{ marginTop: 12 }}>
                  {resumeFile ? resumeFile.name : user?.profile?.resume ? "Replace PDF" : "Upload PDF"}
                  <input type="file" accept="application/pdf" hidden onChange={pickResume} />
                </label>
              )}
            </section>
          )}

          <section className="app-panel" aria-labelledby="complete-h">
            <div className="app-panel-head">
              <h2 className="app-h2" id="complete-h">
                Profile
              </h2>
              <span className="app-meta num">
                {done} of {checks.length}
              </span>
            </div>
            <div className="app-progress" aria-hidden="true">
              <span style={{ width: `${(done / checks.length) * 100}%` }} />
            </div>
            <p className="app-meta" style={{ margin: "10px 0 0" }}>
              {missing.length ? `Missing: ${missing.join(", ").toLowerCase()}.` : "Complete."}
            </p>
          </section>

          {isCandidate && (
            <section className="app-panel" aria-labelledby="apps-h">
              <div className="app-panel-head">
                <h2 className="app-h2" id="apps-h">
                  Applications
                </h2>
                <Link to="/applied-jobs" className="app-link">
                  All {pipeline?.total ?? ""}
                </Link>
              </div>
              <dl className="app-dl">
                {stages.map((st) => (
                  <div key={st.key}>
                    <dt>{st.label}</dt>
                    <dd className="num" style={{ textAlign: "right" }}>
                      {st.count}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      </div>
    </form>
  );
};

export default ProfilePage;
