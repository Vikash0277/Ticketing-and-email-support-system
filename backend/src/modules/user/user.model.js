import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    passwordHash: {
      type: String,
      select: false,
    },
    role: {
      type: String,
      enum: ["customer", "agent", "admin"],
      default: "customer",
      required: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    emailOtpHash: {
      type: String,
      select: false,
    },
    emailOtpExpiresAt: Date,
    phoneOtpHash: {
      type: String,
      select: false,
    },
    phoneOtpExpiresAt: Date,
    otpAttempts: {
      type: Number,
      default: 0,
    },
    passwordResetTokenHash: {
      type: String,
      select: false,
    },
    passwordResetExpiresAt: Date,
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockedUntil: Date,
    lastLoginAt: Date,
  },
  { timestamps: true }
);

userSchema.index({ phone: 1 }, { unique: true, sparse: true });

export default mongoose.model("User", userSchema);