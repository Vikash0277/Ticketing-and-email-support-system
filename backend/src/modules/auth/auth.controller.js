
import * as authService from "./auth.service.js";


const sendSuccess = (res, statusCode, message, data) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

// POST /api/auth/register
export const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.validatedBody);

    return sendSuccess(
      res,
      201,
      "Registration successful. Please verify your email.",
      result
    );
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/verify-otp
export const verifyOtp = async (req, res, next) => {
  try {
    const result = await authService.verifyOtp(req.validatedBody);

    return sendSuccess(
      res,
      200,
      result.alreadyVerified
        ? "This destination is already verified. Please sign in."
        : "OTP verified successfully.",
      result
    );
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/resend-otp
export const resendOtp = async (req, res, next) => {
  try {
    const result = await authService.resendOtp(req.validatedBody);

    return sendSuccess(
      res,
      200,
      "If the account is eligible, a verification OTP has been sent.",
      result
    );
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login-password
export const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.validatedBody);

    return sendSuccess(
      res,
      200,
      "Login successful.",
      result
    );
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login-otp
export const requestLoginOtp = async (req, res, next) => {
  try {
    const result = await authService.requestLoginOtp(
      req.validatedBody
    );

    return sendSuccess(
      res,
      200,
      "If the account is eligible, a login OTP has been sent.",
      result
    );
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/verify-login-otp
export const verifyLoginOtp = async (req, res, next) => {
  try {
    const result = await authService.verifyLoginOtp(
      req.validatedBody
    );

    return sendSuccess(
      res,
      200,
      "Login successful.",
      result
    );
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/refresh-token

export const refreshToken = async (req, res, next) => {
  try {
    const result = await authService.refreshToken(
      req.validatedBody.refreshToken
    );

    return sendSuccess(res, 200, "Token refreshed successfully.", result);
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/logout
export const logout = async (req, res, next) => {
  try {
    const result = await authService.logout(
      req.validatedBody.refreshToken
    );

    return sendSuccess(
      res,
      200,
      "Logout successful.",
      result
    );
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/forgot-password
export const forgotPassword = async (req, res, next) => {
  try {
    const result = await authService.forgotPassword(
      req.validatedBody.email
    );

    return sendSuccess(
      res,
      200,
      "If an eligible account exists, password-reset instructions will be sent.",
      result
    );
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/reset-password
export const resetPassword = async (req, res, next) => {
  try {
    const result = await authService.resetPassword(
      req.validatedBody
    );

    return sendSuccess(
      res,
      200,
      "Password reset successful. Please log in again.",
      result
    );
  } catch (error) {
    next(error);
  }
};
