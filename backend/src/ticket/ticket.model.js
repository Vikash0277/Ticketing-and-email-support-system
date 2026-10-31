const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      maxlength: 20000,
    },
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    requesterEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      index: true,
    },
    status: {
      type: String,
      enum: [
        "open",
        "in_progress",
        "pending",
        "resolved",
        "closed",
        "reopened",
      ],
      default: "open",
      index: true,
    },
    source: {
      type: String,
      enum: ["web", "email", "api"],
      default: "web",
    },
    assignedAt: Date,
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    resolvedAt: Date,
    closedAt: Date,
    firstResponseAt: Date,
    slaDueAt: Date,
  },
  { timestamps: true }
);

ticketSchema.index({ requesterId: 1, status: 1, createdAt: -1 });
ticketSchema.index({ assignedTo: 1, status: 1, priority: -1 });
ticketSchema.index({ status: 1, lastMessageAt: -1 });
export default mongoose.model("Ticket", ticketSchema);