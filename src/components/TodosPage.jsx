
import { useState, useEffect } from "react";
import { fetchEntries, toggleCompleted, softDeleteEntry, todayString } from "../lib/entries";
import EmptyState from "./EmptyState";

export default function TodosPage({ openModal, bumpCounts }) {
  const [todos, setTodos]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [filter, setFilter]   = useState("all");

  useEffect(() => {
    async function load() {
      const { data, error } = await fetchEntries({ type: "todo" });
      if (error) setError(error.message);
      else setTodos(data || []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleToggle(todo) {
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, completed: !t.completed } : t))
    );
    await toggleCompleted(todo.id, todo.completed);
    bumpCounts?.();
  }

  // SOFT delete — moves to trash, can be restored.
  async function handleDelete(id) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    await softDeleteEntry(id);
    bumpCounts?.();
  }

  const visible = todos.filter((t) => {
    if (filter === "active")    return !t.completed;
    if (filter === "completed") return t.completed;
    return true;
  });

  const today = todayString();

  if (loading) return <div className="page"><div className="loading-inline">Loading...</div></div>;
  if (error)   return <div className="page"><div className="form-error">Error: {error}</div></div>;

  return (
    <div className="page">
      <div className="page-header-row">
        <h1 className="page-title">Todos</h1>
        <button
          className="btn-primary"
          style={{ width: "auto", padding: "10px 16px" }}
          onClick={() => openModal({ type: "todo" })}
        >
          + New todo
        </button>
      </div>

      {todos.length > 0 && (
        <div className="filter-pills">
          {["all", "active", "completed"].map((f) => (
            <button
              key={f}
              className={`filter-pill ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
              style={{ textTransform: "capitalize" }}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {todos.length === 0 ? (
        <EmptyState
          icon="✅"
          title="No todos yet"
          message="Capture the things you need to do."
          actionLabel="+ Create your first todo"
          onAction={() => openModal({ type: "todo" })}
        />
      ) : (
        <div className="panel">
          {visible.map((t) => {
            const isOverdue = !t.completed && t.date < today;
            return (
              <div key={t.id} className={`task-row ${t.completed ? "done" : ""}`}>
                <span
                  className="task-check"
                  onClick={() => handleToggle(t)}
                  style={{ cursor: "pointer" }}
                >
                  {t.completed ? "✓" : ""}
                </span>
                <div
                  className="task-title"
                  onClick={() => openModal({ editEntry: t })}
                  style={{ cursor: "pointer" }}
                >
                  <div>{t.title}</div>
                  {t.description && (
                    <div style={{ fontSize: 12, color: "#a1a1aa", marginTop: 2 }}>
                      {t.description}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 12, color: isOverdue ? "#EF4444" : "#a1a1aa" }}>
                  {new Date(t.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
                <button className="reminder-btn dismiss" onClick={() => handleDelete(t.id)} style={{ marginLeft: 8 }}>
                  Delete
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
