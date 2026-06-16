
import { useState, useEffect } from "react";
import {
  fetchTrash,
  restoreEntry,
  permanentlyDeleteEntry,
  emptyTrash,
} from "../lib/entries";
import EmptyState from "./EmptyState";

export default function TrashPage({ bumpCounts }) {
  const [trash, setTrash]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    async function load() {
      const { data, error } = await fetchTrash();
      if (error) setError(error.message);
      else setTrash(data || []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleRestore(id) {
    setTrash((prev) => prev.filter((t) => t.id !== id));
    await restoreEntry(id);
    bumpCounts?.();
  }

  async function handlePermanentDelete(id) {
    if (!window.confirm("Permanently delete this entry? This cannot be undone.")) {
      return;
    }
    setTrash((prev) => prev.filter((t) => t.id !== id));
    await permanentlyDeleteEntry(id);
  }

  async function handleEmptyTrash() {
    if (!window.confirm(
      `Permanently delete all ${trash.length} item${trash.length === 1 ? "" : "s"} in trash? ` +
      `This cannot be undone.`
    )) {
      return;
    }
    setTrash([]);
    await emptyTrash();
  }

  function formatDate(s) {
    return new Date(s).toLocaleDateString(undefined, {
      month: "short", day: "numeric", year: "numeric",
    });
  }

  if (loading) return <div className="page"><div className="loading-inline">Loading...</div></div>;
  if (error)   return <div className="page"><div className="form-error">Error: {error}</div></div>;

  return (
    <div className="page">
      <div className="page-header-row">
        <h1 className="page-title">Trash</h1>
        {trash.length > 0 && (
          <button
            className="reminder-btn dismiss"
            style={{ padding: "8px 14px" }}
            onClick={handleEmptyTrash}
          >
            Empty trash
          </button>
        )}
      </div>
      <p className="page-subtitle" style={{ marginBottom: 24 }}>
        Deleted entries land here. Restore them to bring them back, or delete forever.
      </p>

      {trash.length === 0 ? (
        <EmptyState
          icon="🗑️"
          title="Trash is empty"
          message="Deleted entries will appear here. You can restore them or delete them permanently."
        />
      ) : (
        <div className="panel">
          {trash.map((t) => (
            <div key={t.id} className="trash-row">
              <span className="trash-icon" style={{ background: `${t.color}30` }}>
                {t.type === "reminder" ? "⏰"
                  : t.type === "todo"  ? "✅"
                  : t.type === "note"  ? "📝"
                  : "🤝"}
              </span>
              <div className="trash-body">
                <div className="trash-title">{t.title}</div>
                <div className="trash-meta">
                  <span className={`badge badge-${t.type}`}>{t.type}</span>
                  <span>Deleted {formatDate(t.deleted_at)}</span>
                </div>
              </div>
              <div className="trash-actions">
                <button className="reminder-btn snooze" onClick={() => handleRestore(t.id)}>
                  Restore
                </button>
                <button
                  className="reminder-btn dismiss"
                  onClick={() => handlePermanentDelete(t.id)}
                >
                  Delete forever
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
