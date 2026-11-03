import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import api from "@/utils/api";
import AppShell from "../app/AppShell";
import { Funnel, Kpis, Skeleton, ErrorBlock, plural, daysAgo } from "../app/blocks";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import DecisionQueue from "./DecisionQueue";
import RecruiterPerformance from "./RecruiterPerformance";

const capacity = (used, max) => (max == null ? `${used}` : `${used} of ${max}`);

/**
 * The company owner's overview. Its question: who is waiting on my decision?
 * The queue leads; hiring flow, open jobs and the team answer the next ones.
 */
const CompanyAdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [recruiters, setRecruiters] = useState([]);
  const [invite, setInvite] = useState({ open: false, email: "", name: "", sending: false });

  // Owners who never finished registration go back to pricing
  useEffect(() => {
    if (user?.role !== "company_admin" || user?.companyId) return;
    if (sessionStorage.getItem("pendingCompanyRegistration") || sessionStorage.getItem("pendingRegistration")) return;
    const t = setTimeout(() => {
      toast.error("Please complete your company registration first");
      navigate("/company/pricing", { replace: true, state: { fromIncompleteRegistration: true } });
    }, 500);
    return () => clearTimeout(t);
  }, [user, navigate]);

  const load = useCallback(async () => {
    setError(false);
    try {
      const [overview, team] = await Promise.all([api.get("/overview"), api.get("/company/recruiters").catch(() => ({ data: {} }))]);
      setData(overview.data);
      setRecruiters(team.data.recruiters ?? []);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    if (user?.companyId || user?.role !== "company_admin") load();
  }, [user, load]);

  const sendInvite = async (e) => {
    e.preventDefault();
    setInvite((s) => ({ ...s, sending: true }));
    try {
      await api.post("/company/recruiters/invite", { email: invite.email, name: invite.name });
      toast.success(`Invitation sent to ${invite.email}`);
      setInvite({ open: false, email: "", name: "", sending: false });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't send the invitation");
      setInvite((s) => ({ ...s, sending: false }));
    }
  };

  const removeRecruiter = async (r) => {
    if (!window.confirm(`Remove ${r.name || r.email} from the team? They lose access to your jobs and candidates.`)) return;
    try {
      await api.delete(`/company/recruiters/${r._id}`);
      toast.success("Recruiter removed");
      load();
    } catch {
      toast.error("Couldn't remove the recruiter");
    }
  };

  const resendInvite = async (r) => {
    try {
      await api.post(`/company/recruiters/${r._id}/resend-invite`, {});
      toast.success("Invitation resent");
    } catch {
      toast.error("Couldn't resend the invitation");
    }
  };

  const company = data?.company;
  const waiting = data?.awaitingDecision ?? 0;
  const seatsFull = data && data.usage.maxRecruiters != null && data.usage.recruiters >= data.usage.maxRecruiters;

  return (
    <AppShell title="Overview" scope={company?.name}>
      <div className="app-title-row">
        <div>
          <h1 className="app-h1">Overview</h1>
          <p className="app-finding">
            {!data ? (
              <Skeleton w={260} h={14} />
            ) : waiting ? (
              <>
                <strong>{plural(waiting, "candidate")}</strong> {waiting === 1 ? "is" : "are"} waiting on your decision.
              </>
            ) : (
              "Nothing is waiting on your decision."
            )}
          </p>
        </div>
        <Link to="/admin/jobs/create" className="app-btn app-btn-primary">
          Post a job
        </Link>
      </div>

      {error ? (
        <ErrorBlock what="your overview" onRetry={load} />
      ) : (
        <div className="app-grid">
          <div className="span-12">
            <Kpis
              loading={!data}
              items={
                data && [
                  { label: "Open jobs", value: capacity(data.usage.activeJobs, data.usage.maxJobs), sub: data.usage.maxJobs == null ? "Unlimited on your plan" : `${company.plan} plan` },
                  { label: "In interview", value: data.pipeline.stages.find((s) => s.key === "interviewing").count, sub: "on open jobs" },
                  { label: "Recruiter seats", value: capacity(data.usage.recruiters, data.usage.maxRecruiters), sub: seatsFull ? "All seats used" : "Active recruiters" },
                  { label: "Hired this month", value: data.hiredThisMonth, sub: "Hired or offer accepted" },
                ]
              }
            />
          </div>

          {/* Two stacked columns, so their bottoms land near each other */}
          <div className="span-7 app-col">
            <DecisionQueue onDecided={load} />

          <section className="app-panel" aria-labelledby="jobs-h">
            <div className="app-panel-head">
              <h2 className="app-h2" id="jobs-h">
                Open jobs
              </h2>
              <Link to="/admin/jobs" className="app-link">
                {data ? `View all ${data.openJobs.total}` : "View all"}
              </Link>
            </div>
            {!data ? (
              <Skeleton rows={4} />
            ) : data.openJobs.total === 0 ? (
              <p className="app-empty">
                No open jobs. <Link to="/admin/jobs/create">Post the first one</Link> and applicants will appear here.
              </p>
            ) : (
              <table className="app-table">
                <thead>
                  <tr>
                    <th scope="col">Job</th>
                    <th scope="col" className="num">
                      Applicants
                    </th>
                    <th scope="col" className="num">
                      Interviewing
                    </th>
                    <th scope="col" className="num">
                      Awaiting you
                    </th>
                    <th scope="col" className="num">
                      Open for
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.openJobs.rows.map((j) => (
                    <tr key={j.id}>
                      <td>
                        <Link to={`/admin/jobs/${j.id}/applicants`} className="app-row-title" style={{ display: "block", color: "inherit", textDecoration: "none" }}>
                          {j.title}
                        </Link>
                        <div className="app-row-sub">{j.location}</div>
                      </td>
                      <td className="num">{j.applicants}</td>
                      <td className="num">{j.interviewing}</td>
                      <td className="num">{j.decision || <span className="app-meta">—</span>}</td>
                      <td className="num app-meta">{daysAgo(j.daysOpen)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          </div>

          <div className="span-5 app-col">
          <section className="app-panel" aria-labelledby="flow-h">
            <div className="app-panel-head">
              <h2 className="app-h2" id="flow-h">
                Hiring flow
              </h2>
              <span className="app-meta">{data ? `${plural(data.pipeline.total, "applicant")} on open jobs` : ""}</span>
            </div>
            <Funnel pipeline={data?.pipeline} hue="decision" />
          </section>

          <section className="app-panel" aria-labelledby="team-h">
            <div className="app-panel-head">
              <h2 className="app-h2" id="team-h">
                Team
              </h2>
              <button type="button" className="app-btn app-btn-sm" onClick={() => setInvite((s) => ({ ...s, open: true }))} disabled={seatsFull} title={seatsFull ? "All recruiter seats on your plan are used" : undefined}>
                Invite recruiter
              </button>
            </div>
            {!data ? (
              <Skeleton rows={3} />
            ) : recruiters.length === 0 ? (
              <p className="app-empty">No recruiters yet. Invite one to share interviews and reports.</p>
            ) : (
              <ul className="app-list">
                {recruiters.map((r) => (
                  <li className="app-row" key={r._id}>
                    <div className="app-row-main">
                      <div className="app-row-title">{r.name || r.email}</div>
                      <div className="app-row-sub">{r.email}</div>
                    </div>
                    <div className="app-row-end">
                      {r.status === "pending" ? (
                        <>
                          <span className="app-pill app-pill-warning">Invited</span>
                          <button type="button" className="app-link" style={{ background: "none", border: 0, cursor: "pointer" }} onClick={() => resendInvite(r)}>
                            Resend
                          </button>
                        </>
                      ) : (
                        <span className="app-pill">Active</span>
                      )}
                      <button type="button" className="app-link" style={{ background: "none", border: 0, cursor: "pointer" }} onClick={() => removeRecruiter(r)}>
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {seatsFull && (
              <p className="app-meta" style={{ marginTop: 12 }}>
                All {data.usage.maxRecruiters} seats on the {company.plan} plan are used. <Link to="/company/billing">Change plan</Link>
              </p>
            )}
          </section>

          </div>

          <div className="span-12">
            <RecruiterPerformance />
          </div>
        </div>
      )}

      <Dialog open={invite.open} onOpenChange={(open) => setInvite((s) => ({ ...s, open }))}>
        <DialogContent className="bg-[#141414] border-0 text-white">
          <form onSubmit={sendInvite}>
            <DialogHeader>
              <DialogTitle>Invite a recruiter</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <label className="flex flex-col gap-2 text-sm font-medium">
                Email
                <input
                  type="email"
                  required
                  value={invite.email}
                  onChange={(e) => setInvite((s) => ({ ...s, email: e.target.value }))}
                  className="h-10 rounded-lg bg-[#0a0a0a] border border-[#444] px-3 font-normal"
                  autoComplete="email"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Name <span className="font-normal text-[#949494]">Optional</span>
                <input
                  value={invite.name}
                  onChange={(e) => setInvite((s) => ({ ...s, name: e.target.value }))}
                  className="h-10 rounded-lg bg-[#0a0a0a] border border-[#444] px-3 font-normal"
                  autoComplete="name"
                />
              </label>
            </div>
            <DialogFooter>
              <button type="submit" className="h-9 px-4 rounded-full bg-white text-black font-medium disabled:opacity-60" disabled={invite.sending}>
                {invite.sending ? "Sending…" : "Send invitation"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default CompanyAdminDashboard;
