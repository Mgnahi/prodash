import { useState } from "react";
import { supabase } from "../lib/supabase";
import { getDisplayName, getInitials, signOut } from "../lib/auth";

const SUB_NAV = [
  { id: "profile",       label: "Profile" },
  { id: "email",         label: "Email settings" },
  { id: "notifications", label: "Notifications" },
  { id: "appearance",    label: "Appearance" },
  { id: "timezone",      label: "Timezone" },
  { id: "security",      label: "Security" },
];

// Common timezones for the selector
const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
];

// Accent color choices
const ACCENT_COLORS = [
  { value: "#7C3AED", label: "Purple (default)" },
  { value: "#10B981", label: "Green" },
  { value: "#06B6D4", label: "Cyan" },
  { value: "#EF4444", label: "Red" },
  { value: "#F59E0B", label: "Amber" },
  { value: "#EC4899", label: "Pink" },
];

export default function SettingsPage({ user }) {
  const [tab, setTab] = useState("profile");

  // --- Profile state ---
  const [name, setName]   = useState(getDisplayName(user));
  const [email]           = useState(user?.email || "");
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  // --- Email settings state ---
  const [emailOnSave, setEmailOnSave]       = useState(true);
  const [emailOnReminder, setEmailOnReminder] = useState(true);
  const [emailOnMeeting, setEmailOnMeeting]   = useState(true);
  const [weeklyDigest, setWeeklyDigest]       = useState(false);

  // --- Notifications state ---
  const [notifyReminders, setNotifyReminders]   = useState(true);
  const [notifyMeetings, setNotifyMeetings]     = useState(true);
  const [notifyOverdue, setNotifyOverdue]       = useState(true);
  const [notifySound, setNotifySound]           = useState(false);

  // --- Appearance state ---
  const [darkMode, setDarkMode]       = useState(true);
  const [accentColor, setAccentColor] = useState("#7C3AED");

  // --- Timezone state ---
  // Try to detect the user's browser timezone as the default
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [timezone, setTimezone] = useState(
    TIMEZONES.includes(browserTz) ? browserTz : "Asia/Riyadh"
  );

  // --- Security state ---
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securityMsg, setSecurityMsg]         = useState("");
  const [securityError, setSecurityError]     = useState("");

  // --- Handlers ---

  async function handleSaveName() {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: name },
    });
    setSaving(false);
    if (error) {
      alert("Could not save: " + error.message);
    } else {
      setSavedMessage("Saved!");
      setTimeout(() => setSavedMessage(""), 2000);
    }
  }

  async function handleChangePassword() {
    setSecurityMsg("");
    setSecurityError("");

    if (!newPassword || !confirmPassword) {
      setSecurityError("Please fill in both password fields.");
      return;
    }
    if (newPassword.length < 6) {
      setSecurityError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityError("Passwords do not match.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setSaving(false);

    if (error) {
      setSecurityError(error.message);
    } else {
      setSecurityMsg("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSecurityMsg(""), 3000);
    }
  }

  async function handleDeleteAccount() {
    if (!window.confirm(
      "Are you sure you want to delete your account? " +
      "All your data will be permanently lost. This cannot be undone."
    )) return;

    // Double confirm for safety
    if (!window.confirm(
      "Last chance — this will delete everything. Continue?"
    )) return;

    // Sign out (actual account deletion requires a server-side
    // admin call — for now we just sign out and show a message)
    alert(
      "Account deletion requires admin privileges. " +
      "For now, your data remains safe. Contact support to fully delete your account."
    );
    await signOut();
  }

  // --- Render the active tab's content ---
  function renderTabContent() {
    switch (tab) {

      // ========== PROFILE ==========
      case "profile":
        return (
          <>
            <h2 className="settings-content-title">Profile settings</h2>

            <div className="settings-row settings-avatar-row">
              <div className="settings-avatar">{getInitials(user)}</div>
              <div className="settings-avatar-info">
                <div className="settings-avatar-name">{name}</div>
                <div className="settings-avatar-email">{email}</div>
              </div>
            </div>

            <div className="settings-row">
              <div>
                <div className="settings-row-title">Display name</div>
                <div className="settings-row-sub">Shown in the top navigation</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {savedMessage && <span style={{ color: "#10B981", fontSize: 12 }}>{savedMessage}</span>}
                <input
                  className="text-field-input settings-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={handleSaveName}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="settings-row">
              <div>
                <div className="settings-row-title">Email address</div>
                <div className="settings-row-sub">Read-only — managed by your auth provider</div>
              </div>
              <input
                className="text-field-input settings-input"
                value={email}
                disabled
                style={{ opacity: 0.6 }}
              />
            </div>
          </>
        );

      // ========== EMAIL SETTINGS ==========
      case "email":
        return (
          <>
            <h2 className="settings-content-title">Email settings</h2>
            <p className="settings-description">
              Control which emails Prodash sends you. Email sending requires Resend to be configured.
            </p>

            <ToggleRow
              title="Email on entry save"
              subtitle="Send an email whenever you save an entry with 'Send email' enabled"
              checked={emailOnSave}
              onChange={setEmailOnSave}
            />
            <ToggleRow
              title="Reminder emails"
              subtitle="Get emailed before reminder due dates"
              checked={emailOnReminder}
              onChange={setEmailOnReminder}
            />
            <ToggleRow
              title="Meeting notifications"
              subtitle="Email 15 minutes before each meeting"
              checked={emailOnMeeting}
              onChange={setEmailOnMeeting}
            />
            <ToggleRow
              title="Weekly digest"
              subtitle="Summary of the week ahead, every Monday morning"
              checked={weeklyDigest}
              onChange={setWeeklyDigest}
            />
          </>
        );

      // ========== NOTIFICATIONS ==========
      case "notifications":
        return (
          <>
            <h2 className="settings-content-title">Notifications</h2>
            <p className="settings-description">
              In-app notification preferences. These control the 🔔 bell in the top bar.
            </p>

            <ToggleRow
              title="Reminder alerts"
              subtitle="Show a notification when a reminder is due"
              checked={notifyReminders}
              onChange={setNotifyReminders}
            />
            <ToggleRow
              title="Meeting alerts"
              subtitle="Notify 10 minutes before meetings"
              checked={notifyMeetings}
              onChange={setNotifyMeetings}
            />
            <ToggleRow
              title="Overdue tasks"
              subtitle="Alert when a todo passes its due date"
              checked={notifyOverdue}
              onChange={setNotifyOverdue}
            />
            <ToggleRow
              title="Notification sound"
              subtitle="Play a sound when notifications appear"
              checked={notifySound}
              onChange={setNotifySound}
            />
          </>
        );

      // ========== APPEARANCE ==========
      case "appearance":
        return (
          <>
            <h2 className="settings-content-title">Appearance</h2>
            <p className="settings-description">
              Customize how Prodash looks.
            </p>

            <ToggleRow
              title="Dark mode"
              subtitle="Always use the dark theme"
              checked={darkMode}
              onChange={setDarkMode}
            />

            <div className="settings-row">
              <div>
                <div className="settings-row-title">Accent color</div>
                <div className="settings-row-sub">Used for buttons, links, and highlights</div>
              </div>
              <div className="settings-color-picker">
                {ACCENT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    className={`color-swatch ${accentColor === c.value ? "selected" : ""}`}
                    style={{ backgroundColor: c.value }}
                    onClick={() => setAccentColor(c.value)}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </>
        );

      // ========== TIMEZONE ==========
      case "timezone":
        return (
          <>
            <h2 className="settings-content-title">Timezone</h2>
            <p className="settings-description">
              Set your timezone so dates and times display correctly.
              Your browser detected: <strong>{browserTz}</strong>
            </p>

            <div className="settings-row">
              <div>
                <div className="settings-row-title">Timezone</div>
                <div className="settings-row-sub">
                  All dates and reminders will use this timezone
                </div>
              </div>
              <select
                className="text-field-input settings-input"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            <div className="settings-row">
              <div>
                <div className="settings-row-title">Current time</div>
                <div className="settings-row-sub">
                  Based on your selected timezone
                </div>
              </div>
              <div style={{ fontSize: 14, color: "#a1a1aa" }}>
                {new Date().toLocaleString("en-US", { timeZone: timezone })}
              </div>
            </div>
          </>
        );

      // ========== SECURITY ==========
      case "security":
        return (
          <>
            <h2 className="settings-content-title">Security</h2>
            <p className="settings-description">
              Update your password. You'll stay signed in after changing it.
            </p>

            <div className="settings-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 12 }}>
              <div>
                <div className="settings-row-title">Change password</div>
                <div className="settings-row-sub">Enter a new password (minimum 6 characters)</div>
              </div>

              <input
                className="text-field-input"
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <input
                className="text-field-input"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />

              {securityError && <div className="form-error">{securityError}</div>}
              {securityMsg && (
                <div style={{
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  color: "#6EE7B7",
                  fontSize: 13,
                  padding: "10px 12px",
                  borderRadius: 8,
                }}>
                  {securityMsg}
                </div>
              )}

              <button
                className="btn-primary"
                style={{ width: "auto", alignSelf: "flex-start", padding: "10px 20px" }}
                onClick={handleChangePassword}
                disabled={saving}
              >
                {saving ? "Updating..." : "Update password"}
              </button>
            </div>
          </>
        );

      // ========== DANGER ZONE ==========
      case "danger":
        return (
          <>
            <h2 className="settings-content-title" style={{ color: "#EF4444" }}>
              Danger zone
            </h2>
            <p className="settings-description">
              Irreversible actions. Please be careful.
            </p>

            <div className="settings-row" style={{ borderColor: "rgba(239, 68, 68, 0.3)" }}>
              <div>
                <div className="settings-row-title">Delete account</div>
                <div className="settings-row-sub">
                  Permanently delete your account and all your data. This cannot be undone.
                </div>
              </div>
              <button
                className="reminder-btn dismiss"
                style={{ padding: "8px 16px", fontSize: 13 }}
                onClick={handleDeleteAccount}
              >
                Delete my account
              </button>
            </div>
          </>
        );

      default:
        return null;
    }
  }

  return (
    <div className="page">
      <div className="settings-layout">

        <aside className="settings-nav">
          {SUB_NAV.map((item) => (
            <button
              key={item.id}
              className={`settings-nav-item ${tab === item.id ? "active" : ""}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
          <button
            className={`settings-nav-item danger ${tab === "danger" ? "active" : ""}`}
            style={{ marginTop: 16 }}
            onClick={() => setTab("danger")}
          >
            Danger zone
          </button>
        </aside>

        <div className="settings-content">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}

// Reusable toggle row component
function ToggleRow({ title, subtitle, checked, onChange }) {
  return (
    <div className="settings-row">
      <div>
        <div className="settings-row-title">{title}</div>
        <div className="settings-row-sub">{subtitle}</div>
      </div>
      <label className="switch">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="switch-slider"></span>
      </label>
    </div>
  );
}
