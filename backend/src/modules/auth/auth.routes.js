
import { Router } from "express";

import * as authController from "./auth.controller.js";
import { validate } from "../../middleware/validate.middleware.js";

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
} from "./auth.validation.js";

const router = Router();


/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Register a customer
 *     description: Creates a customer account and sends an email verification OTP.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: Vikash
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *               phone:
 *                 type: string
 *                 example: "+919876543210"
 *     responses:
 *       "201":
 *         description: Registration successful
 *       "400":
 *         description: Validation failed
 *       "409":
 *         description: Account already exists
 *       "503":
 *         description: Verification email could not be sent
 */
// Registration and email/phone verification
router.post("/register", validate(registerSchema), authController.register);

router.post("/verify-otp",validate(verifyOtpSchema), authController.verifyOtp);

router.post("/resend-otp", validate(resendOtpSchema), authController.resendOtp);

// Password-based login
router.post("/login-password", validate(loginSchema), authController.login);

// OTP-based login
router.post("/login-otp", validate(requestOtpSchema), authController.requestLoginOtp);

router.post("/verify-login-otp", validate(verifyLoginOtpSchema), authController.verifyLoginOtp);

// Access-token renewal and logout
router.post("/refresh-token", validate(refreshTokenSchema), authController.refreshToken);

router.post("/logout", validate(logoutSchema), authController.logout);

// Password recovery
router.post("/forgot-password", validate(forgotPasswordSchema), authController.forgotPassword);

router.post("/reset-password",validate(resetPasswordSchema),authController.resetPassword);

export default router;
