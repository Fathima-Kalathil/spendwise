import nodemailer from "nodemailer";

type Purpose = "verify" | "reset";

/** True when we are able to send email (SMTP settings exist, or we are in local development). */
export function emailConfigured(): boolean {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) return true;
  return process.env.NODE_ENV !== "production"; // in development the code is printed in the terminal instead
}

function makeTransport(user: string, pass: string) {
  const host = process.env.SMTP_HOST;
  if (!host) {
    // Default: Gmail with an App Password (Google shows it in groups of 4 with spaces, so strip them).
    return nodemailer.createTransport({ service: "gmail", auth: { user, pass: pass.replace(/\s+/g, "") } });
  }
  // Any other SMTP provider (Brevo, Outlook, SendGrid, Mailgun, Resend SMTP...): set SMTP_HOST (and SMTP_PORT).
  const port = Number(process.env.SMTP_PORT ?? 587);
  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}

/** Sends the 6-digit code (e-mail verification or password reset). */
export async function sendOtpEmail(to: string, code: string, purpose: Purpose = "verify") {
  const reset = purpose === "reset";
  const user = process.env.SMTP_USER, pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    if (process.env.NODE_ENV !== "production") { console.log(`[dev] ${purpose} code for ${to}: ${code}`); return; }
    throw new Error("Email is not set up: SMTP_USER and SMTP_PASS are missing in the environment variables");
  }
  await makeTransport(user, pass).sendMail({
    from: `SpendWise <${process.env.MAIL_FROM ?? user}>`,
    to,
    subject: reset ? "Reset your SpendWise password" : "Your SpendWise verification code",
    text: `Your SpendWise ${reset ? "password reset" : "verification"} code is ${code}. It expires in 10 minutes. If you didn't ask for this, you can ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px">
      <h2 style="color:#0F766E;margin:0 0 8px">SpendWise</h2>
      <p>${reset ? "Use this code to reset your password:" : "Use this code to verify your email:"}</p>
      <p style="font-size:34px;font-weight:700;letter-spacing:8px;margin:16px 0">${code}</p>
      <p style="color:#555">It expires in 10 minutes. If you didn't ask for this, you can ignore this email.</p></div>`,
  });
}
