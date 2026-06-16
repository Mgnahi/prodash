// ============================================================
// EmailLogPage.jsx — now reads from Supabase
// ------------------------------------------------------------
// The email_log table will be empty until we add Resend. For
// now this page shows the empty state, which is correct: you
// haven't sent any emails yet because we haven't built the
// sender.
// ============================================================

import { useState, useEffect } from "react";
import { fetchEmailLog } from "../lib/entries";
import EmptyState from "./EmptyState";

export default function EmailLogPage() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    async function load() {
      const { data, error } = await fetchEmailLog();
      if (error) setError(error.message);
      else setEmails(data || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="page"><div className="loading-inline">Loading email log...</div></div>;
  if (error)   return <div className="page"><div className="form-error">Error: {error}</div></div>;

  // Compute stats from the data
  const totalSent  = emails.length;
  const delivered  = emails.filter((e) => e.status === "sent").length;
  const failed     = emails.filter((e) => e.status === "failed").length;

  const stats = [
    { label: "Total sent this month", value: totalSent, color: "#10B981" },
    { label: "Delivered successfully", value: delivered, color: "#10B981" },
    { label: "Failed to deliver",      value: failed,    color: "#EF4444" },
  ];

  return (
    <div className="page">

      <div className="page-header-row">
        <h1 className="page-title">Email log</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-secondary" style={{ width: "auto", padding: "8px 14px" }}>
            Export CSV
          </button>
          <button className="btn-secondary" style={{ width: "auto", padding: "8px 14px" }}>
            All types ⌄
          </button>
        </div>
      </div>

      <div className="stat-row" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        {stats.map((s) => (
          <div key={s.label} className="stat-card stat-card-tall">
            <div className="stat-value" style={{ color: s.value > 0 ? s.color : "#52525b", fontSize: 32 }}>
              {s.value}
            </div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {emails.length === 0 ? (
        <EmptyState
          icon="📧"
          title="No emails sent yet"
          message="When entries with 'Send email' enabled are saved, they'll show up here. We'll wire up the email sender (Resend) in the next phase."
        />
      ) : (
        <>
          <div className="section-label">RECENT EMAILS</div>
          {emails.map((e) => (
            <div key={e.id} className="email-row">
              <span
                className="email-status-dot"
                style={{ background: e.status === "sent" ? "#10B981" : "#EF4444" }}
              ></span>
              <div className="email-icon">📧</div>
              <div className="email-body">
                <div className="email-subject">{e.subject || e.entries?.title || "(no subject)"}</div>
                <div className="email-meta">
                  {e.entries?.type && <span className={`badge badge-${e.entries.type}`}>{e.entries.type}</span>}
                  {e.status === "failed" && (
                    <span style={{ color: "#EF4444", marginLeft: 8 }}>· Delivery failed</span>
                  )}
                </div>
              </div>
              <span className="email-time">
                {new Date(e.sent_at).toLocaleString()}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
