// ============================================================
// api/send-email.js — Vercel Serverless Function
// ------------------------------------------------------------
// This file runs on the SERVER, not in the browser. Vercel
// automatically turns any .js file in the /api folder into
// an HTTP endpoint.
//
// URL: POST /api/send-email
// Body: { to, subject, title, description, type, date, time }
//
// HOW IT WORKS:
//   1. Browser saves an entry to Supabase (client-side)
//   2. If send_email is true, browser POSTs to /api/send-email
//   3. This function receives the request, builds an HTML email,
//      and calls Resend to deliver it
//   4. We log the result to the email_log table in Supabase
//
// WHY SERVER-SIDE:
//   The RESEND_API_KEY must never be exposed to the browser.
//   Serverless functions run on Vercel's servers, so the key
//   stays in the environment — safe.
//
// VERCEL SERVERLESS FUNCTION FORMAT:
//   Export a default function that receives (req, res).
//   req.body has the parsed JSON body.
//   res.status(200).json({...}) sends the response.
// ============================================================

import { Resend } from "resend";

// Read the API key from Vercel environment variables.
// On Vercel, you set these in Project Settings → Environment Variables.
// Locally, they come from .env.local (but only via `vercel dev`).
const resend = new Resend(process.env.RESEND_API_KEY);

// The "from" address. Resend requires a verified domain, OR you
// can use their test address for free-tier testing.
// Once you verify your own domain in Resend, change this.
const FROM_ADDRESS = "Prodash <onboarding@resend.dev>";

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { to, subject, title, description, type, date, time, entryId, userId } = req.body;

  // Basic validation
  if (!to || !subject) {
    return res.status(400).json({ error: "Missing 'to' or 'subject'" });
  }

  try {
    // --- Build the email HTML ---
    // A clean, simple email that looks good in any inbox.
    const typeEmoji = {
      reminder: "⏰",
      todo: "✅",
      note: "📝",
      meeting: "🤝",
    }[type] || "📌";

    const formattedDate = new Date(date + "T00:00:00").toLocaleDateString(
      "en-US",
      { weekday: "long", year: "numeric", month: "long", day: "numeric" }
    );

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px 24px; background: #0a0a0a; color: #ffffff; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; width: 40px; height: 40px; line-height: 40px; background: #7C3AED; border-radius: 10px; color: white; font-weight: bold; font-size: 16px;">P</div>
          <span style="font-size: 18px; font-weight: 600; margin-left: 10px; vertical-align: middle;">Prodash</span>
        </div>

        <div style="background: #161618; border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 24px;">
          <div style="font-size: 14px; color: #a1a1aa; margin-bottom: 4px;">${typeEmoji} New ${type}</div>
          <div style="font-size: 20px; font-weight: 700; margin-bottom: 12px;">${title}</div>

          ${description ? `<div style="font-size: 14px; color: #a1a1aa; margin-bottom: 16px; line-height: 1.5;">${description}</div>` : ""}

          <div style="font-size: 13px; color: #a1a1aa; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px;">
            📅 ${formattedDate}${time ? ` at ${time}` : ""}
          </div>
        </div>

        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #52525b;">
          Sent by Prodash — your productivity dashboard
        </div>
      </div>
    `;

    // --- Send via Resend ---
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [to],
      subject: subject,
      html: html,
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
      error: err.message,
      status: "failed",
    });
  }
}