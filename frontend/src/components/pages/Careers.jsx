import { Link } from "react-router-dom";
import IndustrialPageLayout from "../layout/IndustrialPageLayout";

/** Careers: our own openings are posted on HIRE.OS like anyone else's. */
const Careers = () => (
  <IndustrialPageLayout title="Careers" subtitle="When we hire, we post the job on HIRE.OS and interview the way the product does: structured, scored, decided on evidence.">
    <section className="app-panel" style={{ maxWidth: 760 }} aria-labelledby="open-h">
      <h2 className="app-h2" id="open-h" style={{ marginBottom: 8 }}>
        Open roles
      </h2>
      <p className="app-meta" style={{ margin: "0 0 16px" }}>
        Every opening is listed with the other jobs, with its location, type and pay.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link className="app-btn app-btn-primary" to="/jobs?q=HIRE.OS">
          See open jobs
        </Link>
        <Link className="app-btn" to="/contact?topic=General">
          Ask a question
        </Link>
      </div>
    </section>
  </IndustrialPageLayout>
);

export default Careers;
