import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import api from "@/utils/api";
import AppShell from "../app/AppShell";
import { Skeleton, ErrorBlock } from "../app/blocks";
import DecisionQueue from "./DecisionQueue";

/** Today for the company's owner: the decisions waiting on them, and their open jobs. */
const CompanyAdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

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
      setData((await api.get("/overview")).data);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    if (user?.companyId || user?.role !== "company_admin") load();
  }, [user, load]);

  return (
    <AppShell title="Today">
      <h1 className="app-h1 app-page-title">Today</h1>
      {error ? (
        <ErrorBlock what="today" onRetry={load} />
      ) : (
        <div className="app-grid">
          <div className="span-8">
            <DecisionQueue onDecided={load} />
          </div>
          <section className="span-4" aria-labelledby="jobs-h">
            <div className="app-side-head">
              <h2 className="app-h2 app-side-h" id="jobs-h">
                Open jobs
              </h2>
              <Link to="/admin/jobs/create" className="app-link">
                Post a job
              </Link>
            </div>
            {!data ? (
              <Skeleton rows={3} />
            ) : data.openJobs.total === 0 ? (
              <p className="app-meta">None yet.</p>
            ) : (
              <ul className="app-list">
                {data.openJobs.rows.map((j) => (
                  <li key={j.id}>
                    <Link to={`/admin/jobs/${j.id}/applicants`} className="app-later">
                      <span className="app-row-title">{j.title}</span>
                      <span className="app-row-sub num">
                        {j.applicants} applied{j.interviewing ? ` · ${j.interviewing} interviewing` : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </AppShell>
  );
};

export default CompanyAdminDashboard;
