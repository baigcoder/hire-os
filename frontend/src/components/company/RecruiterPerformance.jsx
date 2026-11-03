import { useEffect, useState } from "react";
import api from "@/utils/api";

/** Per-recruiter activity for the owner (moved from the old CEO dashboard). */
const RecruiterPerformance = () => {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    api
      .get("/company/recruiter-performance")
      .then((res) => setRows(res.data.recruiters ?? []))
      .catch(() => setRows([]));
  }, []);

  if (!rows?.length) return null;

  return (
    <section className="app-panel" aria-labelledby="perf-h">
      <div className="app-panel-head">
        <h2 className="app-h2" id="perf-h">
          Recruiter activity
        </h2>
        <span className="app-meta">All time</span>
      </div>
      <table className="app-table">
        <thead>
          <tr>
            <th scope="col">Recruiter</th>
            <th scope="col" className="num">
              Interviews held
            </th>
            <th scope="col" className="num">
              Sent to you
            </th>
            <th scope="col" className="num">
              Hires
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r._id}>
              <td>
                <div className="app-row-title">{r.user?.fullname}</div>
                <div className="app-row-sub">{r.user?.email}</div>
              </td>
              <td className="num">{r.stats?.interviewsConducted ?? 0}</td>
              <td className="num">{r.stats?.candidatesPassedToCeo ?? 0}</td>
              <td className="num">{r.stats?.successfulHires ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};

export default RecruiterPerformance;
