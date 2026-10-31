import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is required");
}

export const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendProviderEmail({
  to,
  subject,
  html,
  text,
  replyTo,
  headers = {},
}) {
  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text,
    replyTo,
    headers,
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }

  return {
    providerMessageId: data.id,
  };
}

export async function getReceivedEmail(emailId) {
  const { data, error } = await resend.emails.receiving.get(emailId);

  if (error) {
    throw new Error(`Resend receive lookup failed: ${error.message}`);
  }

  return data;
}

export async function listReceivedAttachments(emailId) {
  const { data, error } =
    await resend.emails.receiving.attachments.list({ emailId });

  if (error) {
    throw new Error(`Resend attachment lookup failed: ${error.message}`);
  }

  return data ?? [];
}