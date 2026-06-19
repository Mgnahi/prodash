// ============================================================
// api/send-email.js — Vercel Serverless Function
// ------------------------------------------------------------
// Sends an IMMEDIATE email (not scheduled).
//
// Used for the "you just saved this entry" confirmation that
// fires right after the modal closes. The 3 timed reminders
// (day-before / on-day / 10-min-before) are handled by the
// separate /api/cron-send-emails endpoint.
//
// URL: POST /api/send-email
// Body: { to, subject, title, description, type, date, time }
// ============================================================

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Resend requires a verified domain. For free-tier testing
// you can use their onboarding@resend.dev address — but it
// ONLY delivers to the email address you used to sign up
// for Resend. Once you verify your own domain, change this.
const FROM_ADDRESS = "Prodash <onboarding@resend.dev>";

export default async function handler(req, res) {
  // Only POST is allowed
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { to, subject, title, description, type, date, time } = req.body || {};

  // Basic validation
  if (!to || !subject) {
    return res.status(400).json({ error: "Missing 'to' or 'subject'" });
  }

  try {
    const html = buildEmailHtml({ title, description, type, date, time });

    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      return res.status(500).json({
        error: error.message || "Failed to send email",
        status: "failed",
      });
    }

    return res.status(200).json({
      success: true,
      emailId: data?.id,
      status: "sent",
    });
  } catch (err) {
    console.error("Send email error:", err);
    return res.status(500).json({
      error: err.message || "Unknown error",
      status: "failed",
    });
  }
}

// ============================================================
// buildEmailHtml
// ------------------------------------------------------------
// Same dark-themed card design used by the scheduled emails,
// but with a "Saved confirmation" label at the top so the
// recipient knows this is the immediate confirmation, not
// a scheduled reminder.
// ============================================================
function buildEmailHtml({ title, description, type, date, time }) {
  const typeEmoji = {
    reminder: "⏰",
    todo: "✅",
    note: "📝",
    meeting: "🤝",
  }[type] || "📌";

  const formattedDate = date
    ? new Date(date + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      })
    : "";

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px 24px; background: #0a0a0a; color: #ffffff; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; width: 40px; height: 40px; line-height: 40px; background: #7C3AED; border-radius: 10px; color: white; font-weight: bold; font-size: 16px;">P</div>
        <span style="font-size: 18px; font-weight: 600; margin-left: 10px; vertical-align: middle;">Prodash</span>
      </div>

      <div style="background: #161618; border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 24px;">
        <div style="font-size: 12px; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
          ✅ Saved to Prodash
        </div>
        <div style="font-size: 14px; color: #a1a1aa; margin-bottom: 4px;">${typeEmoji} ${escapeHtml(type || "entry")}</div>
        <div style="font-size: 20px; font-weight: 700; margin-bottom: 12px;">${escapeHtml(title)}</div>

        ${description ? `<div style="font-size: 14px; color: #a1a1aa; margin-bottom: 16px; line-height: 1.5;">${escapeHtml(description)}</div>` : ""}

        ${formattedDate ? `
          <div style="font-size: 13px; color: #a1a1aa; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px;">
            📅 ${formattedDate}${time ? ` at ${escapeHtml(time.slice(0, 5))}` : ""}
          </div>
        ` : ""}

        <div style="font-size: 12px; color: #71717a; margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.05);">
          We'll also email you:
          <ul style="margin: 6px 0 0 0; padding-left: 20px; line-height: 1.6;">
            <li>The day before at 9 AM</li>
            <li>On the day at the scheduled time</li>
            ${time ? "<li>10 minutes before the scheduled time</li>" : ""}
          </ul>
        </div>
      </div>

      <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #52525b;">
        Sent by Prodash — your productivity dashboard
      </div>
    </div>
  `;
}

// Tiny helper to keep user-supplied content from breaking the HTML
function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
