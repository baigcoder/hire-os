import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { SUBSCRIPTION_API_END_POINT } from "@/utils/constant";
import Navbar from "../shared/Navbar";
import "../app/app.css";
import "../shared/navbar.css";

const PricingPage = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [, setLoading] = useState(true);
  const [, setSelectedPlan] = useState(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await axios.get(`${SUBSCRIPTION_API_END_POINT}/plans`);
      if (response.data.success) {
        setPlans(response.data.plans);
      }
    } catch (error) {
      // Fallback to default plans
      setPlans([
        {
          id: "basic",
          name: "BASIC",
          description: "Small Teams",
          prices: { monthly: 5000, quarterly: 13500, yearly: 48000 },
          features: {
            maxJobPostings: 5,
            maxRecruiters: 1,
            advancedAnalytics: false,
            prioritySupport: false,
            videoInterviews: false,
            mcqTests: false,
            aiRecommendations: false,
          },
        },
        {
          id: "professional",
          name: "PROFESSIONAL",
          description: "Growing Companies",
          popular: true,
          prices: { monthly: 15000, quarterly: 40500, yearly: 144000 },
          features: {
            maxJobPostings: 20,
            maxRecruiters: 5,
            advancedAnalytics: true,
            prioritySupport: true,
            videoInterviews: true,
            mcqTests: true,
            aiRecommendations: true,
          },
        },
        {
          id: "enterprise",
          name: "ENTERPRISE",
          description: "Large Organizations",
          prices: { monthly: 40000, quarterly: 108000, yearly: 384000 },
          features: {
            maxJobPostings: "Unlimited",
            maxRecruiters: "Unlimited",
            advancedAnalytics: true,
            prioritySupport: true,
            videoInterviews: true,
            mcqTests: true,
            aiRecommendations: true,
            apiAccess: true,
            dedicatedSupport: true,
          },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    navigate("/admin/signup", {
      state: { plan: plan.id, billing: billingCycle },
    });
  };

  // What the plans differ by, in the words a buyer uses
  const ROWS = [
    ["maxJobPostings", "Job posts"],
    ["maxRecruiters", "Recruiter seats"],
    ["videoInterviews", "Video interviews with the copilot"],
    ["mcqTests", "Assessments"],
    ["advancedAnalytics", "Analytics"],
    ["aiRecommendations", "Candidate matching"],
    ["prioritySupport", "Priority support"],
    ["apiAccess", "API access"],
  ];
  const cell = (v) => (v === true ? "Included" : v === false || v == null ? <span className="app-meta">—</span> : v === -1 ? "Unlimited" : String(v));
  const pkr = (n) => new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(n);
  const title = (n = "") => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
  const yearly = billingCycle === "yearly";

  return (
    <>
      <Navbar />
      <div className="app app-standalone">
        <main className="app-canvas" style={{ paddingTop: 72 }}>
          <header className="info-head">
            <h1 className="info-h1">Plans</h1>
            <p className="info-lead">Choose by how many jobs and recruiters you need, and whether you run video interviews with the copilot.</p>
          </header>

          <div className="app-tabs" role="radiogroup" aria-label="Billing" style={{ marginBottom: 20 }}>
            {[
              ["monthly", "Monthly"],
              ["yearly", "Yearly"],
            ].map(([id, label]) => (
              <button key={id} type="button" role="radio" aria-checked={billingCycle === id} className={billingCycle === id ? "is-active" : ""} onClick={() => setBillingCycle(id)}>
                {label}
              </button>
            ))}
          </div>

          <section className="app-panel" aria-label="Plans compared" style={{ overflowX: "auto" }}>
            <table className="app-table" style={{ minWidth: 720 }}>
              <thead>
                <tr>
                  <th scope="col">
                    <span className="sr-only">Feature</span>
                  </th>
                  {plans.map((plan) => (
                    <th scope="col" key={plan.id} style={{ verticalAlign: "top", textAlign: "left", paddingBottom: 16 }}>
                      <div className="app-row-title" style={{ fontSize: 18, display: "flex", gap: 8, alignItems: "center" }}>
                        {title(plan.name)}
                        {plan.popular && <span className="app-pill app-pill-positive">Most chosen</span>}
                      </div>
                      <div className="num" style={{ fontSize: 28, lineHeight: "36px", color: "var(--text)", margin: "8px 0 2px", fontWeight: 500 }}>
                        {pkr(plan.prices[billingCycle])}
                      </div>
                      <div className="app-meta" style={{ fontWeight: 400 }}>
                        {yearly ? `a year · saves ${pkr(plan.prices.monthly * 12 - plan.prices.yearly)}` : "a month"}
                      </div>
                      <button type="button" className={`app-btn app-btn-sm ${plan.popular ? "app-btn-primary" : ""}`} style={{ marginTop: 12 }} onClick={() => handleSelectPlan(plan)}>
                        Choose {title(plan.name)}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map(([key, label]) => (
                  <tr key={key}>
                    <th scope="row" style={{ fontWeight: 400, color: "var(--muted)" }}>
                      {label}
                    </th>
                    {plans.map((plan) => (
                      <td key={plan.id}>{cell(plan.features?.[key])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <p className="app-meta" style={{ marginTop: 16 }}>
            Prices in Pakistani rupees. Job seekers never pay to apply.
          </p>
        </main>
      </div>
    </>
  );
};

export default PricingPage;
