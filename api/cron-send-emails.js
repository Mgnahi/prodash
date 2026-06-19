// ============================================================
// api/cron-send-emails.js — Vercel Serverless Function
// ------------------------------------------------------------
// Vercel hits this endpoint on a schedule (see vercel.json).
// It finds all scheduled_emails where status='pending' and
// send_at <= now(), sends each one via Resend, and updates
// its status.
//
// Auth: the request must include `Authorization: Bearer <CRON_SECRET>`
// (Vercel cron jobs add this automatically when you set
//  CRON_SECRET in env vars, AND you can hit it manually with curl.)
// ============================================================

import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);

// Service role key BYPASSES RLS — that's what we need for the
// cron job to read/update rows for any user. Keep it secret.
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const FROM_ADDRESS = "Prodash <onboarding@resend.dev>";

export default async function handler(req, res) {
  // ---- Auth check ----
  // Vercel cron automatically sends `Authorization: Bearer <CRON_SECRET>`
  // when CRON_SECRET is set in your env vars.
  const authHeader = req.headers.authorization || "";
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const now = new Date().toISOString();

    // ---- Find due emails ----
    // Only fetch what's due. The partial index makes this fast.
    const { data: due, error: fetchError } = await supabaseAdmin
      .from("scheduled_emails")
      .select("*")
      .eq("status", "pending")
      .lte("send_at", now)
      .order("send_at", { ascending: true })
      .limit(50); // batch — if more are due, next cron tick picks them up

    if (fetchError) {
      console.error("Fetch error:", fetchError);
      return res.status(500).json({ error: fetchError.message });
    }

    if (!due || due.length === 0) {
      return res.status(200).json({ processed: 0, sent: 0, failed: 0 });
    }

    // ---- Send each one ----
    let sentCount = 0;
    let failedCount = 0;

    for (const email of due) {
      const html = buildEmailHtml(email);

      try {
        const { data, error: sendError } = await resend.emails.send({
          from: FROM_ADDRESS,
          to: [email.to_email],
          subject: email.subject,
          html,
        });

        if (sendError) {
          // Mark as failed, record the error
          await supabaseAdmin
            .from("scheduled_emails")
            .update({
              status: "failed",
              sent_at: new Date().toISOString(),
              error_message: sendError.message || "Resend error",
            })
            .eq("id", email.id);

          // Log the failure
          await supabaseAdmin.from("email_log").insert({
            user_id: email.user_id,
            entry_id: email.entry_id,
            status: "failed",
            subject: email.subject,
          });

          failedCount++;
          console.error(`Resend error for ${email.id}:`, sendError);
        } else {
          // Mark as sent
          await supabaseAdmin
            .from("scheduled_emails")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
            })
            .eq("id", email.id);

          // Log the success
          await supabaseAdmin.from("email_log").insert({
            user_id: email.user_id,
            entry_id: email.entry_id,
            status: "sent",
            subject: email.subject,
          });

          sentCount++;
          console.log(`Sent email ${email.id} (${email.kind})`);
        }
      } catch (err) {
        // Network / unexpected error
        await supabaseAdmin
          .from("scheduled_emails")
          .update({
            status: "failed",
            sent_at: new Date().toISOString(),
            error_message: err.message,
          })
          .eq("id", email.id);

        await supabaseAdmin.from("email_log").insert({
          user_id: email.user_id,
          entry_id: email.entry_id,
          status: "failed",
          subject: email.subject,
        });

        failedCount++;
        console.error(`Unexpected error for ${email.id}:`, err);
      }
    }

    return res.status(200).json({
      processed: due.length,
      sent: sentCount,
      failed: failedCount,
    });
  } catch (err) {
    console.error("Cron handler error:", err);
    return res.status(500).json({ error: err.message });
  }
}

// ============================================================
// buildEmailHtml
// ------------------------------------------------------------
// Same dark-themed card as your original, but with a label
// at the top that says which kind of reminder this is
// (day-before / on-day / 10-min-before).
// ============================================================
function buildEmailHtml(email) {
  const typeEmoji = {
    reminder: "⏰",
    todo: "✅",
    note: "📝",
    meeting: "🤝",
  }[email.type] || "📌";

  const kindLabel = {
    day_before:     "📅 Day-before reminder",
    on_day:         "🔔 Today",
    ten_min_before: "⏰ Starting in 10 minutes",
  }[email.kind] || "Reminder";

  const formattedDate = new Date(email.date + "T00:00:00").toLocaleDateString(
    "en-US",
    { weekday: "long", year: "numeric", month: "long", day: "numeric" }
  );

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px 24px; background: #0a0a0a; color: #ffffff; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; width: 40px; height: 40px; line-height: 40px; background: #7C3AED; border-radius: 10px; color: white; font-weight: bold; font-size: 16px;">P</div>
        <span style="font-size: 18px; font-weight: 600; margin-left: 10px; vertical-align: middle;">Prodash</span>
      </div>

      <div style="background: #161618; border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 24px;">
        <div style="font-size: 12px; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
          ${kindLabel}
        </div>
        <div style="font-size: 14px; color: #a1a1aa; margin-bottom: 4px;">${typeEmoji} ${email.type}</div>
        <div style="font-size: 20px; font-weight: 700; margin-bottom: 12px;">${escapeHtml(email.title)}</div>

        ${email.description ? `<div style="font-size: 14px; color: #a1a1aa; margin-bottom: 16px; line-height: 1.5;">${escapeHtml(email.description)}</div>` : ""}

        <div style="font-size: 13px; color: #a1a1aa; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px;">
          📅 ${formattedDate}${email.time ? ` at ${email.time.slice(0, 5)}` : ""}
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
