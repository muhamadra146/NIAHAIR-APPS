/**
 * Mailer utility — wraps nodemailer with app defaults.
 *
 * Env vars required:
 *   SMTP_HOST     - SMTP server host            (e.g. smtp.gmail.com)
 *   SMTP_PORT     - SMTP port                   (default 587)
 *   SMTP_SECURE   - "true" for port 465 (TLS)   (default false)
 *   SMTP_USER     - SMTP auth username           (e.g. your email)
 *   SMTP_PASS     - SMTP auth password / app-password
 *   SMTP_FROM     - Sender name + address        (e.g. "NIAHAIR ERP <noreply@niahair.com>")
 *   APP_URL       - Frontend base URL            (e.g. https://app.niahair.com)
 */
const nodemailer = require("nodemailer");

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  _transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return _transporter;
}

/**
 * Send an email.
 * @param {object} opts
 * @param {string}   opts.to      - Recipient address
 * @param {string}   opts.subject - Email subject
 * @param {string}   opts.html    - HTML body
 * @param {string}  [opts.text]   - Plain-text fallback (auto-generated if omitted)
 */
const sendMail = async ({ to, subject, html, text }) => {
  const from = process.env.SMTP_FROM ?? "NIAHAIR ERP <noreply@niahair.com>";
  await getTransporter().sendMail({ from, to, subject, html, text: text ?? html.replace(/<[^>]+>/g, " ") });
};

// ── Template helpers ──────────────────────────────────────────────────────────

/**
 * Send password reset email.
 * @param {string} to        - Recipient email
 * @param {string} name      - Recipient display name
 * @param {string} resetUrl  - Full reset URL (including token)
 */
const sendPasswordResetEmail = async (to, name, resetUrl) => {
  await sendMail({
    to,
    subject: "Reset Password — NIAHAIR ERP",
    html: `
<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f4f4f5">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center" style="padding:32px 16px">
      <table width="520" cellpadding="0" cellspacing="0" border="0"
             style="background:#fff;border-radius:12px;border:1px solid #e4e4e7;overflow:hidden">
        <!-- Header -->
        <tr>
          <td style="background:#8b5cf6;padding:24px 32px;text-align:center">
            <span style="color:#fff;font-size:24px;font-weight:700;letter-spacing:-0.5px">NIAHAIR ERP</span>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:32px">
          <h2 style="margin:0 0 8px;font-size:20px;color:#111">Reset Password</h2>
          <p style="margin:0 0 16px;color:#555;font-size:14px;line-height:1.6">
            Hai <strong>${name}</strong>, kami menerima permintaan untuk mereset password akunmu.
          </p>
          <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.6">
            Klik tombol di bawah ini untuk membuat password baru. Link ini hanya berlaku selama
            <strong>1 jam</strong> dan hanya bisa digunakan <strong>sekali</strong>.
          </p>
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr><td align="center">
              <a href="${resetUrl}"
                 style="display:inline-block;background:#8b5cf6;color:#fff;text-decoration:none;
                        font-size:14px;font-weight:600;padding:12px 32px;border-radius:8px">
                Reset Password
              </a>
            </td></tr>
          </table>
          <p style="margin:24px 0 0;color:#888;font-size:12px;line-height:1.6">
            Jika kamu tidak meminta reset password, abaikan email ini. Passwordmu tetap aman.<br>
            Link reset akan kadaluarsa otomatis dalam 1 jam.
          </p>
        </td></tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9f9fb;padding:16px 32px;border-top:1px solid #e4e4e7;text-align:center">
            <span style="color:#aaa;font-size:11px">© NIAHAIR ERP — Sistem manajemen salon</span>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim(),
  });
};

module.exports = { sendMail, sendPasswordResetEmail };
