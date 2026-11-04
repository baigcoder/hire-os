import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { Search } from "lucide-react";
import { toast } from "sonner";
import api from "@/utils/api";
import useGetAllJobs from "@/hooks/useGetAllJobs";
import Navbar from "./shared/Navbar";
import { useInShell } from "./app/shellContext";
import { Skeleton } from "./app/blocks";
import "./app/app.css";

const PER = { yearly: "a year", monthly: "a month", hourly: "an hour" };
const salaryOf = (j) => (j.salary ? `Rs ${Number(j.salary).toLocaleString("en-PK")} ${PER[j.salaryType] ?? "a year"}` : null);
const ago = (d) => {
  const days = Math.floor((Date.now() - new Date(d)) / 864e5);
  return days <= 0 ? "Today" : days === 1 ? "Yesterday" : days < 7 ? `${days} days ago` : days < 30 ? `${Math.floor(days / 7)} wk ago` : `${Math.floor(days / 30)} mo ago`;
};

const SORTS = {
  newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  oldest: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  pay: (a, b) => (b.salary || 0) - (a.salary || 0),
};

/** Every open job, filtered by what it really is: where, what kind, and words in it. */
const Jobs = () => {
  useGetAllJobs();
  const navigate = useNavigate();
  const inShell = useInShell();
  const { allJobs, searchedQuery } = useSelector((s) => s.job);
  const { user } = useSelector((s) => s.auth);
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get("q") || searchedQuery || "");
  const [place, setPlace] = useState("all");
  const [type, setType] = useState("all");
  const [sort, setSort] = useState("newest");
  const [saved, setSaved] = useState(() => new Set());

  // Saved jobs, for signed-in candidates
  useEffect(() => {
    if (user?.role !== "student") return;
    api
      .get("/job/saved")
      .then(({ data }) => setSaved(new Set((data.jobs ?? []).map((j) => String(j._id ?? j)))))
      .catch(() => {});
  }, [user?.role]);

  // The filter choices come from the jobs themselves, so none can match nothing
  const places = useMemo(() => [...new Set((allJobs ?? []).map((j) => j.location).filter(Boolean))].sort(), [allJobs]);
  const types = useMemo(() => [...new Set((allJobs ?? []).map((j) => j.jobType).filter(Boolean))].sort(), [allJobs]);

  const jobs = useMemo(() => {
    const words = q.trim().toLowerCase();
    return (allJobs ?? [])
      .filter((j) => place === "all" || j.location === place)
      .filter((j) => type === "all" || j.jobType === type)
      .filter(
        (j) =>
          !words ||
          [j.title, j.description, j.location, j.company?.name, ...(j.requirements ?? []), ...(j.skills ?? [])].some((t) => t?.toLowerCase().includes(words)),
      )
      .sort(SORTS[sort]);
  }, [allJobs, q, place, type, sort]);

  const toggleSave = async (e, job) => {
    e.stopPropagation();
    if (!user) return navigate("/login");
    const id = String(job._id);
    try {
      await api.post(`/job/save/${id}`);
      setSaved((s) => {
        const next = new Set(s);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });
    } catch {
      toast.error("Couldn't save the job");
    }
  };

  const page = (
    <>
      <div className="app-title-row">
        <h1 className="app-h1">Jobs</h1>
        <span className="app-meta num">{allJobs ? `${jobs.length} of ${allJobs.length}` : ""}</span>
      </div>

      <div className="app-toolbar">
        <label className="app-search" style={{ flex: "1 1 280px" }}>
          <Search aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title, skill or company" aria-label="Search jobs" />
        </label>
        <select className="app-select" value={place} onChange={(e) => setPlace(e.target.value)} aria-label="Location">
          <option value="all">Anywhere</option>
          {places.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <select className="app-select" value={type} onChange={(e) => setType(e.target.value)} aria-label="Type">
          <option value="all">Any type</option>
          {types.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select className="app-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="pay">Highest pay</option>
        </select>
      </div>

      <section className="app-panel" aria-label="Jobs" style={{ padding: 0 }}>
        {!allJobs ? (
          <div style={{ padding: 20 }}>
            <Skeleton rows={6} />
          </div>
        ) : jobs.length === 0 ? (
          <p className="app-empty">
            No jobs match.{" "}
            <button
              type="button"
              className="app-link"
              onClick={() => {
                setQ("");
                setPlace("all");
                setType("all");
              }}
            >
              Clear filters
            </button>
          </p>
        ) : (
          <ul className="app-list">
            {jobs.map((j) => {
              const isSaved = saved.has(String(j._id));
              return (
                <li key={j._id}>
                  <div
                    className="app-row app-pick app-job-row"
                    role="link"
                    tabIndex={0}
                    onClick={() => navigate(`/description/${j._id}`)}
                    onKeyDown={(e) => e.key === "Enter" && navigate(`/description/${j._id}`)}
                    style={{ padding: "16px 20px", cursor: "pointer" }}
                  >
                    <div className="app-row-main">
                      <div className="app-row-title">{j.title}</div>
                      <div className="app-row-sub">{[j.company?.name, j.location, j.jobType].filter(Boolean).join(" · ")}</div>
                    </div>
                    <div className="app-row-end" style={{ gap: 16 }}>
                      <span className="num">{salaryOf(j) ?? <span className="app-meta">Pay not listed</span>}</span>
                      <span className="app-meta" style={{ minWidth: 84, textAlign: "right" }}>
                        {ago(j.createdAt)}
                      </span>
                      {user?.role !== "recruiter" && user?.role !== "company_admin" && (
                        <button type="button" className="app-btn app-btn-sm" aria-pressed={isSaved} onClick={(e) => toggleSave(e, j)}>
                          {isSaved ? "Saved" : "Save"}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {!user && (
        <p className="app-meta" style={{ marginTop: 16 }}>
          <Link to="/signup" className="app-link">
            Create an account
          </Link>{" "}
          to save jobs and apply.
        </p>
      )}
    </>
  );

  // Signed in, the app frame already wraps this page; visitors get the public bar and the same page
  if (inShell) return page;
  return (
    <>
      <Navbar />
      <div className="app app-standalone">
        <main className="app-canvas">{page}</main>
      </div>
    </>
  );
};

export default Jobs;
