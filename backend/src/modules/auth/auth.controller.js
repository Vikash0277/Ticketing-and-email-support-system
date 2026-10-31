import asyncHandler from "../../utils/asyncHandler.js";
import { sendSuccess } from "../../utils/response.js";
import * as authService from "./auth.service.js";

function requestContext(req) {
  return {
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
    deviceName: req.headers["x-device-name"] || undefined,
  };
}

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.validatedBody);

  return sendSuccess(
    res,
    201,
    "Registration successful. Please verify your email.",
    result
  );
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const result = await authService.verifyOtp(req.validatedBody);

  return sendSuccess(
    res,
    200,
    result.alreadyVerified
      ? "This destination is already verified. Please sign in."
      : "OTP verified successfully.",
    result
  );
});

export const resendOtp = asyncHandler(async (req, res) => {
  const result = await authService.resendOtp(req.validatedBody);

  return sendSuccess(
    res,
    200,
    "If the account is eligible, a verification OTP has been sent.",
    result
  );
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.validatedBody, requestContext(req));

  return sendSuccess(res, 200, "Login successful.", result);
});

export const requestLoginOtp = asyncHandler(async (req, res) => {
  const result = await authService.requestLoginOtp(req.validatedBody);

  return sendSuccess(
    res,
    200,
    "If the account is eligible, a login OTP has been sent.",
    result
  );
});

export const verifyLoginOtp = asyncHandler(async (req, res) => {
  const result = await authService.verifyLoginOtp(
    req.validatedBody,
    requestContext(req)
  );

  return sendSuccess(res, 200, "Login successful.", result);
});

export const refreshToken = asyncHandler(async (req, res) => {
  const result = await authService.refreshToken(req.validatedBody.refreshToken);

  return sendSuccess(res, 200, "Token refreshed successfully.", result);
});

export const logout = asyncHandler(async (req, res) => {
  const result = await authService.logout(req.validatedBody.refreshToken);

  return sendSuccess(res, 200, "Logout successful.", result);
});

export const logoutAll = asyncHandler(async (req, res) => {
  const result = await authService.logoutAll(req.user.id);

  return sendSuccess(res, 200, "Signed out from all devices.", result);
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.validatedBody.email);

  return sendSuccess(
    res,
    200,
    "If an eligible account exists, password-reset instructions will be sent.",
    result
  );
});

export const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.validatedBody);

  return sendSuccess(
    res,
    200,
    "Password reset successful. Please log in again.",
    result
  );
});

export const me = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user.id);

  return sendSuccess(res, 200, "Profile fetched successfully.", user);
});

export const updateMe = asyncHandler(async (req, res) => {
  const user = await authService.updateProfile(req.user.id, req.validatedBody);

  return sendSuccess(res, 200, "Profile updated successfully.", user);
});

export const changePassword = asyncHandler(async (req, res) => {
  const result = await authService.changePassword(
    req.user.id,
    req.validatedBody
  );

  return sendSuccess(res, 200, "Password changed successfully.", result);
});

export const listSessions = asyncHandler(async (req, res) => {
  const sessions = await authService.listSessions(req.user.id);

  return sendSuccess(res, 200, "Sessions fetched successfully.", sessions);
});

export const revokeSession = asyncHandler(async (req, res) => {
  const result = await authService.revokeSession(
    req.user.id,
    req.validatedParams.sessionId
  );

  return sendSuccess(res, 200, "Session revoked successfully.", result);
});
