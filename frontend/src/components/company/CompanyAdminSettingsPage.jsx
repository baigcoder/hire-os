import { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/utils/api";
import { COMPANY_API_END_POINT } from "@/utils/constant";
import AccountSettings from "../app/AccountSettings";

const EMPTY = { name: "", description: "", website: "", location: "" };

/** The owner's settings: the company first, then their own account. */
const CompanyAdminSettingsPage = () => {
  const [company, setCompany] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get(`${COMPANY_API_END_POINT}/dashboard`)
      .then(({ data }) => {
        const c = data.company ?? {};
        setCompany({ name: c.name || "", description: c.description || "", website: c.website || "", location: c.location || "" });
      })
      .catch(() => {
        setCompany(EMPTY);
        toast.error("Couldn't load the company profile");
      });
  }, []);

  const set = (key) => (e) => setCompany((c) => ({ ...c, [key]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`${COMPANY_API_END_POINT}/profile`, company);
      toast.success("Company profile saved");
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't save the company profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="app-title-row">
        <h1 className="app-h1">Settings</h1>
      </div>
      <div className="app-col" style={{ maxWidth: 760 }}>
        <form className="app-panel" onSubmit={save} aria-labelledby="co-h">
          <h2 className="app-h2" id="co-h">
            Company
          </h2>
          {!company ? (
            <p className="app-meta">Loading…</p>
          ) : (
            <>
              <dl className="app-dl">
                <div>
                  <dt>
                    <label htmlFor="co-name">Name</label>
                  </dt>
                  <dd>
                    <input id="co-name" className="app-input" required value={company.name} onChange={set("name")} />
                  </dd>
                </div>
                <div>
                  <dt>
                    <label htmlFor="co-site">Website</label>
                  </dt>
                  <dd>
                    <input id="co-site" className="app-input" type="url" placeholder="https://" value={company.website} onChange={set("website")} />
                  </dd>
                </div>
                <div>
                  <dt>
                    <label htmlFor="co-city">City</label>
                  </dt>
                  <dd>
                    <input id="co-city" className="app-input" value={company.location} onChange={set("location")} />
                  </dd>
                </div>
                <div>
                  <dt>
                    <label htmlFor="co-about">About</label>
                  </dt>
                  <dd>
                    <textarea id="co-about" className="app-input" value={company.description} onChange={set("description")} maxLength={1000} />
                  </dd>
                </div>
              </dl>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                <button type="submit" className="app-btn app-btn-primary" disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </>
          )}
        </form>
        <AccountSettings />
      </div>
    </>
  );
};

export default CompanyAdminSettingsPage;
