import AccountSettings from "./app/AccountSettings";

/** Settings: one page, each section with its own heading. Every control is backed by the API. */
const SettingsPage = () => (
  <>
    <div className="app-title-row">
      <h1 className="app-h1">Settings</h1>
    </div>
    <div className="app-col" style={{ maxWidth: 760 }}>
      <AccountSettings />
    </div>
  </>
);

export default SettingsPage;
