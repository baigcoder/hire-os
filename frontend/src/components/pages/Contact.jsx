import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "@/utils/api";
import IndustrialPageLayout from "../layout/IndustrialPageLayout";

const TOPICS = ["General", "Support", "Sales", "Press"];

/** Contact: a form that really sends (POST /contact), or says plainly when it can't. */
const Contact = () => {
  const [params] = useSearchParams();
  const [form, setForm] = useState({ name: "", email: "", topic: TOPICS.includes(params.get("topic")) ? params.get("topic") : "General", message: "" });
  const [state, setState] = useState({ sending: false, sent: false, error: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const send = async (e) => {
    e.preventDefault();
    setState({ sending: true, sent: false, error: "" });
    try {
      await api.post("/contact", form);
      setState({ sending: false, sent: true, error: "" });
    } catch (err) {
      setState({ sending: false, sent: false, error: err.response?.data?.message || "Your message couldn't be sent. Please try again." });
    }
  };

  return (
    <IndustrialPageLayout title="Contact" subtitle="Questions about plans, help with your account, or a story: write to us and we'll reply by email.">
      <section className="app-panel" style={{ maxWidth: 760 }} aria-labelledby="msg-h">
        <h2 className="app-h2" id="msg-h">
          Send a message
        </h2>
        {state.sent ? (
          <p style={{ margin: "12px 0 0" }}>Thanks, {form.name.split(" ")[0]}. We&apos;ll reply to {form.email}.</p>
        ) : (
          <form onSubmit={send}>
            <dl className="app-dl">
              <div>
                <dt>
                  <label htmlFor="c-name">Name</label>
                </dt>
                <dd>
                  <input id="c-name" className="app-input" required maxLength={100} autoComplete="name" value={form.name} onChange={set("name")} />
                </dd>
              </div>
              <div>
                <dt>
                  <label htmlFor="c-email">Email</label>
                </dt>
                <dd>
                  <input id="c-email" className="app-input" type="email" required autoComplete="email" value={form.email} onChange={set("email")} />
                </dd>
              </div>
              <div>
                <dt>
                  <label htmlFor="c-topic">Topic</label>
                </dt>
                <dd>
                  <select id="c-topic" className="app-select" value={form.topic} onChange={set("topic")}>
                    {TOPICS.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </dd>
              </div>
              <div>
                <dt>
                  <label htmlFor="c-msg">Message</label>
                </dt>
                <dd>
                  <textarea id="c-msg" className="app-input" required minLength={10} maxLength={4000} value={form.message} onChange={set("message")} />
                </dd>
              </div>
            </dl>
            {state.error && (
              <p role="alert" style={{ color: "var(--pill-negative-ink)", margin: "8px 0 0" }}>
                {state.error}
              </p>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
              <button type="submit" className="app-btn app-btn-primary" disabled={state.sending}>
                {state.sending ? "Sending…" : "Send message"}
              </button>
            </div>
          </form>
        )}
      </section>
    </IndustrialPageLayout>
  );
};

export default Contact;
