import crypto from "node:crypto";

import env from "../../config/env.js";

function getSecret() {
  return (
    env.email.replyTokenSecret ||
    env.TOKEN_HASH_SECRET ||
    "development-reply-token-secret"
  );
}

export function createReplyToken(ticketId) {
  return crypto
    .createHmac("sha256", getSecret())
    .update(String(ticketId))
    .digest("hex");
}

export function hashReplyToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

export function getReplyDomain() {
  return env.email.replyDomain || "";
}

export function makeReplyAddress(token) {
  const domain = getReplyDomain();

  if (!domain) {
    return null;
  }

  return `reply+${token}@${domain}`;
}

export function extractReplyToken(recipients = []) {
  const list = Array.isArray(recipients) ? recipients : [recipients];

  for (const recipient of list) {
    const value = String(recipient || "");
    const match = value.match(/<([^>]+)>/);
    const email = (match?.[1] ?? value).trim().toLowerCase();
    const tokenMatch = email.match(/^reply\+([a-f0-9]{64})@/i);

    if (tokenMatch) return tokenMatch[1];
  }

  return null;
}
