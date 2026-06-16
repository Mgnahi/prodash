// ============================================================
// LoginForm.jsx — now with REAL Supabase auth
// ------------------------------------------------------------
// Changes from the previous version:
//   - handleSignIn() actually calls Supabase instead of alert()
//   - Added `loading` state (button shows "Signing in..." while
//     the request is in flight, and is disabled to prevent
//     double-clicks)
//   - Added `errorMessage` state for failed logins
//
// After a successful signIn(), we DON'T need to do anything
// here. App.jsx is listening for auth changes and will
// automatically swap to the dashboard.
// ============================================================

import { useState } from "react";
import AuthLayout from "./AuthLayout";
import TextField from "./TextField";
import { signIn } from "../lib/auth";

export default function LoginForm({ onSwitchToSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // NEW: state for the async sign-in process.
  // `loading` lets us disable the button so the user can't
  // click it twice while waiting. `errorMessage` shows under
  // the form if Supabase rejects the credentials.
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // ASYNC FUNCTION:
  // The `async` keyword lets us use `await` inside. await pauses
  // the function until a Promise resolves, without blocking the
  // browser. signIn() returns a Promise that resolves with
  // { data, error } from Supabase.
  async function handleSignIn() {
    setErrorMessage("");

    if (!email || !password) {
      setErrorMessage("Please fill in both email and password.");
      return;
    }

    setLoading(true);
    const { error } = await signIn({ email, password });
    setLoading(false);

    if (error) {
      // Supabase returns nice human-readable messages like
      // "Invalid login credentials" — we just show them.
      setErrorMessage(error.message);
      return;
    }

    // SUCCESS: nothing to do here. App.jsx's onAuthStateChange
    // listener picked up the new session and is already
    // re-rendering the app to show the dashboard.
  }

  // Allow pressing Enter in the password field to submit.
  function handleKeyDown(e) {
    if (e.key === "Enter" && !loading) handleSignIn();
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your dashboard"
      footer={
        <>
          No account?{" "}
          <span className="link-purple" onClick={onSwitchToSignup}>
            Create one free
          </span>
        </>
      }
    >
      <TextField
        label="Email address"
        type="email"
        placeholder="alex@example.com"
        value={email}
        onChange={setEmail}
      />

      {/* For the password we need the keydown handler too —
          tricky because TextField doesn't forward it. Easiest
          fix: write a plain <input> for this one field. */}
      <label className="text-field">
        <span className="text-field-label">Password</span>
        <input
          className="text-field-input"
          type="password"
          placeholder="••••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </label>

      <div className="forgot-row">
        <span className="link-purple">Forgot password?</span>
      </div>

      {/* Error message (only shows if errorMessage is non-empty) */}
      {errorMessage && (
        <div className="form-error">{errorMessage}</div>
      )}

      <button
        className="btn-primary"
        onClick={handleSignIn}
        disabled={loading}
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>

      <div className="divider">
        <span className="divider-line"></span>
        <span className="divider-text">or</span>
        <span className="divider-line"></span>
      </div>

      <button
        className="btn-secondary"
        onClick={() => alert("Google sign-in coming later — needs OAuth setup in Supabase.")}
      >
        <span className="google-dot"></span>
        Continue with Google
      </button>
    </AuthLayout>
  );
}
