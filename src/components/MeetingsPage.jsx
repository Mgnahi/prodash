// MeetingsPage.jsx — soft delete + click to edit
import { useState, useEffect } from "react";
import { fetchEntries, softDeleteEntry } from "../lib/entries";
import EmptyState from "./EmptyState";

export default function MeetingsPage({ openModal, bumpCounts }) {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    async function load() {
      const { data, error } = await fetchEntries({ type: "meeting" });
      if (error) setError(error.message);
      else setMeetings(data || []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleDelete(id) {
    setMeetings((prev) => prev.filter((m) => m.id !== id));
    await softDeleteEntry(id);
    bumpCounts?.();
  }

  const grouped = meetings.reduce((acc, m) => {
    if (!acc[m.date]) acc[m.date] = [];
    acc[m.date].push(m);
    return acc;
  }, {});
  const groupedKeys = Object.keys(grouped).sort();

  function formatDate(s) {
    return new Date(s + "T00:00:00").toLocaleDateString(undefined, {
      weekday: "long", month: "long", day: "numeric",
    });
  }

  if (loading) return <div className="page"><div className="loading-inline">Loading...</div></div>;
  if (error)   return <div className="page"><div className="form-error">Error: {error}</div></div>;

  return (
    <div className="page">
      <div className="page-header-row">
        <h1 className="page-title">Meetings</h1>
        <button
          className="btn-primary"
          style={{ width: "auto", padding: "10px 16px" }}
          onClick={() => openModal({ type: "meeting" })}
        >
          + New meeting
        </button>
      </div>

      {meetings.length === 0 ? (
        <EmptyState
          icon="🤝"
          title="No meetings scheduled"
          message="Track your meetings and never miss one."
          actionLabel="+ Schedule a meeting"
          onAction={() => openModal({ type: "meeting" })}
        />
      ) : (
        groupedKeys.map((dateStr) => (
          <div key={dateStr} style={{ marginBottom: 20 }}>
            <div className="section-label">{formatDate(dateStr)}</div>
            <div className="panel">
              {grouped[dateStr].map((m) => (
                <div
                  key={m.id}
                  className="meeting-row"
                  onClick={() => openModal({ editEntry: m })}
                  style={{ cursor: "pointer" }}
                >
                  <span className="meeting-time">{m.time ? m.time.slice(0, 5) : "—"}</span>
                  <span className="meeting-dot" style={{ background: m.color }}></span>
                  <div className="meeting-info">
                    <div className="meeting-title">{m.title}</div>
                    {m.description && <div className="meeting-meta">{m.description}</div>}
                  </div>
                  <button
                    className="reminder-btn dismiss"
                    onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
