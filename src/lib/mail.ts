import nodemailer from "nodemailer";

/** Sends the 6-digit code. Uses a free Gmail account with an App Password (SMTP_USER / SMTP_PASS). */
export async function sendOtpEmail(to: string, code: string, purpose: "verify" | "reset" = "verify") {
  const reset = purpose === "reset";
  const user = process.env.SMTP_USER, pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    if (process.env.NODE_ENV !== "production") { console.log(`[dev] Verification code for ${to}: ${code}`); return; }
    throw new Error("SMTP_USER and SMTP_PASS are not set");
  }
  const transporter = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  await transporter.sendMail({
    from: `SpendWise <${user}>`,
    to,
    subject: reset ? "Reset your SpendWise password" : "Your SpendWise verification code",
    text: `Your SpendWise ${reset ? "password reset" : "verification"} code is ${code}. It expires in 10 minutes. ${reset ? "If you didn't ask for this, you can ignore this email." : "If you didn't create an account, you can ignore this email."}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px">
      <h2 style="color:#0F766E;margin:0 0 8px">SpendWise</h2>
      <p>${reset ? "Use this code to reset your password:" : "Use this code to verify your email:"}</p>
      <p style="font-size:34px;font-weight:700;letter-spacing:8px;margin:16px 0">${code}</p>
      <p style="color:#555">It expires in 10 minutes. If you didn't ask for this, you can ignore this email.</p></div>`,
  });
}
