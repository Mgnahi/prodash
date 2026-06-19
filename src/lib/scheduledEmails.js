// ============================================================
// scheduledEmails.js
// ------------------------------------------------------------
// Handles the "send me a reminder" feature.
//
// On entry save: delete any old scheduled_emails for this entry,
// then insert fresh ones based on the entry's date/time.
//
// The 3 reminder times we always generate:
//   1. day_before      — 9:00 AM the day before the entry
//   2. on_day          — at the entry's time (or 9 AM if none)
//   3. ten_min_before  — 10 min before the entry's time (only if it has a time)
//
// Any reminder time that is already in the past is skipped
// (so if you create a todo for "right now", you don't get a
//  "10 minutes ago" email).
// ============================================================

import { supabase } from "./supabase";

const TYPE_LABEL = {
  reminder: "Reminder",
  todo: "Todo",
  note: "Note",
  meeting: "Meeting",
};

/**
 * Compute the 3 possible send times for an entry.
 * Returns an array of { kind, send_at, subject } — may be empty
 * if all 3 times are already in the past.
 */
export function computeReminderTimes({ type, title, date, time }) {
  const reminders = [];
  const now = new Date();

  // The entry's date is "YYYY-MM-DD", time is "HH:MM" or null.
  const [y, m, d] = date.split("-").map(Number);
  const hasTime = !!time;
  const [hh, mm] = hasTime ? time.split(":").map(Number) : [9, 0];

  // Build real Date objects in the user's local timezone.
  // (new Date(y, m-1, d, hh, mm) uses the browser's timezone.)
  const eventTime    = new Date(y, m - 1, d, hh, mm, 0);
  const dayBefore    = new Date(y, m - 1, d - 1, 9, 0, 0);
  const tenMinBefore = hasTime
    ? new Date(eventTime.getTime() - 10 * 60 * 1000)
    : null;

  const label = TYPE_LABEL[type] || "Entry";
  const safeTitle = (title || "").trim() || "(untitled)";

  const addIfFuture = (kind, sendAt, subject) => {
    if (sendAt && sendAt > now) {
      reminders.push({
        kind,
        send_at: sendAt.toISOString(),
        subject,
      });
    }
  };

  addIfFuture(
    "day_before",
    dayBefore,
    `📅 Reminder: "${safeTitle}" is tomorrow`
  );

  addIfFuture(
    "on_day",
    eventTime,
    `🔔 ${label} today: "${safeTitle}"`
  );

  if (tenMinBefore) {
    addIfFuture(
      "ten_min_before",
      tenMinBefore,
      `⏰ ${label} in 10 minutes: "${safeTitle}"`
    );
  }

  return reminders;
}

/**
 * Schedule the 3 reminder emails for a freshly-saved entry.
 * Replaces any previously-scheduled emails for that entry
 * (so editing an entry updates its reminders).
 */
export async function scheduleEntryReminders(entry, userEmail) {
  if (!entry?.date) return { scheduled: 0 };

  // 1. Wipe any old scheduled emails for this entry
  //    (we don't want to send stale reminders if the user
  //    reschedules the entry for a different day).
  await supabase
    .from("scheduled_emails")
    .delete()
    .eq("entry_id", entry.id);

  // 2. Compute the new send times
  const reminderTimes = computeReminderTimes({
    type: entry.type,
    title: entry.title,
    date: entry.date,
    time: entry.time,
  });

  if (reminderTimes.length === 0) {
    return { scheduled: 0 };
  }

  // 3. Insert one row per reminder
  const rows = reminderTimes.map((r) => ({
    entry_id: entry.id,
    user_id: entry.user_id,
    to_email: userEmail,
    subject: r.subject,
    title: entry.title,
    description: entry.description,
    type: entry.type,
    date: entry.date,
    time: entry.time,
    kind: r.kind,
    send_at: r.send_at,
    status: "pending",
  }));

  const { error } = await supabase
    .from("scheduled_emails")
    .insert(rows);

  if (error) {
    console.warn("Failed to schedule reminders:", error.message);
    return { scheduled: 0, error: error.message };
  }

  return { scheduled: rows.length };
}

/**
 * Cancel any pending reminders for an entry.
 * Call this when the entry is being deleted/trashed.
 */
export async function cancelEntryReminders(entryId) {
  return await supabase
    .from("scheduled_emails")
    .delete()
    .eq("entry_id", entryId);
}
