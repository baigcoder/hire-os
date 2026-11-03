import { Link } from "react-router-dom";

/**
 * A list of things to do, one per row: what, for which job, when, and the
 * single action that clears it. Used by every role's Today screen.
 * task: { key, title, sub, meta?, late?, action: { label, to?, onClick?, primary? } }
 */
export const TaskList = ({ tasks, empty }) =>
  tasks.length === 0 ? (
    <p className="app-done">{empty}</p>
  ) : (
    <ul className="app-tasks">
      {tasks.map((t) => (
        <li key={t.key} className="app-task">
          <div className="app-task-main">
            <span className="app-task-title">{t.title}</span>
            {t.sub && <span className="app-task-sub">{t.sub}</span>}
          </div>
          {t.meta && <span className={`app-task-meta num ${t.late ? "is-late" : ""}`}>{t.meta}</span>}
          {t.action &&
            (t.action.to ? (
              <Link to={t.action.to} className={`app-btn app-btn-sm ${t.action.primary ? "app-btn-primary" : ""}`}>
                {t.action.label}
              </Link>
            ) : (
              <button type="button" onClick={t.action.onClick} className={`app-btn app-btn-sm ${t.action.primary ? "app-btn-primary" : ""}`}>
                {t.action.label}
              </button>
            ))}
        </li>
      ))}
    </ul>
  );
