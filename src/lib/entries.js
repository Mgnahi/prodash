import { supabase } from "./supabase";

export function todayString() {
  return new Date().toISOString().split("T")[0];
}

// --- Fetch non-trashed entries ---
export async function fetchEntries({ type } = {}) {
  let query = supabase
    .from("entries")
    .select("*")
    .is("deleted_at", null)   // exclude trashed
    .order("date", { ascending: true })
    .order("time", { ascending: true, nullsFirst: false });

  if (Array.isArray(type)) query = query.in("type", type);
  else if (type) query = query.eq("type", type);

  return await query;
}

// --- Fetch entries in a date range (calendar view) ---
export async function fetchEntriesInRange({ dateFrom, dateTo, type } = {}) {
  let query = supabase
    .from("entries")
    .select("*")
    .is("deleted_at", null)
    .gte("date", dateFrom)
    .lte("date", dateTo)
    .order("date", { ascending: true })
    .order("time", { ascending: true, nullsFirst: false });

  if (type) query = query.eq("type", type);
  return await query;
}

// --- Create a new entry ---
export async function createEntry({ userId, ...fields }) {
  return await supabase
    .from("entries")
    .insert({ user_id: userId, ...fields })
    .select()
    .single();
}

// --- Update an existing entry ---
export async function updateEntry(id, updates) {
  return await supabase
    .from("entries")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
}

export async function toggleCompleted(id, currentValue) {
  return await updateEntry(id, { completed: !currentValue });
}

// ============================================================
// softDeleteEntry — now ALSO cancels scheduled reminders
// ------------------------------------------------------------
// When the user trashes an entry, we MUST cancel any pending
// reminder emails that were scheduled for it, otherwise the
// cron will fire them days later and email the user about
// something they already deleted.
//
// (For permanentDelete, the foreign key ON DELETE CASCADE
//  we set up in the SQL migration handles this automatically.)
// ============================================================
export async function softDeleteEntry(id) {
  // 1. Cancel any pending reminder emails for this entry.
  //    Done first so we don't send a reminder for an entry
  //    that disappears mid-cron.
  await supabase
    .from("scheduled_emails")
    .delete()
    .eq("entry_id", id);

  // 2. Soft-delete the entry itself
  return await supabase
    .from("entries")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
}

// --- Restore from trash ---
// No change needed — restoring just un-sets deleted_at. The
// scheduleEntryReminders() call inside EntryModal handles
// re-scheduling when the user re-edits the entry. (If you
// want auto-rescheduling on restore, that's a separate
// feature; for now, restore + open + save to reschedule.)
export async function restoreEntry(id) {
  return await supabase
    .from("entries")
    .update({ deleted_at: null })
    .eq("id", id);
}

// --- HARD delete: permanently remove the row ---
// The scheduled_emails table has ON DELETE CASCADE on its
// entry_id foreign key, so the scheduled rows go with the
// entry automatically. No manual cleanup needed here.
export async function permanentlyDeleteEntry(id) {
  return await supabase.from("entries").delete().eq("id", id);
}

// --- Fetch trashed items ---
export async function fetchTrash() {
  return await supabase
    .from("entries")
    .select("*")
    .not("deleted_at", "is", null)   // only trashed
    .order("deleted_at", { ascending: false });
}

// --- Empty the trash (permanent delete of all trashed) ---
// CASCADE handles each entry's scheduled_emails rows for us.
export async function emptyTrash() {
  return await supabase
    .from("entries")
    .delete()
    .not("deleted_at", "is", null);
}

// --- Email log ---
export async function fetchEmailLog() {
  return await supabase
    .from("email_log")
    .select("*, entries(title, type)")
    .order("sent_at", { ascending: false })
    .limit(50);
}
