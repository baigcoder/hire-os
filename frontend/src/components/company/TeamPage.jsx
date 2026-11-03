import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import api from "@/utils/api";
import { Skeleton, ErrorBlock } from "../app/blocks";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";

/** The company's recruiters: who's on the team, their activity, and inviting more. */
const TeamPage = () => {
  const [team, setTeam] = useState(null);
  const [activity, setActivity] = useState({});
  const [usage, setUsage] = useState(null);
  const [error, setError] = useState(false);
  const [invite, setInvite] = useState(null); // { email, name, sending }

  const load = useCallback(async () => {
    setError(false);
    try {
      const [t, o, perf] = await Promise.all([
        api.get("/company/recruiters"),
        api.get("/overview"),
        api.get("/company/recruiter-performance").catch(() => ({ data: {} })),
      ]);
      setTeam(t.data.recruiters ?? []);
      setUsage(o.data.usage ?? null);
      setActivity(Object.fromEntries((perf.data.recruiters ?? []).map((r) => [r.user?.email, r.stats])));
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const full = usage && usage.maxRecruiters != null && usage.recruiters >= usage.maxRecruiters;

  const send = async (e) => {
    e.preventDefault();
    setInvite((s) => ({ ...s, sending: true }));
    try {
      await api.post("/company/recruiters/invite", { email: invite.email, name: invite.name });
      toast.success(`Invitation sent to ${invite.email}`);
      setInvite(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't send the invitation");
      setInvite((s) => ({ ...s, sending: false }));
    }
  };

  const remove = async (r) => {
    if (!window.confirm(`Remove ${r.name || r.email}? They lose access to your jobs and candidates.`)) return;
    try {
      await api.delete(`/company/recruiters/${r._id}`);
      toast.success("Removed");
      load();
    } catch {
      toast.error("Couldn't remove them");
    }
  };

  const resend = async (r) => {
    try {
      await api.post(`/company/recruiters/${r._id}/resend-invite`, {});
      toast.success("Invitation resent");
    } catch {
      toast.error("Couldn't resend the invitation");
    }
  };

  return (
    <>
      <div className="app-title-row">
        <h1 className="app-h1">Team</h1>
        {full ? (
          <Link to="/company/billing" className="app-btn">
            All {usage.maxRecruiters} seats used · Upgrade
          </Link>
        ) : (
          <button type="button" className="app-btn app-btn-primary" onClick={() => setInvite({ email: "", name: "" })}>
            Invite recruiter
          </button>
        )}
      </div>

      {error ? (
        <ErrorBlock what="your team" onRetry={load} />
      ) : (
        <section className="app-panel" aria-label="Recruiters">
          {!team ? (
            <Skeleton rows={4} />
          ) : team.length === 0 ? (
            <p className="app-done">Invite a recruiter to share interviews and reports.</p>
          ) : (
            <table className="app-table">
              <thead>
                <tr>
                  <th scope="col">Recruiter</th>
                  <th scope="col" className="num">
                    Interviews
                  </th>
                  <th scope="col" className="num">
                    Sent to you
                  </th>
                  <th scope="col" className="num">
                    Hires
                  </th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {team.map((r) => {
                  const s = activity[r.email];
                  return (
                    <tr key={r._id}>
                      <td>
                        <div className="app-row-title">
                          {r.name || r.email}
                          {r.status === "pending" && (
                            <span className="app-pill app-pill-warning" style={{ marginLeft: 8 }}>
                              Invited
                            </span>
                          )}
                        </div>
                        {r.name && <div className="app-row-sub">{r.email}</div>}
                      </td>
                      <td className="num">{s?.interviewsConducted ?? <span className="app-meta">—</span>}</td>
                      <td className="num">{s?.candidatesPassedToCeo ?? <span className="app-meta">—</span>}</td>
                      <td className="num">{s?.successfulHires ?? <span className="app-meta">—</span>}</td>
                      <td className="app-row-actions">
                        {r.status === "pending" && (
                          <button type="button" className="app-link" onClick={() => resend(r)}>
                            Resend
                          </button>
                        )}
                        <button type="button" className="app-link" onClick={() => remove(r)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      )}

      <Dialog open={!!invite} onOpenChange={(open) => !open && setInvite(null)}>
        <DialogContent className="bg-[#141414] border-0 text-white">
          {invite && (
            <form onSubmit={send} className="flex flex-col gap-4">
              <DialogHeader>
                <DialogTitle>Invite a recruiter</DialogTitle>
              </DialogHeader>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Email
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={invite.email}
                  onChange={(e) => setInvite((s) => ({ ...s, email: e.target.value }))}
                  className="h-10 rounded-lg bg-[#0a0a0a] border border-[#444] px-3 font-normal"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Name
                <input
                  autoComplete="name"
                  value={invite.name}
                  onChange={(e) => setInvite((s) => ({ ...s, name: e.target.value }))}
                  className="h-10 rounded-lg bg-[#0a0a0a] border border-[#444] px-3 font-normal"
                />
              </label>
              <DialogFooter>
                <button type="submit" disabled={invite.sending} className="h-9 px-4 rounded-full bg-white text-black font-medium disabled:opacity-60">
                  {invite.sending ? "Sending…" : "Send invitation"}
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TeamPage;
