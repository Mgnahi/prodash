// ============================================================
// RemindersPage.jsx — filters now actually filter + soft delete
// ============================================================
import { useState, useEffect } from "react";
import { fetchEntries, softDeleteEntry, todayString } from "../lib/entries";
import EmptyState from "./EmptyState";

const FILTERS = ["All", "Overdue", "Today", "This week", "Upcoming"];

export default function RemindersPage({ openModal, bumpCounts }) {
  const [activeFilter, setActiveFilter] = useState("All");
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  useEffect(() => {
    async function load() {
      const { data, error } = await fetchEntries({ type: "reminder" });
      if (error) setError(error.message);
      else setReminders(data || []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleDismiss(id) {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    await softDeleteEntry(id);
    bumpCounts?.();
  }

  const today = todayString();
  const weekFromNow = new Date(new Date(today).getTime() + 7 * 86400000)
    .toISOString().split("T")[0];

  const overdue  = reminders.filter((r) => r.date < today);
  const todays   = reminders.filter((r) => r.date === today);
  const thisWeek = reminders.filter((r) => r.date > today && r.date <= weekFromNow);
  const upcoming = reminders.filter((r) => r.date > weekFromNow);

  // Real filter logic now
  let visibleSections;
  switch (activeFilter) {
    case "Overdue":   visibleSections = [["OVERDUE", overdue]]; break;
    case "Today":     visibleSections = [["TODAY", todays]]; break;
    case "This week": visibleSections = [["THIS WEEK", thisWeek]]; break;
    case "Upcoming":  visibleSections = [["UPCOMING", upcoming]]; break;
    default: visibleSections = [
      ["OVERDUE", overdue],
      ["TODAY", todays],
      ["UPCOMING", [...thisWeek, ...upcoming]],
    ];
  }

  if (loading) return <div className="page"><div className="loading-inline">Loading...</div></div>;
  if (error)   return <div className="page"><div className="form-error">Error: {error}</div></div>;

  return (
    <div className="page">
      <div className="page-header-row">
        <h1 className="page-title">Reminders</h1>
        <button
          className="btn-primary"
          style={{ width: "auto", padding: "10px 16px" }}
          onClick={() => openModal({ type: "reminder" })}
        >
          + New reminder
        </button>
      </div>

      <div className="filter-pills">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`filter-pill ${activeFilter === f ? "active" : ""}`}
            onClick={() => setActiveFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {reminders.length === 0 ? (
        <EmptyState
          icon="🔔"
          title="No reminders yet"
          message="Create reminders to get nudged before important moments."
          actionLabel="+ Create your first reminder"
          onAction={() => openModal({ type: "reminder" })}
        />
      ) : (
        visibleSections.every(([_, items]) => items.length === 0) ? (
          <div className="panel-empty" style={{ padding: 40 }}>
            No reminders match this filter.
          </div>
        ) : (
          visibleSections.map(([sectionLabel, items]) =>
            items.length > 0 && (
              <Section
                key={sectionLabel}
                title={sectionLabel}
                items={items}
                onDismiss={handleDismiss}
                onEdit={(r) => openModal({ editEntry: r })}
              />
            )
          )
        )
      )}
    </div>
  );
}

function Section({ title, items, onDismiss, onEdit }) {
  const today = todayString();

  function statusFor(r) {
    if (r.date < today) {
      const days = Math.floor((new Date(today) - new Date(r.date)) / 86400000);
      return { text: `${days} day${days === 1 ? "" : "s"} overdue`, color: "#EF4444" };
    }
    if (r.date === today) {
      return { text: "Due today", color: "#F59E0B" };
    }
    const friendly = new Date(r.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return { text: friendly, color: "#7C3AED" };
  }

  return (
    <>
      <div className="section-label">{title}</div>
      {items.map((r) => {
        const status = statusFor(r);
        return (
          <div
            key={r.id}
            className="reminder-card"
            onClick={() => onEdit(r)}
            style={{ cursor: "pointer" }}
          >
            <div className="reminder-icon">⏰</div>
            <div className="reminder-body">
              <div className="reminder-title">{r.title}</div>
              {r.description && <div className="reminder-description">{r.description}</div>}
              <span
                className="reminder-status"
                style={{ background: `${status.color}20`, color: status.color }}
              >
                {status.text}
              </span>
            </div>
            <div className="reminder-actions">
              <button
                className="reminder-btn dismiss"
                onClick={(e) => { e.stopPropagation(); onDismiss(r.id); }}
              >
                Dismiss
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
}
