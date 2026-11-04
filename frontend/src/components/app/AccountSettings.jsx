import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "@/utils/api";
import { logout } from "@/redux/authSlice";
import { when } from "./format.js";

const ROLE = { student: "Candidate", recruiter: "Recruiter", company_admin: "Owner" };

/**
 * The settings every account has: who you are, your password, the devices
 * you're signed in on, and closing the account. Each control here is backed
 * by the API; nothing is a placeholder.
 */
const AccountSettings = () => {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [pw, setPw] = useState({ current: "", next: "" });
  const [savingPw, setSavingPw] = useState(false);
  const [sessions, setSessions] = useState(null);
  const [closing, setClosing] = useState(null); // the password typed to confirm, or null

  const loadSessions = useCallback(() => {
    api
      .get("/user/sessions")
      .then(({ data }) => setSessions(data.sessions ?? []))
      .catch(() => setSessions([]));
  }, []);
  useEffect(loadSessions, [loadSessions]);

  const changePassword = async (e) => {
    e.preventDefault();
    if (pw.next.length < 8) return toast.error("Use 8 or more characters");
    setSavingPw(true);
    try {
      await api.post("/user/change-password", { currentPassword: pw.current, newPassword: pw.next });
      toast.success("Password changed. Other devices are signed out.");
      setPw({ current: "", next: "" });
      loadSessions();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't change the password");
    } finally {
      setSavingPw(false);
    }
  };

  const signOutSession = async (id) => {
    try {
      await api.delete(`/user/sessions/${id}`);
      loadSessions();
    } catch {
      toast.error("Couldn't sign that device out");
    }
  };

  const signOutOthers = async () => {
    try {
      await api.post("/user/sessions/revoke-all");
      toast.success("Signed out everywhere else");
      loadSessions();
    } catch {
      toast.error("Couldn't sign the other devices out");
    }
  };

  const closeAccount = async (e) => {
    e.preventDefault();
    try {
      await api.post("/user/delete-account", { password: closing });
      dispatch(logout());
      toast.success("Your account is closed");
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't close the account");
    }
  };

  const others = (sessions ?? []).filter((s) => !s.isCurrent).length;

  return (
    <>
      <section className="app-panel" aria-labelledby="acct-h">
        <h2 className="app-h2" id="acct-h">
          Account
        </h2>
        <dl className="app-dl">
          <div>
            <dt>Email</dt>
            <dd>{user?.email}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>{ROLE[user?.role] ?? user?.role}</dd>
          </div>
        </dl>
      </section>

      <form className="app-panel" onSubmit={changePassword} aria-labelledby="pw-h">
        <h2 className="app-h2" id="pw-h">
          Password
        </h2>
        <input type="email" value={user?.email ?? ""} autoComplete="username" readOnly hidden />
        <dl className="app-dl">
          <div>
            <dt>
              <label htmlFor="pw-current">Current password</label>
            </dt>
            <dd>
              <input id="pw-current" className="app-input" type="password" autoComplete="current-password" required value={pw.current} onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} />
            </dd>
          </div>
          <div>
            <dt>
              <label htmlFor="pw-next">New password</label>
            </dt>
            <dd>
              <input id="pw-next" className="app-input" type="password" autoComplete="new-password" required minLength={8} value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} />
            </dd>
          </div>
        </dl>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <button type="submit" className="app-btn app-btn-primary" disabled={savingPw}>
            {savingPw ? "Saving…" : "Change password"}
          </button>
        </div>
      </form>

      <section className="app-panel" aria-labelledby="dev-h">
        <div className="app-panel-head">
          <h2 className="app-h2" id="dev-h">
            Signed-in devices
          </h2>
          {others > 0 && (
            <button type="button" className="app-link" onClick={signOutOthers}>
              Sign out everywhere else
            </button>
          )}
        </div>
        {sessions === null ? (
          <p className="app-meta">Loading…</p>
        ) : sessions.length === 0 ? (
          <p className="app-meta">No other sessions.</p>
        ) : (
          <ul className="app-list">
            {sessions.map((s) => (
              <li className="app-row" key={s.id}>
                <div className="app-row-main">
                  <div className="app-row-title">{s.device || "A browser"}</div>
                  <div className="app-row-sub">
                    {s.isCurrent ? "This device" : `Last used ${when(s.lastUsed || s.createdAt)}`}
                    {s.ipAddress ? ` · ${s.ipAddress}` : ""}
                  </div>
                </div>
                {!s.isCurrent && (
                  <button type="button" className="app-btn app-btn-sm" onClick={() => signOutSession(s.id)}>
                    Sign out
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="app-panel" aria-labelledby="close-h">
        <h2 className="app-h2" id="close-h">
          Close account
        </h2>
        {closing === null ? (
          <div className="app-panel-head" style={{ marginBottom: 0 }}>
            <p className="app-meta" style={{ margin: 0 }}>
              Deletes your account and profile. This can&apos;t be undone.
            </p>
            <button type="button" className="app-btn app-btn-danger" onClick={() => setClosing("")}>
              Close account
            </button>
          </div>
        ) : (
          <form onSubmit={closeAccount} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input className="app-input" type="password" autoComplete="current-password" required placeholder="Your password" aria-label="Confirm with your password" value={closing} onChange={(e) => setClosing(e.target.value)} autoFocus />
            <button type="button" className="app-btn" onClick={() => setClosing(null)}>
              Cancel
            </button>
            <button type="submit" className="app-btn app-btn-danger">
              Close for good
            </button>
          </form>
        )}
      </section>
    </>
  );
};

export default AccountSettings;
