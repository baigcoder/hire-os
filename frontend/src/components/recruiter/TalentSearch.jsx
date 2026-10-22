import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Loader2, Search, ShieldAlert, Users } from "lucide-react";
import Navbar from "../shared/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DISCOVER_API_END_POINT } from "@/utils/constant";
import { BAND_STYLES } from "@/components/student/resume-intel/reportModel";

const EXAMPLES = [
  "Backend engineer with Node.js and PostgreSQL in production",
  "Frontend developer who has shipped React apps with tests",
  "Data analyst strong in SQL and dashboards",
];

/**
 * Semantic search across the blind screening profiles of every applicant to
 * the recruiter's jobs. Results stay anonymous; open the job's applicants
 * page to see who a candidate is.
 */
const TalentSearch = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const search = async (q) => {
    const text = q.trim();
    if (text.length < 2) return;
    setQuery(text);
    setLoading(true);
    try {
      const { data } = await axios.get(`${DISCOVER_API_END_POINT}/candidates`, {
        params: { q: text, limit: 15 },
        withCredentials: true,
      });
      setResults(data.candidates);
    } catch (e) {
      toast.error(e.response?.data?.message || "Search failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      {/* pt-24 clears the fixed navbar */}
      <div className="max-w-5xl mx-auto px-4 pt-24 pb-8 space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Users className="w-6 h-6 text-[#FFD700]" /> Talent search
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Describe who you&apos;re looking for. Searches every screened
            applicant to your company&apos;s jobs by meaning, with names hidden.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            search(query);
          }}
          className="flex gap-2"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={300}
            placeholder="e.g. senior backend engineer who has scaled PostgreSQL"
            className="flex-1 bg-[#111111] border border-white/10 rounded-md px-4 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-[#FFD700]/50"
          />
          <Button
            type="submit"
            disabled={loading || query.trim().length < 2}
            className="bg-yellow-500 text-black hover:bg-yellow-400 font-bold"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </Button>
        </form>

        {results === null && (
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => search(e)}
                className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:border-[#FFD700]/40"
              >
                {e}
              </button>
            ))}
          </div>
        )}

        {results?.length === 0 && (
          <p className="text-sm text-gray-500">
            No screened applicants match yet. Candidates appear here once their
            applications have been screened.
          </p>
        )}

        {results?.length > 0 && (
          <ul className="bg-[#0a0a0a] border border-white/10 rounded-2xl divide-y divide-white/5">
            {results.map((c, index) => (
              <li
                key={c.applicationId}
                className="flex items-center gap-4 px-5 py-4"
              >
                <span className="w-6 text-xs font-mono text-gray-600">
                  #{index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-gray-200">
                      Candidate {index + 1}
                      {c.headline && (
                        <span className="text-gray-500 font-normal">
                          {" "}
                          · {c.headline}
                        </span>
                      )}
                    </span>
                    {c.flagged && (
                      <Badge className="border border-red-500/30 bg-red-500/10 text-red-300 text-[10px]">
                        <ShieldAlert className="w-3 h-3 mr-1" /> Flagged
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Applied to{" "}
                    <Link
                      to={`/admin/jobs/${c.jobId}/applicants`}
                      className="text-gray-300 hover:text-[#FFD700]"
                    >
                      {c.jobTitle || "a job"}
                    </Link>
                    {c.years != null && ` · ${c.years} years experience`}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {c.topSkills.map((s) => (
                      <span
                        key={s}
                        className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[11px] text-gray-400"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-mono text-[#FFD700]">
                    {Math.round(c.similarity * 100)}% similar
                  </div>
                  {c.score !== null && (
                    <Badge
                      className={`mt-1 border font-mono ${BAND_STYLES[c.band]}`}
                    >
                      job fit {c.score}
                    </Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default TalentSearch;
