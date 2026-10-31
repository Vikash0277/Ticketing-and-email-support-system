import { Resend } from "resend";

import env from "../../config/env.js";
import logger from "../../config/logger.js";

let client = null;

function getResendClient() {
  if (!env.RESEND_API_KEY) {
    return null;
  }

  if (!client) {
    client = new Resend(env.RESEND_API_KEY);
  }

  return client;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export function otpEmailTemplate({ title, intro, otp, footer }) {
  return `
    <div style="margin:0;background:#f1f5f9;padding:32px 16px;font-family:Arial,Helvetica,sans-serif">
      <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px">
        <h2 style="margin:0 0 16px;color:#0f172a">${escapeHtml(title)}</h2>
        <p style="color:#334155;line-height:1.6">${escapeHtml(intro)}</p>
        <div style="margin:24px 0;text-align:center">
          <span style="display:inline-block;padding:14px 28px;border-radius:10px;background:#0f172a;color:#ffffff;font-size:28px;letter-spacing:8px;font-weight:700">
            ${escapeHtml(otp)}
          </span>
        </div>
        <p style="color:#64748b;font-size:13px;line-height:1.6">
          This code expires in 10 minutes. If you did not request it, you can ignore this email.
        </p>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px">${escapeHtml(footer)}</p>
      </div>
    </div>
  `;
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
  replyTo,
  headers,
}) {
  if (!to || !subject) {
    throw new Error("Email recipient and subject are required");
  }

  const resend = getResendClient();

  if (!resend) {
    logger.warn("Email provider not configured. Email was not sent.", {
      to,
      subject,
    });

    return { id: `local-${Date.now()}`, skipped: true };
  }

  const { data, error } = await resend.emails.send({
    from: env.EMAIL_FROM || "onboarding@resend.dev",
    to: Array.isArray(to) ? to : [to],
    subject,
    text,
    html,
    ...(replyTo ? { replyTo } : {}),
    ...(headers ? { headers } : {}),
  });

  if (error) {
    logger.error("Resend email failed", {
      message: error.message,
      to,
      subject,
    });

    const sendError = new Error("Failed to send email");
    sendError.statusCode = 502;
    throw sendError;
  }

  logger.info("Email sent", { to, subject, providerMessageId: data?.id });

  return data;
}

function devOtpLog(purpose, to, otp) {
  if (env.isProduction) return;

  logger.info(`[DEV] ${purpose} OTP generated`, { to, otp });
  // Keep it visible in the terminal for local demos.
  console.info(`\n  ${purpose.toUpperCase()} OTP for ${to}: ${otp}\n`);
}

export async function sendVerificationEmail({ to, otp, name }) {
  devOtpLog("verification", to, otp);

  return sendEmail({
    to,
    subject: "Verify your email address",
    text: `Hi ${name || "there"},\n\nYour verification code is ${otp}. It expires in 10 minutes.`,
    html: otpEmailTemplate({
      title: "Verify your email",
      intro: `Hi ${name || "there"}, use the code below to verify your email address.`,
      otp,
      footer: "BitMax Support",
    }),
  });
}

export async function sendLoginOtpEmail({ to, otp, name }) {
  devOtpLog("login", to, otp);

  return sendEmail({
    to,
    subject: "Your login code",
    text: `Hi ${name || "there"},\n\nYour login code is ${otp}. It expires in 10 minutes.`,
    html: otpEmailTemplate({
      title: "Your login code",
      intro: `Hi ${name || "there"}, use the code below to sign in.`,
      otp,
      footer: "BitMax Support",
    }),
  });
}

export async function sendPasswordResetEmail({ to, resetUrl, name }) {
  return sendEmail({
    to,
    subject: "Reset your password",
    text: `Hi ${name || "there"},\n\nReset your password using this link (valid for 15 minutes):\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
    html: `
      <div style="margin:0;background:#f1f5f9;padding:32px 16px;font-family:Arial,Helvetica,sans-serif">
        <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px">
          <h2 style="margin:0 0 16px;color:#0f172a">Reset your password</h2>
          <p style="color:#334155;line-height:1.6">Hi ${escapeHtml(name || "there")}, click the button below to choose a new password. The link expires in 15 minutes.</p>
          <p style="margin:24px 0">
            <a href="${escapeHtml(resetUrl)}" style="display:inline-block;background:#0f172a;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none">Reset password</a>
          </p>
          <p style="color:#64748b;font-size:13px;line-height:1.6;word-break:break-all">${escapeHtml(resetUrl)}</p>
        </div>
      </div>
    `,
  });
}

export async function sendPhoneOtp() {
  const error = new Error(
    "SMS delivery is not configured. Use email OTP instead."
  );
  error.statusCode = 503;
  throw error;
}

export default { sendEmail };
