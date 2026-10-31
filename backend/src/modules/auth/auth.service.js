import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import env from "../../config/env.js";
import logger from "../../config/logger.js";
import ApiError from "../../utils/ApiError.js";
import User from "../user/user.model.js";
import Session from "../session/session.model.js";
import {
  sendVerificationEmail,
  sendLoginOtpEmail,
  sendPasswordResetEmail,
  sendPhoneOtp,
} from "../email/email.service.js";

const OTP_TTL_MS = 10 * 60 * 1000;
const RESET_TTL_MS = 15 * 60 * 1000;
const SESSION_TTL_MS = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashSecret(value) {
  return crypto
    .createHmac("sha256", env.TOKEN_HASH_SECRET)
    .update(value)
    .digest("hex");
}

function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.ACCESS_TOKEN_TTL }
  );
}

export function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    jobTitle: user.jobTitle,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    isActive: user.isActive,
  };
}

async function createSession(user, context = {}) {
  const refreshToken = crypto.randomBytes(48).toString("hex");

  await Session.create({
    userId: user._id,
    refreshTokenHash: hashSecret(refreshToken),
    deviceName: context.deviceName,
    userAgent: context.userAgent,
    ipAddress: context.ipAddress,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    lastUsedAt: new Date(),
  });

  return {
    accessToken: generateAccessToken(user),
    refreshToken,
    user: publicUser(user),
  };
}

async function sendOtp(user, channel, otp, purpose) {
  if (channel === "email") {
    if (purpose === "registration") {
      await sendVerificationEmail({
        to: user.email,
        otp,
        name: user.name,
      });
      return;
    }

    await sendLoginOtpEmail({ to: user.email, otp, name: user.name });
    return;
  }

  await sendPhoneOtp();
}

export async function register({ name, email, password, phone }) {
  const existing = await User.findOne({
    $or: [{ email }, ...(phone ? [{ phone }] : [])],
  });

  if (existing) {
    if (existing.email !== email) {
      throw ApiError.conflict("An account with these details already exists");
    }

    if (existing.isEmailVerified) {
      throw ApiError.conflict("This email is already verified. Please sign in.");
    }

    const otp = generateOtp();
    existing.emailOtpHash = hashSecret(`${email}:${otp}`);
    existing.emailOtpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
    existing.otpAttempts = 0;
    await existing.save();

    await sendOtp(existing, "email", otp, "registration");

    return {
      userId: existing._id,
      email: existing.email,
      verificationRequired: true,
    };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const otp = generateOtp();

  const user = await User.create({
    name,
    email,
    phone,
    passwordHash,
    role: "customer",
    isEmailVerified: false,
    emailOtpHash: hashSecret(`${email}:${otp}`),
    emailOtpExpiresAt: new Date(Date.now() + OTP_TTL_MS),
    otpAttempts: 0,
  });

  try {
    await sendOtp(user, "email", otp, "registration");
  } catch (error) {
    logger.error("Registration email failed", {
      message: error.message,
      email,
    });
    await User.deleteOne({ _id: user._id });
    throw new ApiError(
      503,
      "Unable to send the verification email. Please try again."
    );
  }

  return {
    userId: user._id,
    email: user.email,
    verificationRequired: true,
  };
}

export async function verifyOtp({ email, phone, otp }) {
  const channel = email ? "email" : "phone";
  const destination = email || phone;

  const user = await User.findOne(email ? { email } : { phone }).select(
    "+emailOtpHash +phoneOtpHash"
  );

  if (!user) {
    throw ApiError.badRequest("Invalid or expired OTP");
  }

  const isVerified =
    channel === "email" ? user.isEmailVerified : user.isPhoneVerified;

  if (isVerified) {
    return { verified: true, alreadyVerified: true };
  }

  const storedHash =
    channel === "email" ? user.emailOtpHash : user.phoneOtpHash;
  const expiresAt =
    channel === "email" ? user.emailOtpExpiresAt : user.phoneOtpExpiresAt;

  const matches =
    storedHash &&
    expiresAt &&
    expiresAt > new Date() &&
    user.otpAttempts < MAX_OTP_ATTEMPTS &&
    storedHash === hashSecret(`${destination}:${otp}`);

  if (!matches) {
    user.otpAttempts = (user.otpAttempts || 0) + 1;
    await user.save();
    throw ApiError.badRequest("Invalid or expired OTP");
  }

  if (channel === "email") {
    user.isEmailVerified = true;
    user.emailOtpHash = undefined;
    user.emailOtpExpiresAt = undefined;
  } else {
    user.isPhoneVerified = true;
    user.phoneOtpHash = undefined;
    user.phoneOtpExpiresAt = undefined;
  }

  user.otpAttempts = 0;
  await user.save();

  return { verified: true };
}

export async function login({ email, password }, context = {}) {
  const user = await User.findOne({ email }).select("+passwordHash");

  if (!user || !user.passwordHash) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  if (!user.isActive) {
    throw ApiError.forbidden("This account has been disabled");
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new ApiError(
      423,
      "Account temporarily locked after too many failed attempts. Try again later."
    );
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);

  if (!validPassword) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

    if (user.failedLoginAttempts >= 5) {
      user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      user.failedLoginAttempts = 0;
    }

    await user.save();
    throw ApiError.unauthorized("Invalid email or password");
  }

  if (!user.isEmailVerified) {
    throw ApiError.forbidden("Please verify your email before signing in");
  }

  user.failedLoginAttempts = 0;
  user.lockedUntil = undefined;
  user.lastLoginAt = new Date();
  await user.save();

  return createSession(user, context);
}

export async function requestLoginOtp({ email, phone }) {
  const channel = email ? "email" : "phone";
  const user = await User.findOne(email ? { email } : { phone });

  if (!user || !user.isActive) return { accepted: true };

  const verified =
    channel === "email" ? user.isEmailVerified : user.isPhoneVerified;

  if (!verified) return { accepted: true };

  const otp = generateOtp();
  const destination = email || phone;

  if (channel === "email") {
    user.emailOtpHash = hashSecret(`${destination}:${otp}`);
    user.emailOtpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
  } else {
    user.phoneOtpHash = hashSecret(`${destination}:${otp}`);
    user.phoneOtpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
  }

  user.otpAttempts = 0;
  await user.save();

  try {
    await sendOtp(user, channel, otp, "login");
  } catch (error) {
    logger.error("Login OTP delivery failed", {
      message: error.message,
      channel,
    });
    throw new ApiError(503, "Unable to send the login code. Try again later.");
  }

  return { accepted: true };
}

export async function verifyLoginOtp({ email, phone, otp }, context = {}) {
  const channel = email ? "email" : "phone";
  const destination = email || phone;

  const user = await User.findOne(email ? { email } : { phone }).select(
    "+emailOtpHash +phoneOtpHash"
  );

  if (!user || !user.isActive) {
    throw ApiError.badRequest("Invalid or expired OTP");
  }

  const verified =
    channel === "email" ? user.isEmailVerified : user.isPhoneVerified;
  const storedHash =
    channel === "email" ? user.emailOtpHash : user.phoneOtpHash;
  const expiresAt =
    channel === "email" ? user.emailOtpExpiresAt : user.phoneOtpExpiresAt;

  const matches =
    verified &&
    storedHash &&
    expiresAt &&
    expiresAt > new Date() &&
    user.otpAttempts < MAX_OTP_ATTEMPTS &&
    storedHash === hashSecret(`${destination}:${otp}`);

  if (!matches) {
    user.otpAttempts = (user.otpAttempts || 0) + 1;
    await user.save();
    throw ApiError.badRequest("Invalid or expired OTP");
  }

  if (channel === "email") {
    user.emailOtpHash = undefined;
    user.emailOtpExpiresAt = undefined;
  } else {
    user.phoneOtpHash = undefined;
    user.phoneOtpExpiresAt = undefined;
  }

  user.otpAttempts = 0;
  user.lastLoginAt = new Date();
  await user.save();

  return createSession(user, context);
}

export async function logout(refreshToken) {
  if (refreshToken) {
    await Session.updateOne(
      { refreshTokenHash: hashSecret(refreshToken), revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
  }

  return { loggedOut: true };
}

export async function logoutAll(userId) {
  await Session.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );

  return { loggedOut: true };
}

export async function forgotPassword(email) {
  const user = await User.findOne({ email });

  if (!user || !user.isActive) {
    return { accepted: true };
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  user.passwordResetTokenHash = hashSecret(resetToken);
  user.passwordResetExpiresAt = new Date(Date.now() + RESET_TTL_MS);
  await user.save();

  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  try {
    await sendPasswordResetEmail({
      to: user.email,
      resetUrl,
      name: user.name,
    });
  } catch (error) {
    logger.error("Password reset email failed", {
      message: error.message,
      email,
    });
  }

  return {
    accepted: true,
    // Only expose the link locally when the provider is not configured.
    ...(env.isDevelopment && !env.email.enabled ? { resetUrl } : {}),
  };
}

export async function resetPassword({ token, password }) {
  const user = await User.findOne({
    passwordResetTokenHash: hashSecret(token),
    passwordResetExpiresAt: { $gt: new Date() },
  }).select("+passwordResetTokenHash");

  if (!user) {
    throw ApiError.badRequest("Invalid or expired password reset token");
  }

  user.passwordHash = await bcrypt.hash(password, 12);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  await user.save();

  await Session.updateMany(
    { userId: user._id, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );

  return { passwordReset: true };
}

export async function changePassword(userId, { currentPassword, password }) {
  const user = await User.findById(userId).select("+passwordHash");

  if (!user) throw ApiError.notFound("User not found");

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);

  if (!valid) {
    throw ApiError.badRequest("Current password is incorrect");
  }

  user.passwordHash = await bcrypt.hash(password, 12);
  await user.save();

  await Session.updateMany(
    { userId: user._id, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );

  return { passwordChanged: true };
}

export async function refreshToken(refreshToken) {
  if (!refreshToken) {
    throw ApiError.unauthorized("Refresh token is required");
  }

  const session = await Session.findOne({
    refreshTokenHash: hashSecret(refreshToken),
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  }).select("+refreshTokenHash");

  if (!session) {
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }

  const user = await User.findById(session.userId);

  if (!user || !user.isActive) {
    session.revokedAt = new Date();
    await session.save();
    throw ApiError.unauthorized("User account is unavailable");
  }

  const newRefreshToken = crypto.randomBytes(48).toString("hex");
  session.refreshTokenHash = hashSecret(newRefreshToken);
  session.lastUsedAt = new Date();
  session.expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await session.save();

  return {
    accessToken: generateAccessToken(user),
    refreshToken: newRefreshToken,
    user: publicUser(user),
  };
}

export async function resendOtp({ email, phone }) {
  const channel = email ? "email" : "phone";
  const user = await User.findOne(email ? { email } : { phone }).select(
    "+emailOtpHash +phoneOtpHash"
  );

  if (!user || !user.isActive) {
    return {
      accepted: true,
      message: "If the account is eligible, an OTP will be sent.",
    };
  }

  const isVerified =
    channel === "email" ? user.isEmailVerified : user.isPhoneVerified;

  if (isVerified) {
    return {
      accepted: true,
      message: "If the account is eligible, an OTP will be sent.",
    };
  }

  if ((user.otpAttempts ?? 0) >= MAX_OTP_ATTEMPTS) {
    throw ApiError.tooManyRequests(
      "Too many OTP attempts. Please try again later."
    );
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  if (channel === "email") {
    user.emailOtpHash = hashSecret(`${user.email}:${otp}`);
    user.emailOtpExpiresAt = expiresAt;
  } else {
    if (!user.phone) {
      return {
        accepted: true,
        message: "If the account is eligible, an OTP will be sent.",
      };
    }

    user.phoneOtpHash = hashSecret(`${user.phone}:${otp}`);
    user.phoneOtpExpiresAt = expiresAt;
  }

  user.otpAttempts = 0;
  await user.save();

  try {
    await sendOtp(user, channel, otp, "registration");
  } catch (error) {
    logger.error("Failed to resend verification OTP", {
      userId: user._id.toString(),
      channel,
      message: error.message,
    });

    throw new ApiError(503, "Unable to send the verification code.");
  }

  return {
    accepted: true,
    message: "If the account is eligible, an OTP will be sent.",
  };
}

export async function getProfile(userId) {
  const user = await User.findById(userId);

  if (!user) throw ApiError.notFound("User not found");

  return publicUser(user);
}

export async function updateProfile(userId, data) {
  const user = await User.findById(userId);

  if (!user) throw ApiError.notFound("User not found");

  for (const field of ["name", "avatarUrl", "jobTitle"]) {
    if (data[field] !== undefined) {
      user[field] = data[field];
    }
  }

  if (data.phone !== undefined) {
    user.phone = data.phone ? data.phone : undefined;
  }

  await user.save();

  return publicUser(user);
}

export async function listSessions(userId) {
  const sessions = await Session.find({ userId, revokedAt: null })
    .sort({ lastUsedAt: -1 })
    .lean();

  return sessions.map((session) => ({
    id: session._id,
    deviceName: session.deviceName,
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
    lastUsedAt: session.lastUsedAt,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
  }));
}

export async function revokeSession(userId, sessionId) {
  if (!mongoose.isValidObjectId(sessionId)) {
    throw ApiError.badRequest("Invalid session ID");
  }

  await Session.updateOne(
    { _id: sessionId, userId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );

  return { revoked: true };
}
