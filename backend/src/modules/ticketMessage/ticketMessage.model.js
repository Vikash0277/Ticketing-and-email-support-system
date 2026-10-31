import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    storageKey: { type: String, required: true },
  },
  { _id: false }
);

const ticketMessageSchema = new mongoose.Schema(
  {
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    senderName: String,
    senderEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    senderRole: {
      type: String,
      enum: ["customer", "agent", "admin", "system"],
      required: true,
    },
    type: {
      type: String,
      enum: ["public", "internal"],
      default: "public",
      index: true,
    },
    body: {
      type: String,
      required: true,
      maxlength: 50000,
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    source: {
      type: String,
      enum: ["web", "email", "system", "api"],
      default: "web",
    },
    emailMessageId: {
      type: String,
      default: undefined,
    },
    inReplyTo: String,
    references: [String],
    receivedAt: Date,
  },
  { timestamps: true }
);

ticketMessageSchema.index({ ticketId: 1, createdAt: 1 });
ticketMessageSchema.index(
  { emailMessageId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      emailMessageId: { $type: "string" },
    },
  }
);

export default mongoose.model("TicketMessage", ticketMessageSchema);