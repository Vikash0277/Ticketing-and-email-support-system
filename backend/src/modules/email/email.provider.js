import { Resend } from "resend";

import env from "../../config/env.js";
import logger from "../../config/logger.js";

let resendClient = null;

function getClient() {
  if (!env.RESEND_API_KEY) return null;

  if (!resendClient) {
    resendClient = new Resend(env.RESEND_API_KEY);
  }

  return resendClient;
}

export async function sendProviderEmail({
  to,
  subject,
  html,
  text,
  replyTo,
  headers = {},
}) {
  const resend = getClient();

  if (!resend) {
    logger.warn("RESEND_API_KEY is not configured. Email skipped.", {
      to,
      subject,
    });

    return { providerMessageId: `local-${Date.now()}`, skipped: true };
  }

  const { data, error } = await resend.emails.send({
    from: env.EMAIL_FROM || "onboarding@resend.dev",
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text,
    ...(replyTo ? { replyTo } : {}),
    ...(headers ? { headers } : {}),
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }

  return {
    providerMessageId: data?.id,
  };
}

export async function getReceivedEmail(emailId) {
  const resend = getClient();

  if (!resend) {
    throw new Error("RESEND_API_KEY is required to fetch received email");
  }

  const { data, error } = await resend.emails.receiving.get(emailId);

  if (error) {
    throw new Error(`Resend receive lookup failed: ${error.message}`);
  }

  return data;
}

export async function listReceivedAttachments(emailId) {
  const resend = getClient();

  if (!resend) return [];

  const { data, error } = await resend.emails.receiving.attachments.list({
    emailId,
  });

  if (error) {
    throw new Error(`Resend attachment lookup failed: ${error.message}`);
  }

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (data != null) {
    logger.warn("Unexpected Resend attachment list response", {
      emailId,
    });
  }

  return [];
}
