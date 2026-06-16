
import { useState, useEffect } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
  Outlet,
} from "react-router-dom";
import { supabase } from "./lib/supabase";

// Auth pages
import LoginForm from "./components/LoginForm";
import SignupForm from "./components/SignupForm";

// Layout pieces
import TopNav from "./components/TopNav";
import Sidebar from "./components/Sidebar";

// Dashboard pages
import DashboardPage from "./components/DashboardPage";
import CalendarPage from "./components/CalendarPage";
import TodosPage from "./components/TodosPage";
import MeetingsPage from "./components/MeetingsPage";
import NotesPage from "./components/NotesPage";
import RemindersPage from "./components/RemindersPage";
import EmailLogPage from "./components/EmailLogPage";
import SettingsPage from "./components/SettingsPage";
import CategoriesPage from "./components/CategoriesPage";
import TrashPage from "./components/TrashPage";

import EntryModal from "./components/EntryModal";

import "./App.css";

export default function App() {
  const [session, setSession]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDefaults, setModalDefaults] = useState({});
  const [pageKey, setPageKey]     = useState(0);
  const [sidebarKey, setSidebarKey] = useState(0);

  const navigate = useNavigate();

  // --- Session management (same as before) ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        // After sign-in, go to dashboard. After sign-out, go to login.
        if (newSession) navigate("/dashboard");
        else navigate("/login");
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // --- Modal + refresh helpers ---
  function openModal(defaults = {}) {
    setModalDefaults(defaults);
    setIsModalOpen(true);
  }

  function bumpCounts() {
    setSidebarKey((n) => n + 1);
  }

  function handleModalSaved() {
    setPageKey((n) => n + 1);
    setSidebarKey((n) => n + 1);
    setIsModalOpen(false);
  }

  // Common props every dashboard page receives
  const pageProps = { key: pageKey, openModal, bumpCounts };

  // --- Loading ---
  if (loading) {
    return <div className="loading-screen"><div className="loading-spinner"></div></div>;
  }

  return (
    <>
      <Routes>
        {/* ====== AUTH ROUTES (no shell) ====== */}
        <Route
          path="/login"
          element={
            session
              ? <Navigate to="/dashboard" replace />
              : <LoginForm onSwitchToSignup={() => navigate("/signup")} />
          }
        />
        <Route
          path="/signup"
          element={
            session
              ? <Navigate to="/dashboard" replace />
              : <SignupForm onSwitchToLogin={() => navigate("/login")} />
          }
        />

        {/* ====== DASHBOARD ROUTES (wrapped in shell) ====== */}
        {/* This is a LAYOUT ROUTE. Its element renders the shell
            (TopNav + Sidebar) and an <Outlet /> where children render. */}
        <Route
          element={
            session
              ? <DashboardShell
                  user={session.user}
                  sidebarKey={sidebarKey}
                  navigate={navigate}
                />
              : <Navigate to="/login" replace />
          }
        >
          <Route path="/dashboard" element={<DashboardPage {...pageProps} />} />
          <Route path="/calendar"  element={<CalendarPage {...pageProps} />} />
          <Route path="/todos"     element={<TodosPage {...pageProps} />} />
          <Route path="/meetings"  element={<MeetingsPage {...pageProps} />} />
          <Route path="/notes"     element={<NotesPage {...pageProps} />} />
          <Route path="/reminders" element={<RemindersPage {...pageProps} />} />
          <Route path="/email-log" element={<EmailLogPage key={pageKey} />} />
          <Route path="/settings"  element={<SettingsPage user={session?.user} />} />
          <Route path="/categories" element={<CategoriesPage {...pageProps} />} />
          <Route path="/trash"     element={<TrashPage {...pageProps} />} />
        </Route>

        {/* ====== CATCH-ALL: redirect to dashboard or login ====== */}
        <Route
          path="*"
          element={<Navigate to={session ? "/dashboard" : "/login"} replace />}
        />
      </Routes>

      {/* Modal sits outside Routes so it overlays everything */}
      {session && (
        <EntryModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          userId={session.user.id}
          defaults={modalDefaults}
          onSaved={handleModalSaved}
        />
      )}
    </>
  );
}

// ============================================================
// DashboardShell — the layout route component
// ------------------------------------------------------------
// Renders TopNav + Sidebar + <Outlet />.
//
// <Outlet /> is a react-router concept: it's the placeholder
// where the matched child route renders. So when the URL is
// "/todos", <Outlet /> renders <TodosPage />.
//
// This replaces our old DashboardLayout component. The difference
// is that DashboardLayout needed children passed explicitly,
// while <Outlet /> is filled automatically by the router.
// ============================================================
function DashboardShell({ user, sidebarKey, navigate }) {
  const location = useLocation();

  // Convert the pathname to a sidebar id.
  // "/todos" -> "todos", "/email-log" -> "email-log"
  const currentView = location.pathname.replace("/", "") || "dashboard";

  return (
    <div className="dashboard-shell">
      <TopNav user={user} />

      <div className="dashboard-body">
        <Sidebar
          currentView={currentView}
          onNavigate={(id) => navigate("/" + id)}
          refreshKey={sidebarKey}
        />
        <main className="dashboard-main">
          {/* Outlet renders whichever child <Route> matched */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
