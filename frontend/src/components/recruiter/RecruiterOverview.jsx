import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/utils/api";
import AppShell from "../app/AppShell";
import { Skeleton, ErrorBlock, PipelineStrip } from "../app/blocks";
import { recruiterTasks } from "../app/today.js";
import { TaskList } from "../app/TaskList";

const RecruiterOverview = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      setData((await api.get("/overview")).data);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
    // Interviews move from "later" to "join" while the screen is open
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  const { tasks, later, more } = recruiterTasks(data);

  return (
    <AppShell title="Today">
      <h1 className="app-h1 app-page-title">Today</h1>
      {error ? (
        <ErrorBlock what="today" onRetry={load} />
      ) : (
        <div className="app-grid">
          <div className="span-8 app-col">
            <div>
              {!data ? <Skeleton rows={6} /> : <TaskList tasks={tasks} empty="Nothing needs you right now." />}
              {more > 0 && (
                <Link to="/recruiter/applicants" className="app-link app-more-link">
                  {more} more waiting for review
                </Link>
              )}
            </div>
            <section className="app-panel" aria-labelledby="pipe-h">
              <div className="app-panel-head">
                <h2 className="app-h2" id="pipe-h">
                  Pipeline
                </h2>
                <Link to="/recruiter/pipeline" className="app-link">
                  Open board
                </Link>
              </div>
              {!data ? <Skeleton rows={2} /> : <PipelineStrip pipeline={data.pipeline} focus="new" />}
            </section>
          </div>
          <section className="span-4" aria-labelledby="later-h">
            <h2 className="app-h2 app-side-h" id="later-h">
              Coming up
            </h2>
            {!data ? (
              <Skeleton rows={3} />
            ) : later.length === 0 ? (
              <p className="app-meta">No interviews after today.</p>
            ) : (
              <ul className="app-list">
                {later.map((l) => (
                  <li key={l.key}>
                    <Link to={l.to} className="app-later">
                      <span className="app-row-title">{l.title}</span>
                      <span className="app-row-sub">
                        {l.meta} · {l.sub}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </AppShell>
  );
};

export default RecruiterOverview;
