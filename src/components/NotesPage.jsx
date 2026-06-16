// NotesPage.jsx — soft delete + click to edit
import { useState, useEffect } from "react";
import { fetchEntries, softDeleteEntry } from "../lib/entries";
import EmptyState from "./EmptyState";

export default function NotesPage({ openModal, bumpCounts }) {
  const [notes, setNotes]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    async function load() {
      const { data, error } = await fetchEntries({ type: "note" });
      if (error) setError(error.message);
      else setNotes(data || []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleDelete(id) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await softDeleteEntry(id);
    bumpCounts?.();
  }

  function formatDate(s) {
    return new Date(s + "T00:00:00").toLocaleDateString(undefined, {
      month: "short", day: "numeric", year: "numeric",
    });
  }

  if (loading) return <div className="page"><div className="loading-inline">Loading...</div></div>;
  if (error)   return <div className="page"><div className="form-error">Error: {error}</div></div>;

  return (
    <div className="page">
      <div className="page-header-row">
        <h1 className="page-title">Notes</h1>
        <button
          className="btn-primary"
          style={{ width: "auto", padding: "10px 16px" }}
          onClick={() => openModal({ type: "note" })}
        >
          + New note
        </button>
      </div>

      {notes.length === 0 ? (
        <EmptyState
          icon="📝"
          title="No notes yet"
          message="Jot down ideas, thoughts, or anything to remember."
          actionLabel="+ Write your first note"
          onAction={() => openModal({ type: "note" })}
        />
      ) : (
        <div className="notes-grid">
          {notes.map((n) => (
            <div
              key={n.id}
              className="note-card"
              style={{ borderTop: `3px solid ${n.color}`, cursor: "pointer" }}
              onClick={() => openModal({ editEntry: n })}
            >
              <div className="note-card-title">{n.title}</div>
              {n.description && <div className="note-card-body">{n.description}</div>}
              <div className="note-card-footer">
                <span className="note-card-date">{formatDate(n.date)}</span>
                <button
                  className="note-card-delete"
                  onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
