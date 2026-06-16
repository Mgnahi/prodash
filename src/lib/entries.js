
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

// --- SOFT delete: move to trash ---
// Sets deleted_at to now. The entry still exists in the database
// but is hidden from all normal lists.
export async function softDeleteEntry(id) {
  return await supabase
    .from("entries")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
}

// --- Restore from trash ---
export async function restoreEntry(id) {
  return await supabase
    .from("entries")
    .update({ deleted_at: null })
    .eq("id", id);
}

// --- HARD delete: permanently remove the row ---
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