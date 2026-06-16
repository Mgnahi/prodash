// ============================================================
// CategoriesPage.jsx
// ------------------------------------------------------------
// Groups all your entries by their color tag. Click a category
// to see/manage everything in it.
//
// We treat each unique color as a category, with a built-in
// label. This matches the project plan ("color-coded category")
// without needing a separate categories table.
// ============================================================

import { useState, useEffect } from "react";
import { fetchEntries, softDeleteEntry } from "../lib/entries";
import EmptyState from "./EmptyState";

// Map each color to a friendly name
const COLOR_NAMES = {
  "#7C3AED": "Purple",
  "#10B981": "Green",
  "#F59E0B": "Amber",
  "#EF4444": "Red",
  "#06B6D4": "Cyan",
  "#EC4899": "Pink",
};

export default function CategoriesPage({ openModal, bumpCounts }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // Which color is currently expanded. null = show overview, not detail.
  const [selectedColor, setSelectedColor] = useState(null);

  useEffect(() => {
    async function load() {
      const { data, error } = await fetchEntries();
      if (error) setError(error.message);
      else setEntries(data || []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleDelete(id) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    await softDeleteEntry(id);
    bumpCounts?.();
  }

  if (loading) return <div className="page"><div className="loading-inline">Loading...</div></div>;
  if (error)   return <div className="page"><div className="form-error">Error: {error}</div></div>;

  // --- Group entries by color ---
  // grouped = { "#7C3AED": [entry, entry, ...], "#10B981": [...], ... }
  const grouped = entries.reduce((acc, entry) => {
    if (!acc[entry.color]) acc[entry.color] = [];
    acc[entry.color].push(entry);
    return acc;
  }, {});
  const colorKeys = Object.keys(grouped);

  // If a color is selected, show detail view for that color.
  if (selectedColor) {
    const items = grouped[selectedColor] || [];
    return (
      <div className="page">
        <div className="page-header-row">
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                width: 24, height: 24, borderRadius: 6,
                background: selectedColor, display: "inline-block"
              }}
            />
            {COLOR_NAMES[selectedColor] || "Category"}
          </h1>
          <button
            className="btn-secondary"
            style={{ width: "auto", padding: "8px 14px" }}
            onClick={() => setSelectedColor(null)}
          >
            ← Back to categories
          </button>
        </div>

        <div className="panel">
          {items.map((e) => (
            <div
              key={e.id}
              className="task-row"
              onClick={() => openModal({ editEntry: e })}
              style={{ cursor: "pointer" }}
            >
              <span className="task-check" style={{ borderColor: e.color }}>
                {e.completed ? "✓" : ""}
              </span>
              <div className="task-title">
                <div>{e.title}</div>
                {e.description && (
                  <div style={{ fontSize: 12, color: "#a1a1aa", marginTop: 2 }}>
                    {e.description}
                  </div>
                )}
              </div>
              <span className={`badge badge-${e.type}`}>{e.type}</span>
              <span style={{ fontSize: 12, color: "#a1a1aa" }}>
                {new Date(e.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
              <button
                className="reminder-btn dismiss"
                onClick={(e2) => { e2.stopPropagation(); handleDelete(e.id); }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- Overview: grid of category cards ---
  return (
    <div className="page">
      <div className="page-header-row">
        <h1 className="page-title">Categories</h1>
      </div>
      <p className="page-subtitle" style={{ marginBottom: 24 }}>
        Your entries grouped by color tag. Click a category to see what's inside.
      </p>

      {entries.length === 0 ? (
        <EmptyState
          icon="🏷️"
          title="No categories yet"
          message="Create entries with different color tags to organize them into categories."
          actionLabel="+ Create your first entry"
          onAction={() => openModal({})}
        />
      ) : (
        <div className="categories-grid">
          {colorKeys.map((color) => {
            const items = grouped[color];
            return (
              <button
                key={color}
                className="category-card"
                onClick={() => setSelectedColor(color)}
                style={{ borderLeft: `4px solid ${color}` }}
              >
                <div className="category-card-header">
                  <div className="category-color-dot" style={{ background: color }}></div>
                  <div className="category-name">{COLOR_NAMES[color] || "Custom"}</div>
                </div>
                <div className="category-count">
                  {items.length} {items.length === 1 ? "entry" : "entries"}
                </div>
                <div className="category-preview">
                  {items.slice(0, 3).map((e) => (
                    <div key={e.id} className="category-preview-item">
                      <span className={`badge badge-${e.type}`} style={{ marginRight: 6 }}>
                        {e.type}
                      </span>
                      {e.title}
                    </div>
                  ))}
                  {items.length > 3 && (
                    <div className="category-preview-more">
                      +{items.length - 3} more
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
