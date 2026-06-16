// ============================================================
// EntryModal.jsx — now sends emails via /api/send-email
// ------------------------------------------------------------
// After saving an entry to Supabase, if sendEmail is on, we:
//   1. POST to /api/send-email (Vercel serverless function)
//   2. Log the result to the email_log table in Supabase
//
// The email send is "fire and forget" — we don't block the
// modal close on it. If it fails, the user sees a console
// warning but the entry is already saved.
// ============================================================

import { useState, useEffect } from "react";
import { createEntry, updateEntry, todayString } from "../lib/entries";
import { supabase } from "../lib/supabase";

const ENTRY_TYPES = [
  { id: "reminder", label: "Reminder", icon: "⏰" },
  { id: "todo",     label: "Todo",     icon: "✅" },
  { id: "note",     label: "Note",     icon: "📝" },
  { id: "meeting",  label: "Meeting",  icon: "🤝" },
];

const COLORS = ["#7C3AED", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#EC4899"];

export default function EntryModal({ isOpen, onClose, userId, defaults = {}, onSaved }) {
  const editing = !!defaults.editEntry;

  const [type, setType]               = useState("reminder");
  const [title, setTitle]             = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate]               = useState(todayString());
  const [time, setTime]               = useState("10:00");
  const [color, setColor]             = useState(COLORS[0]);
  const [sendEmail, setSendEmail]     = useState(true);
  const [saving, setSaving]           = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    if (defaults.editEntry) {
      const e = defaults.editEntry;
      setType(e.type);
      setTitle(e.title);
      setDescription(e.description || "");
      setDate(e.date);
      setTime(e.time ? e.time.slice(0, 5) : "10:00");
      setColor(e.color);
      setSendEmail(e.send_email);
    } else {
      setType(defaults.type || "reminder");
      setTitle("");
      setDescription("");
      setDate(defaults.date || todayString());
      setTime("10:00");
      setColor(COLORS[0]);
      setSendEmail(true);
    }
    setErrorMessage("");
  }, [isOpen, defaults.editEntry, defaults.type, defaults.date]);

  if (!isOpen) return null;

  async function handleSave() {
    setErrorMessage("");
    if (!title.trim()) {
      setErrorMessage("Please enter a title.");
      return;
    }

    setSaving(true);

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      type,
      date,
      time: time || null,
      color,
      send_email: sendEmail,
    };

    const result = editing
      ? await updateEntry(defaults.editEntry.id, payload)
      : await createEntry({ userId, ...payload, completed: false });

    setSaving(false);

    if (result.error) {
      setErrorMessage(result.error.message);
      return;
    }

    // --- Send email if toggled on (only for new entries) ---
    // We do this AFTER closing the modal so the UI feels fast.
    // The email send happens in the background.
    if (sendEmail && !editing) {
      sendEmailInBackground(result.data, userId);
    }

    onSaved?.();
  }

  // Fire-and-forget email send + logging
  async function sendEmailInBackground(entry, userId) {
    try {
      // Get the user's email from Supabase auth
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email;
      if (!userEmail) return;

      const subject = `${type.charAt(0).toUpperCase() + type.slice(1)}: ${entry.title}`;

      // Call the serverless function
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: userEmail,
          subject,
          title: entry.title,
          description: entry.description,
          type: entry.type,
          date: entry.date,
          time: entry.time,
          entryId: entry.id,
          userId,
        }),
      });

      const result = await response.json();

      // Log to email_log table regardless of success/failure
      await supabase.from("email_log").insert({
        user_id: userId,
        entry_id: entry.id,
        status: result.status === "sent" ? "sent" : "failed",
        subject,
      });

      if (!response.ok) {
        console.warn("Email send failed:", result.error);
      }
    } catch (err) {
      console.warn("Email send error:", err);

      // Still log the failure
      await supabase.from("email_log").insert({
        user_id: userId,
        entry_id: entry?.id,
        status: "failed",
        subject: `${type}: ${title}`,
      });
    }
  }

  const headerDate = new Date(date + "T00:00:00").toLocaleDateString(
    undefined, { month: "short", day: "numeric" }
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>

        <div className="modal-header">
          <h2 className="modal-title">
            {editing ? `Edit entry — ${headerDate}` : `New entry — ${headerDate}`}
          </h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="entry-type-tabs">
          {ENTRY_TYPES.map((t) => (
            <button
              key={t.id}
              className={`entry-type-tab ${type === t.id ? "active" : ""}`}
              onClick={() => setType(t.id)}
            >
              <span className="entry-type-icon">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <label className="modal-field">
          <span className="modal-label">Title</span>
          <input
            className="text-field-input"
            type="text"
            placeholder="What is this about?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </label>

        <label className="modal-field">
          <span className="modal-label">Description</span>
          <textarea
            className="text-field-input modal-textarea"
            placeholder="Optional details..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </label>

        <div className="modal-field-row">
          <label className="modal-field" style={{ flex: 1 }}>
            <span className="modal-label">Date</span>
            <input className="text-field-input" type="date" value={date}
              onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="modal-field" style={{ flex: 1 }}>
            <span className="modal-label">Time</span>
            <input className="text-field-input" type="time" value={time}
              onChange={(e) => setTime(e.target.value)} />
          </label>
        </div>

        <div className="modal-field">
          <span className="modal-label">Color tag</span>
          <div className="color-picker">
            {COLORS.map((c) => (
              <button
                key={c}
                className={`color-swatch ${color === c ? "selected" : ""}`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        <div className="modal-field toggle-row">
          <span className="toggle-label">
            <span>📧</span>
            Send email notification
          </span>
          <label className="switch">
            <input type="checkbox" checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)} />
            <span className="switch-slider"></span>
          </label>
        </div>

        {errorMessage && (
          <div className="form-error" style={{ marginBottom: 12 }}>{errorMessage}</div>
        )}

        <div className="modal-footer">
          <button className="btn-secondary modal-cancel" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn-primary modal-save" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : (editing ? "Save changes" : "Save entry")}
          </button>
        </div>
      </div>
    </div>
  );
}
