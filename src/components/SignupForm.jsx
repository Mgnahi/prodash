
import { useState } from "react";
import AuthLayout from "./AuthLayout";
import TextField from "./TextField";
import { signUp } from "../lib/auth";

export default function SignupForm({ onSwitchToLogin }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleCreateAccount() {
    setErrorMessage("");

    if (!fullName || !email || !password) {
      setErrorMessage("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const { error } = await signUp({ email, password, fullName });
    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    // Success: with email confirmation OFF, Supabase fires
    // onAuthStateChange immediately and App.jsx flips to the
    // dashboard. No alert, no redirect needed.
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Free forever. No credit card needed."
      footer={
        <>
          Already have an account?{" "}
          <span className="link-purple" onClick={onSwitchToLogin}>
            Sign in
          </span>
        </>
      }
    >
      <TextField
        label="Full name"
        placeholder="Alex Johnson"
        value={fullName}
        onChange={setFullName}
      />

      <TextField
        label="Email address"
        type="email"
        placeholder="alex@example.com"
        value={email}
        onChange={setEmail}
      />

      <TextField
        label="Password"
        type="password"
        placeholder="At least 6 characters"
        value={password}
        onChange={setPassword}
      />

      {errorMessage && (
        <div className="form-error">{errorMessage}</div>
      )}

      <button
        className="btn-primary"
        onClick={handleCreateAccount}
        disabled={loading}
        style={{ marginTop: 8 }}
      >
        {loading ? "Creating account..." : "Create account"}
      </button>

      <div className="divider">
        <span className="divider-line"></span>
        <span className="divider-text">or</span>
        <span className="divider-line"></span>
      </div>

      <button
        className="btn-secondary"
        onClick={() => alert("Google sign-up coming later — needs OAuth setup in Supabase.")}
      >
        <span className="google-dot"></span>
        Sign up with Google
      </button>
    </AuthLayout>
  );
}
