import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

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
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashSecret(value) {
  return crypto
    .createHmac("sha256", process.env.TOKEN_HASH_SECRET)
    .update(value)
    .digest("hex");
}

function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: "15m" }
  );
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };
}

async function createSession(user) {
  const refreshToken = crypto.randomBytes(48).toString("hex");

  await Session.create({
    userId: user._id,
    refreshTokenHash: hashSecret(refreshToken),
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
      await sendVerificationEmail(
        user.email,
        "Verify your email address",
        `Your verification OTP is ${otp}. It expires in 10 minutes.`
      );
    } else {
      await sendLoginOtpEmail(
        user.email,
        "Your login OTP",
        `Your login OTP is ${otp}. It expires in 10 minutes.`
      );
    }

    return;
  }

  await sendPhoneOtp(
    user.phone,
    "Your verification OTP",
    `Your OTP is ${otp}. It expires in 10 minutes.`
  );
}


// 1. Register a customer and send a verification OTP.
export async function register({ name, email, password, phone }) {
  const existing = await User.findOne({
    $or: [
      { email },
      ...(phone ? [{ phone }] : []),
    ],
  });

  if (existing) {
    if (
      existing.email !== email ||
      (phone && existing.phone !== phone)
    ) {
      throw createError("An account with these details already exists", 409);
    }

    if (existing.isEmailVerified) {
      throw createError(
        "This email is already verified. Please sign in.",
        409
      );
    }

    const otp = generateOtp();
    existing.emailOtpHash = hashSecret(`${email}:${otp}`);
    existing.emailOtpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
    existing.otpAttempts = 0;
    await existing.save();

    try {
      await sendOtp(existing, "email", otp, "registration");
    } catch (error) {
      console.error("Registration email failed:", error.message);
      throw createError("Unable to send verification email", 503);
    }

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
    console.error("Registration email failed:", error.message);
    await User.deleteOne({ _id: user._id });
    throw createError("Unable to send verification email", 503);
  }

  return {
    userId: user._id,
    email: user.email,
    verificationRequired: true,
  };
}

// 2. Verify registration OTP.
export async function verifyOtp({ email, phone, otp }) {
  const channel = email ? "email" : "phone";
  const destination = email || phone;

  const user = await User.findOne(
    email ? { email } : { phone }
  ).select("+emailOtpHash +phoneOtpHash");

  if (!user) {
    throw createError("Invalid or expired OTP", 400);
  }

  const isVerified =
    channel === "email" ? user.isEmailVerified : user.isPhoneVerified;

  if (isVerified) {
    return { verified: true, alreadyVerified: true };
  }

  const storedHash =
    channel === "email" ? user.emailOtpHash : user.phoneOtpHash;
  const expiresAt =
    channel === "email"
      ? user.emailOtpExpiresAt
      : user.phoneOtpExpiresAt;

  if (
    !storedHash ||
    !expiresAt ||
    expiresAt <= new Date() ||
    user.otpAttempts >= MAX_OTP_ATTEMPTS ||
    storedHash !== hashSecret(`${destination}:${otp}`)
  ) {
    user.otpAttempts = (user.otpAttempts || 0) + 1;
    await user.save();
    throw createError("Invalid or expired OTP", 400);
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

// 3. Login using email and password.
export async function login({ email, password }) {
  const user = await User.findOne({ email }).select("+passwordHash");

  if (!user || !user.passwordHash) {
    throw createError("Invalid email or password", 401);
  }

  if (!user.isActive) {
    throw createError("Account is disabled", 403);
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw createError("Account temporarily locked", 423);
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);

  if (!validPassword) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

    if (user.failedLoginAttempts >= 5) {
      user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      user.failedLoginAttempts = 0;
    }

    await user.save();
    throw createError("Invalid email or password", 401);
  }

  if (!user.isEmailVerified) {
    throw createError("Please verify your email first", 403);
  }

  user.failedLoginAttempts = 0;
  user.lockedUntil = undefined;
  user.lastLoginAt = new Date();
  await user.save();

  return createSession(user);
}

// 4. Request login OTP.
export async function requestLoginOtp({ email, phone }) {
  const channel = email ? "email" : "phone";
  const user = await User.findOne(email ? { email } : { phone });

  // Generic response helps prevent account enumeration.
  if (!user || !user.isActive) return { accepted: true };

  if (
    channel === "email" ? !user.isEmailVerified : !user.isPhoneVerified
  ) {
    return { accepted: true };
  }

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
  } catch {
    throw createError("Unable to send OTP", 503);
  }

  return { accepted: true };
}

// 5. Verify login OTP and create a session.
export async function verifyLoginOtp({ email, phone, otp }) {
  const channel = email ? "email" : "phone";
  const destination = email || phone;

  const user = await User.findOne(email ? { email } : { phone })
    .select("+emailOtpHash +phoneOtpHash");

  if (!user || !user.isActive) {
    throw createError("Invalid or expired OTP", 400);
  }

  const verified =
    channel === "email" ? user.isEmailVerified : user.isPhoneVerified;
  const storedHash =
    channel === "email" ? user.emailOtpHash : user.phoneOtpHash;
  const expiresAt =
    channel === "email"
      ? user.emailOtpExpiresAt
      : user.phoneOtpExpiresAt;

  if (
    !verified ||
    !storedHash ||
    !expiresAt ||
    expiresAt <= new Date() ||
    user.otpAttempts >= MAX_OTP_ATTEMPTS ||
    storedHash !== hashSecret(`${destination}:${otp}`)
  ) {
    user.otpAttempts = (user.otpAttempts || 0) + 1;
    await user.save();
    throw createError("Invalid or expired OTP", 400);
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

  return createSession(user);
}

export async function logout(refreshToken) {
  if (refreshToken) {
    await Session.updateOne(
      {
        refreshTokenHash: hashSecret(refreshToken),
        revokedAt: null,
      },
      { $set: { revokedAt: new Date() } }
    );
  }

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

  await sendPasswordResetEmail(
    user.email,
    "Reset your password",
    `Use this password reset token to reset your password: ${resetToken}. It expires in 15 minutes.`
  );

  return { accepted: true };
}

export async function resetPassword({ token, password }) {
  const user = await User.findOne({
    passwordResetTokenHash: hashSecret(token),
    passwordResetExpiresAt: { $gt: new Date() },
  }).select("+passwordResetTokenHash");

  if (!user) {
    throw createError("Invalid or expired password reset token", 400);
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

export async function refreshToken(refreshToken) {
  if (!refreshToken) {
    throw createError("Refresh token is required", 401);
  }

  const tokenHash = hashSecret(refreshToken);
  const session = await Session.findOne({
    refreshTokenHash: tokenHash,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  }).select("+refreshTokenHash");

  if (!session) {
    throw createError("Invalid or expired refresh token", 401);
  }

  const user = await User.findById(session.userId);

  if (!user || !user.isActive) {
    session.revokedAt = new Date();
    await session.save();
    throw createError("User account is unavailable", 401);
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
  const query = email ? { email } : { phone };

  const user = await User.findOne(query).select(
    "+emailOtpHash +phoneOtpHash"
  );

  // Use a generic response to avoid revealing account existence.
  if (!user || !user.isActive) {
    return {
      accepted: true,
      message: "If the account is eligible, an OTP will be sent.",
    };
  }

  // This endpoint resends registration verification OTPs.
  const isVerified =
    channel === "email"
      ? user.isEmailVerified
      : user.isPhoneVerified;

  if (isVerified) {
    return {
      accepted: true,
      message: "If the account is eligible, an OTP will be sent.",
    };
  }

  // Prevent unlimited OTP attempts.
  if ((user.otpAttempts ?? 0) >= MAX_OTP_ATTEMPTS) {
    throw createError(
      "Too many OTP attempts. Please try again later.",
      429
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
    // Do not expose provider errors to the client.
    logger.error("Failed to resend verification OTP", {
      userId: user._id.toString(),
      channel,
      error: error.message,
    });

    throw createError("Unable to send verification OTP", 503);
  }

  return {
    accepted: true,
    message: "If the account is eligible, an OTP will be sent.",
  };
}
