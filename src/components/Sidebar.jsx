
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const MAIN_LINKS = [
  { id: "dashboard", label: "Dashboard", icon: "🏠" },
  { id: "calendar",  label: "Calendar",  icon: "📅" },
  { id: "todos",     label: "Todos",     icon: "✅" },
  { id: "meetings",  label: "Meetings",  icon: "🤝" },
  { id: "notes",     label: "Notes",     icon: "📝" },
  { id: "reminders", label: "Reminders", icon: "🔔" },
];

const SYSTEM_LINKS = [
  { id: "email-log",  label: "Email Log",  icon: "📧" },
  { id: "categories", label: "Categories", icon: "🏷️" },
  { id: "trash",      label: "Trash",      icon: "🗑️" },
];

export default function Sidebar({ currentView, onNavigate, refreshKey }) {
  const [counts, setCounts] = useState({ todos: 0, meetings: 0 });

  useEffect(() => {
    async function loadCounts() {
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("entries")
        .select("type, completed, date, deleted_at")
        .is("deleted_at", null);

      if (error || !data) return;

      setCounts({
        todos: data.filter((e) => e.type === "todo" && !e.completed).length,
        meetings: data.filter((e) => e.type === "meeting" && e.date >= today).length,
      });
    }
    loadCounts();
  }, [refreshKey, currentView]);

  function badgeFor(linkId) {
    const value = counts[linkId];
    return value && value > 0 ? value : null;
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-section-label">MAIN</div>
      {MAIN_LINKS.map((link) => (
        <SidebarLink
          key={link.id}
          link={link}
          badge={badgeFor(link.id)}
          isActive={currentView === link.id}
          onClick={() => onNavigate(link.id)}
        />
      ))}

      <div className="sidebar-section-label" style={{ marginTop: 24 }}>SYSTEM</div>
      {SYSTEM_LINKS.map((link) => (
        <SidebarLink
          key={link.id}
          link={link}
          badge={null}
          isActive={currentView === link.id}
          onClick={() => onNavigate(link.id)}
        />
      ))}

      <div style={{ marginTop: "auto" }}>
        <SidebarLink
          link={{ id: "settings", label: "Settings", icon: "⚙️" }}
          badge={null}
          isActive={currentView === "settings"}
          onClick={() => onNavigate("settings")}
        />
      </div>
    </aside>
  );
}

function SidebarLink({ link, badge, isActive, onClick }) {
  return (
    <button className={`sidebar-link ${isActive ? "active" : ""}`} onClick={onClick}>
      <span className="sidebar-link-icon">{link.icon}</span>
      <span className="sidebar-link-label">{link.label}</span>
      {badge && <span className="sidebar-link-badge">{badge}</span>}
    </button>
  );
}
