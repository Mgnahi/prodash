// ============================================================
// DashboardPage.jsx — now with soft delete + sidebar refresh
// ------------------------------------------------------------
// Toggling a task now also calls bumpCounts() so the sidebar
// badge updates.
// ============================================================

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { toggleCompleted, todayString } from "../lib/entries";
import EmptyState from "./EmptyState";

export default function DashboardPage({ openModal, bumpCounts }) {
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [todays, setTodays]     = useState([]);
  const [overdue, setOverdue]   = useState([]);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      setUserName(user?.user_metadata?.full_name?.split(" ")[0] || "there");

      const today = todayString();

      const [todaysRes, overdueRes] = await Promise.all([
        supabase.from("entries").select("*")
          .is("deleted_at", null)
          .eq("date", today)
          .order("time", { ascending: true, nullsFirst: false }),
        supabase.from("entries").select("*")
          .is("deleted_at", null)
          .lt("date", today)
          .eq("completed", false)
          .eq("type", "todo")
          .order("date", { ascending: false }),
      ]);

      if (todaysRes.error || overdueRes.error) {
        setError(todaysRes.error?.message || overdueRes.error?.message);
      } else {
        setTodays(todaysRes.data || []);
        setOverdue(overdueRes.data || []);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleToggle(item) {
    // Optimistic update
    setTodays((prev) =>
      prev.map((t) => (t.id === item.id ? { ...t, completed: !t.completed } : t))
    );
    await toggleCompleted(item.id, item.completed);
    bumpCounts?.();  // refresh sidebar badges
  }

  if (loading) return <div className="page"><div className="loading-inline">Loading...</div></div>;
  if (error)   return <div className="page"><div className="form-error">Error: {error}</div></div>;

  const todoCount     = todays.filter((t) => t.type === "todo").length;
  const meetingCount  = todays.filter((t) => t.type === "meeting").length;
  const reminderCount = todays.filter((t) => t.type === "reminder").length;
  const overdueCount  = overdue.length;

  const stats = [
    { label: "Todos today", value: todoCount,     color: "#10B981" },
    { label: "Meetings",    value: meetingCount,  color: "#06B6D4" },
    { label: "Reminders",   value: reminderCount, color: "#F59E0B" },
    { label: "Overdue",     value: overdueCount,  color: "#EF4444" },
  ];

  const tasks    = todays.filter((t) => t.type !== "meeting");
  const meetings = todays.filter((t) => t.type === "meeting");

  const dateLine = new Date().toLocaleDateString(undefined, {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">
          Good morning, {userName} <span style={{ fontWeight: 400 }}>👋</span>
        </h1>
        <p className="page-subtitle">
          {dateLine}
          {meetingCount > 0 && ` — You have ${meetingCount} meeting${meetingCount === 1 ? "" : "s"} today`}
        </p>
      </div>

      <div className="stat-row">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value" style={{ color: stat.value > 0 ? stat.color : "#52525b" }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {todays.length === 0 && overdue.length === 0 ? (
        <EmptyState
          icon="✨"
          title="Your day is clear"
          message="Add a todo, meeting, note, or reminder to get started."
          actionLabel="+ Create your first entry"
          onAction={() => openModal({ type: "todo" })}
        />
      ) : (
        <div className="two-col">
          <div className="panel">
            <div className="panel-title">TODAY'S TASKS</div>
            {tasks.length === 0 ? (
              <div className="panel-empty">No tasks for today.</div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className={`task-row ${task.completed ? "done" : ""}`}
                >
                  <span
                    className="task-check"
                    onClick={() => handleToggle(task)}
                    style={{ cursor: "pointer" }}
                  >
                    {task.completed ? "✓" : ""}
                  </span>
                  <span
                    className="task-title"
                    onClick={() => openModal({ editEntry: task })}
                    style={{ cursor: "pointer" }}
                  >
                    {task.title}
                  </span>
                  <span className={`badge badge-${task.type}`}>{task.type}</span>
                </div>
              ))
            )}
          </div>

          <div className="panel">
            <div className="panel-title">UPCOMING MEETINGS</div>
            {meetings.length === 0 ? (
              <div className="panel-empty">No meetings scheduled.</div>
            ) : (
              meetings.map((m) => (
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
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
