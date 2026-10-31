import client, { unwrap } from "./client";

export async function register(payload) {
  const response = await client.post("/auth/register", payload);
  return unwrap(response);
}

export async function verifyOtp(payload) {
  const response = await client.post("/auth/verify-otp", payload);
  return unwrap(response);
}

export async function resendOtp(payload) {
  const response = await client.post("/auth/resend-otp", payload);
  return unwrap(response);
}

export async function login(payload) {
  const response = await client.post("/auth/login-password", payload);
  return unwrap(response);
}

export async function requestLoginOtp(payload) {
  const response = await client.post("/auth/login-otp", payload);
  return unwrap(response);
}

export async function verifyLoginOtp(payload) {
  const response = await client.post("/auth/verify-login-otp", payload);
  return unwrap(response);
}

export async function refreshToken(refreshTokenValue) {
  const response = await client.post("/auth/refresh-token", {
    refreshToken: refreshTokenValue,
  });
  return unwrap(response);
}

export async function logout(refreshTokenValue) {
  const response = await client.post("/auth/logout", {
    refreshToken: refreshTokenValue,
  });
  return unwrap(response);
}

export async function logoutAll() {
  const response = await client.post("/auth/logout-all");
  return unwrap(response);
}

export async function forgotPassword(payload) {
  const response = await client.post("/auth/forgot-password", payload);
  return unwrap(response);
}

export async function resetPassword(payload) {
  const response = await client.post("/auth/reset-password", payload);
  return unwrap(response);
}

export async function getMe() {
  const response = await client.get("/auth/me");
  return unwrap(response);
}

export async function updateMe(payload) {
  const response = await client.patch("/auth/me", payload);
  return unwrap(response);
}

export async function changePassword(payload) {
  const response = await client.post("/auth/change-password", payload);
  return unwrap(response);
}

export async function listSessions() {
  const response = await client.get("/auth/sessions");
  return unwrap(response);
}

export async function revokeSession(sessionId) {
  const response = await client.delete(`/auth/sessions/${sessionId}`);
  return unwrap(response);
}
