// ============================================================
// DashboardLayout.jsx — now passes the user down to TopNav
// ------------------------------------------------------------
// Only change: accepts `user` as a prop and forwards it.
// ============================================================

import TopNav from "./TopNav";
import Sidebar from "./Sidebar";

export default function DashboardLayout({ currentView, onNavigate, user, children }) {
  return (
    <div className="dashboard-shell">
      <TopNav user={user} />

      <div className="dashboard-body">
        <Sidebar currentView={currentView} onNavigate={onNavigate} />
        <main className="dashboard-main">{children}</main>
      </div>
    </div>
  );
}
