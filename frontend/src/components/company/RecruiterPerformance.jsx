import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
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
    <section className="relative p-6 bg-[#111111] border border-white/10 rounded-sm" aria-label="Recruiter performance">
      <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-4">
        <BarChart3 className="w-5 h-5 text-[#FFD700]" /> Recruiter performance
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] font-mono uppercase tracking-wider text-gray-500">
              <th className="py-2 pr-4 font-normal">Recruiter</th>
              <th className="py-2 pr-4 font-normal">Interviews</th>
              <th className="py-2 pr-4 font-normal">Sent to you</th>
              <th className="py-2 font-normal">Hires</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id} className="border-t border-white/5">
                <td className="py-2 pr-4 text-gray-200">
                  {r.user?.fullname}
                  <div className="text-[11px] text-gray-500">{r.user?.email}</div>
                </td>
                <td className="py-2 pr-4 font-mono text-gray-300">{r.stats?.interviewsConducted ?? 0}</td>
                <td className="py-2 pr-4 font-mono text-gray-300">{r.stats?.candidatesPassedToCeo ?? 0}</td>
                <td className="py-2 font-mono text-gray-300">{r.stats?.successfulHires ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default RecruiterPerformance;
