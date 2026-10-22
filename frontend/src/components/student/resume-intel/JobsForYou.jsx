import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Briefcase, Compass, MapPin } from "lucide-react";
import { DISCOVER_API_END_POINT } from "@/utils/constant";
import { Section } from "./shared";

/**
 * Open jobs closest in meaning to the candidate's analyzed resume (semantic
 * search). Renders nothing when semantic search isn't configured or the
 * resume hasn't been indexed yet.
 */
const JobsForYou = () => {
  const [jobs, setJobs] = useState(null);

  useEffect(() => {
    let cancelled = false;
    axios
      .get(`${DISCOVER_API_END_POINT}/jobs`, {
        params: { limit: 5 },
        withCredentials: true,
      })
      .then(({ data }) => !cancelled && setJobs(data.jobs || []))
      .catch(() => !cancelled && setJobs([]));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!jobs?.length) return null;

  return (
    <Section icon={Compass} title="Jobs for you">
      <ul className="divide-y divide-white/5">
        {jobs.map((job) => (
          <li key={job._id} className="py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  to={`/description/${job._id}`}
                  className="text-sm font-semibold text-gray-100 hover:text-[#FFD700]"
                >
                  {job.title}
                </Link>
                <p className="flex flex-wrap items-center gap-x-3 text-xs text-gray-500 mt-0.5">
                  {job.company?.name && (
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3 h-3" /> {job.company.name}
                    </span>
                  )}
                  {job.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {job.location}
                    </span>
                  )}
                  {job.jobType && <span>{job.jobType}</span>}
                </p>
              </div>
              <span
                className="shrink-0 text-xs font-mono text-[#FFD700]"
                title="How closely the job's description matches your resume"
              >
                {Math.round(job.similarity * 100)}% similar
              </span>
            </div>
            {(job.matchedSkills?.length > 0 ||
              job.missingSkills?.length > 0) && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {job.matchedSkills?.slice(0, 6).map((s) => (
                  <span
                    key={`m-${s}`}
                    className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[11px] text-emerald-300"
                  >
                    {s}
                  </span>
                ))}
                {job.missingSkills?.slice(0, 4).map((s) => (
                  <span
                    key={`x-${s}`}
                    className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[11px] text-gray-500"
                    title="Asked for by the job, not on your resume"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-gray-600 mt-3">
        Ranked by meaning, not just keywords. Green skills you already have;
        grey ones the job also asks for.
      </p>
    </Section>
  );
};

export default JobsForYou;
