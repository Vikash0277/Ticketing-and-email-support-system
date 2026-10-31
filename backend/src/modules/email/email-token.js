import crypto from "node:crypto";

if (!process.env.EMAIL_REPLY_TOKEN_SECRET) {
  throw new Error("EMAIL_REPLY_TOKEN_SECRET is required");
}

export function createReplyToken(ticketId) {
  return crypto
    .createHmac("sha256", process.env.EMAIL_REPLY_TOKEN_SECRET)
    .update(String(ticketId))
    .digest("hex");
}

export function hashReplyToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function makeReplyAddress(token) {
  const domain = process.env.EMAIL_REPLY_DOMAIN;

  if (!domain) {
    throw new Error("EMAIL_REPLY_DOMAIN is required");
  }

  return `reply+${token}@${domain}`;
}