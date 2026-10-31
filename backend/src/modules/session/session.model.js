import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
      select: false,
    },
    deviceName: String,
    userAgent: String,
    ipAddress: String,
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: Date,
    lastUsedAt: Date,
  },
  { timestamps: true }
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ userId: 1, revokedAt: 1 });

export default mongoose.model("Session", sessionSchema);