import { Router } from "express";

import * as authController from "./auth.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import {
  authLimiter,
  otpLimiter,
  passwordResetLimiter,
} from "../../middleware/rate-limit.middleware.js";
import {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  requestOtpSchema,
  verifyLoginOtpSchema,
  refreshTokenSchema,
  logoutSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resendOtpSchema,
  updateProfileSchema,
  changePasswordSchema,
  sessionIdParamsSchema,
} from "./auth.validation.js";

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a customer account
 *     description: Creates a customer account and sends an email verification OTP.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: Jane Doe }
 *               email: { type: string, format: email, example: jane@example.com }
 *               password: { type: string, format: password, minLength: 8 }
 *               phone: { type: string, example: "+919876543210" }
 *     responses:
 *       201: { description: Registration successful }
 *       400: { description: Validation failed }
 *       409: { description: Account already exists }
 */
router.post("/register", authLimiter, validate(registerSchema), authController.register);

/**
 * @openapi
 * /auth/verify-otp:
 *   post:
 *     tags: [Authentication]
 *     summary: Verify a registration OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [otp]
 *             properties:
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *               otp: { type: string, example: "123456" }
 *     responses:
 *       200: { description: OTP verified }
 *       400: { description: Invalid or expired OTP }
 */
router.post("/verify-otp", otpLimiter, validate(verifyOtpSchema), authController.verifyOtp);

/**
 * @openapi
 * /auth/resend-otp:
 *   post:
 *     tags: [Authentication]
 *     summary: Resend a registration OTP
 *     responses:
 *       200: { description: OTP queued }
 */
router.post("/resend-otp", otpLimiter, validate(resendOtpSchema), authController.resendOtp);

/**
 * @openapi
 * /auth/login-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Sign in with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken: { type: string }
 *                     refreshToken: { type: string }
 *                     user: { type: object }
 *       401: { description: Invalid credentials }
 *       403: { description: Email not verified or account disabled }
 */
router.post("/login-password", authLimiter, validate(loginSchema), authController.login);

/**
 * @openapi
 * /auth/login-otp:
 *   post:
 *     tags: [Authentication]
 *     summary: Request an email login OTP
 *     responses:
 *       200: { description: OTP queued }
 */
router.post("/login-otp", otpLimiter, validate(requestOtpSchema), authController.requestLoginOtp);

/**
 * @openapi
 * /auth/verify-login-otp:
 *   post:
 *     tags: [Authentication]
 *     summary: Sign in using an email OTP
 *     responses:
 *       200: { description: Login successful }
 *       400: { description: Invalid or expired OTP }
 */
router.post(
  "/verify-login-otp",
  otpLimiter,
  validate(verifyLoginOtpSchema),
  authController.verifyLoginOtp
);

/**
 * @openapi
 * /auth/refresh-token:
 *   post:
 *     tags: [Authentication]
 *     summary: Rotate the refresh token and issue a new access token
 *     responses:
 *       200: { description: Token refreshed }
 *       401: { description: Invalid refresh token }
 */
router.post("/refresh-token", validate(refreshTokenSchema), authController.refreshToken);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Revoke a refresh token
 *     responses:
 *       200: { description: Logged out }
 */
router.post("/logout", validate(logoutSchema), authController.logout);

/**
 * @openapi
 * /auth/logout-all:
 *   post:
 *     tags: [Authentication]
 *     summary: Revoke all active sessions for the current user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Logged out everywhere }
 */
router.post("/logout-all", authenticate, authController.logoutAll);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Request a password reset link
 *     responses:
 *       200: { description: Reset instructions queued }
 */
router.post(
  "/forgot-password",
  passwordResetLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Reset a password using a token from email
 *     responses:
 *       200: { description: Password reset }
 *       400: { description: Invalid or expired token }
 */
router.post(
  "/reset-password",
  passwordResetLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword
);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Authentication]
 *     summary: Get the authenticated user's profile
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Profile }
 *   patch:
 *     tags: [Authentication]
 *     summary: Update the authenticated user's profile
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Profile updated }
 */
router.get("/me", authenticate, authController.me);
router.patch(
  "/me",
  authenticate,
  validate(updateProfileSchema),
  authController.updateMe
);

/**
 * @openapi
 * /auth/change-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Change the current user's password
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Password changed }
 */
router.post(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword
);

/**
 * @openapi
 * /auth/sessions:
 *   get:
 *     tags: [Authentication]
 *     summary: List active sessions
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Session list }
 */
router.get("/sessions", authenticate, authController.listSessions);
router.delete(
  "/sessions/:sessionId",
  authenticate,
  validate(sessionIdParamsSchema, "params"),
  authController.revokeSession
);

export default router;
