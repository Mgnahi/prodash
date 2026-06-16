

import { supabase } from "./supabase";

// --- Sign up a new user ---
// Email + password are required. We also pass `full_name` into
// user_metadata so Supabase saves it on the auth.users row.
// We can read it back later via session.user.user_metadata.full_name.
export async function signUp({ email, password, fullName }) {
  return await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });
}

// --- Sign in an existing user ---
export async function signIn({ email, password }) {
  return await supabase.auth.signInWithPassword({ email, password });
}

// --- Sign out ---
// After this resolves, the auth listener in App.jsx will fire,
// the session becomes null, and the app shows the login screen.
export async function signOut() {
  return await supabase.auth.signOut();
}

// --- Get a display name from a session ---
// Returns the full name if set, else the email, else "User".
// Pure utility, no Supabase call — saves duplicate logic.
export function getDisplayName(user) {
  if (!user) return "User";
  return user.user_metadata?.full_name || user.email || "User";
}

// --- Get initials for the avatar ---
// "Alex Johnson" -> "AJ", "alex@example.com" -> "A"
export function getInitials(user) {
  const name = getDisplayName(user);
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name[0]?.toUpperCase() || "U";
}