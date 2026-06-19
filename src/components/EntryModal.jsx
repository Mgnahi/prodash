// ============================================================
// EntryModal.jsx
// ------------------------------------------------------------
// On save, we now do TWO things (in addition to inserting/
// updating the entry in Supabase):
//
//   1. Send an immediate "you saved this" confirmation email
//      via POST /api/send-email. This gives the user instant
//      feedback that the notification pipeline is working.
//
//   2. Schedule the 3 reminder emails (day-before, on-day,
//      10-min-before) via scheduleEntryReminders(), which
//      inserts rows into the scheduled_emails table. The
//      Vercel cron at /api/cron-send-emails fires them later.
//
// When the user toggles "Send email" OFF, we cancel any
// existing scheduled_emails rows for the entry so they
// don't get surprise reminders.
// ============================================================

import { useState, useEffect } from "react";
import { createEntry, updateEntry, todayString } from "../lib/entries";
import { scheduleEntryReminders } from "../lib/scheduledEmails";
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
  const [infoMessage, setInfoMessage]   = useState("");

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
    setInfoMessage("");
  }, [isOpen, defaults.editEntry, defaults.type, defaults.date]);

  if (!isOpen) return null;

  async function handleSave() {
    setErrorMessage("");
    setInfoMessage("");

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

    if (result.error) {
      setSaving(false);
      setErrorMessage(result.error.message);
      return;
    }

    const savedEntry = result.data;

    // ============================================================
    // Notification side-effects (all fire-and-forget)
    // ============================================================
    // We do these AFTER the entry is confirmed saved in Supabase
    // and BEFORE we close the modal, so:
    //   - If the entry save failed, no stray emails get sent.
    //   - If email side-effects fail, the entry is still saved.
    //
    // Two side-effects, both gated on the "Send email" toggle:
    //
    //   A. Immediate confirmation email — fires NOW via
    //      /api/send-email. Gives the user instant feedback.
    //
    //   B. Scheduled reminders — inserts rows into
    //      scheduled_emails for day-before / on-day /
    //      10-min-before. The cron picks them up later.
    //
    // If the toggle is OFF, we cancel any existing scheduled
    // emails so the user doesn't get surprise reminders later.
    // ============================================================
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email;

      if (sendEmail && userEmail) {
        // A. Immediate confirmation email
        //    Don't await — we don't want a slow Resend response
        //    to delay the modal close. Failures are silently
        //    logged and (for visibility) shown via console.
        const subject = `Saved: ${savedEntry.title}`;
        fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: userEmail,
            subject,
            title: savedEntry.title,
            description: savedEntry.description,
            type: savedEntry.type,
            date: savedEntry.date,
            time: savedEntry.time,
          }),
        })
          .then(async (response) => {
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
              console.warn("Save-confirmation email failed:", result.error);
            } else {
              // Log the success to email_log so it shows up on
              // the email log page alongside scheduled sends.
              await supabase.from("email_log").insert({
                user_id: userId,
                entry_id: savedEntry.id,
                status: "sent",
                subject,
              });
            }
          })
          .catch((err) => {
            console.warn("Save-confirmation email error:", err);
            // Still log the failure
            supabase.from("email_log").insert({
              user_id: userId,
              entry_id: savedEntry.id,
              status: "failed",
              subject,
            });
          });

        // B. Scheduled reminders
        const { scheduled } = await scheduleEntryReminders(savedEntry, userEmail);
        console.log(`Scheduled ${scheduled} reminder email(s) for entry ${savedEntry.id}`);

        if (scheduled > 0 && !editing) {
          setInfoMessage(
            `Saved! Confirmation email sent + ${scheduled} reminder${scheduled === 1 ? "" : "s"} scheduled.`
          );
        }
      } else if (!sendEmail) {
        // User toggled email OFF — cancel any existing scheduled emails
        await supabase
          .from("scheduled_emails")
          .delete()
          .eq("entry_id", savedEntry.id);
        console.log("Cancelled scheduled reminders (email toggle off)");
      } else if (!userEmail) {
        console.warn("No user email on file — cannot send or schedule emails.");
      }
    } catch (err) {
      console.warn("Notification side-effects failed:", err);
      // Don't block the modal close — the entry is already saved.
    }

    setSaving(false);

    // Brief pause so the user can read the info message,
    // then close and refresh. If there's no info message,
    // close immediately to match the existing fast-UX.
    if (infoMessage) {
      setTimeout(() => onSaved?.(), 1200);
    } else {
      onSaved?.();
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

        <div style={{
          fontSize: 12,
          color: "#71717a",
          marginTop: -8,
          marginBottom: 12,
          paddingLeft: 4,
          lineHeight: 1.4,
        }}>
          You'll get a confirmation email immediately, plus reminders the day
          before (9 AM), on the day, and 10 minutes before the time above.
        </div>

        {errorMessage && (
          <div className="form-error" style={{ marginBottom: 12 }}>{errorMessage}</div>
        )}

        {infoMessage && (
          <div style={{
            background: "rgba(16, 185, 129, 0.1)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            color: "#6EE7B7",
            fontSize: 13,
            padding: "10px 12px",
            borderRadius: 8,
            marginBottom: 12,
          }}>
            {infoMessage}
          </div>
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
