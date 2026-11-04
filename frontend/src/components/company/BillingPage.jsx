import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/utils/api";
import { SUBSCRIPTION_API_END_POINT } from "@/utils/constant";
import { useSubscription } from "@/hooks/useSubscription";
import { Skeleton } from "../app/blocks";

const PLAN_NAME = { basic: "Basic", professional: "Professional", enterprise: "Enterprise" };
const PLAN_PRICE = { basic: 5000, professional: 15000, enterprise: 40000 };

const pkr = (n) => new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(n);
const day = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** Billing: the plan you're on, how much of it you use, and what you've paid. */
const BillingPage = () => {
  const { subscription, loading, getDaysRemaining, isExpired, isExpiringSoon } = useSubscription();
  const [payments, setPayments] = useState(null);

  const loadPayments = useCallback(() => {
    api
      .get(`${SUBSCRIPTION_API_END_POINT}/history`)
      .then(({ data }) => setPayments(data.payments ?? []))
      .catch(() => setPayments([]));
  }, []);
  useEffect(loadPayments, [loadPayments]);

  const plan = subscription?.plan ?? "basic";
  const days = getDaysRemaining();
  const status = isExpired() ? ["Expired", "app-pill-negative"] : isExpiringSoon() ? [`Ends in ${days} days`, "app-pill-warning"] : ["Active", "app-pill-positive"];
  const f = subscription?.features ?? {};
  const u = subscription?.usage ?? {};
  const usage = [
    ["Job posts", u.activeJobs ?? 0, f.maxJobPostings],
    ["Recruiter seats", u.activeRecruiters ?? 0, f.maxRecruiters],
  ];

  return (
    <>
      <div className="app-title-row">
        <h1 className="app-h1">Billing</h1>
        <Link to="/company/pricing" className="app-btn app-btn-primary">
          Change plan
        </Link>
      </div>

      {loading ? (
        <Skeleton rows={6} />
      ) : (
        <div className="app-grid">
          <section className="app-panel span-7" aria-labelledby="plan-h">
            <div className="app-panel-head">
              <h2 className="app-h2" id="plan-h">
                {PLAN_NAME[plan] ?? plan} plan
              </h2>
              <span className={`app-pill ${status[1]}`}>{status[0]}</span>
            </div>
            <dl className="app-dl">
              <div>
                <dt>Price</dt>
                <dd className="num">{PLAN_PRICE[plan] ? `${pkr(PLAN_PRICE[plan])} a month` : "—"}</dd>
              </div>
              <div>
                <dt>Started</dt>
                <dd>{subscription?.startDate ? day(subscription.startDate) : "—"}</dd>
              </div>
              <div>
                <dt>{isExpired() ? "Ended" : "Renews"}</dt>
                <dd>
                  {subscription?.endDate ? day(subscription.endDate) : "—"}
                  {!isExpired() && days != null && <span className="app-meta"> · in {days} days</span>}
                </dd>
              </div>
              <div>
                <dt>Video interviews</dt>
                <dd>{f.aiInterviews ? "Included" : <span className="app-meta">Not on this plan</span>}</dd>
              </div>
              <div>
                <dt>Analytics</dt>
                <dd>{f.advancedAnalytics ? "Included" : <span className="app-meta">Not on this plan</span>}</dd>
              </div>
            </dl>
          </section>

          <section className="app-panel span-5" aria-labelledby="use-h">
            <h2 className="app-h2" id="use-h">
              Usage
            </h2>
            <div className="app-col" style={{ marginTop: 12 }}>
              {usage.map(([label, used, max]) => {
                const unlimited = max === -1 || max == null;
                return (
                  <div key={label}>
                    <div className="app-panel-head" style={{ marginBottom: 8 }}>
                      <span>{label}</span>
                      <span className="num app-meta">{unlimited ? `${used} · unlimited` : `${used} of ${max}`}</span>
                    </div>
                    {!unlimited && (
                      <div className="app-progress" aria-hidden="true">
                        <span style={{ width: `${Math.min(100, (used / max) * 100)}%` }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="app-panel span-12" aria-labelledby="pay-h">
            <h2 className="app-h2" id="pay-h">
              Payments
            </h2>
            {payments === null ? (
              <Skeleton rows={3} />
            ) : payments.length === 0 ? (
              <p className="app-meta" style={{ marginTop: 8 }}>
                No payments yet.
              </p>
            ) : (
              <table className="app-table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Plan</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="num">
                      Amount
                    </th>
                    <th scope="col">
                      <span className="sr-only">Invoice</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p, i) => (
                    <tr key={p.transactionId ?? i}>
                      <td>{p.paymentDate ? day(p.paymentDate) : "—"}</td>
                      <td>{PLAN_NAME[p.plan] ?? p.plan}</td>
                      <td>
                        <span className={`app-pill ${p.status === "completed" ? "app-pill-positive" : p.status === "failed" ? "app-pill-negative" : ""}`}>{p.status}</span>
                      </td>
                      <td className="num">{pkr(p.amount ?? 0)}</td>
                      <td className="app-row-actions">
                        {p.invoiceUrl && (
                          <a className="app-link" href={p.invoiceUrl} target="_blank" rel="noreferrer">
                            Invoice
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}
    </>
  );
};

export default BillingPage;
