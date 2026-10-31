import mongoose from "mongoose";

const emailEventSchema = new mongoose.Schema(
  {
    providerEventId: {
      type: String,
      default: undefined,
    },
    providerMessageId: {
      type: String,
      default: undefined,
    },
    messageId: String,
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      default: null,
      index: true,
    },
    direction: {
      type: String,
      enum: ["inbound", "outbound"],
      required: true,
    },
    status: {
      type: String,
      enum: [
        "received",
        "queued",
        "processing",
        "processed",
        "sent",
        "delivered",
        "failed",
        "ignored",
      ],
      default: "received",
    },
    from: String,
    to: [String],
    subject: String,
    error: String,
    attempts: {
      type: Number,
      default: 0,
    },
    processedAt: Date,
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

emailEventSchema.index(
  { providerEventId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      providerEventId: { $type: "string" },
    },
  }
);

emailEventSchema.index({ messageId: 1 });
emailEventSchema.index({ status: 1, createdAt: 1 });

export default mongoose.model("EmailEvent", emailEventSchema);