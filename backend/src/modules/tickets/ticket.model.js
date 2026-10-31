import mongoose from "mongoose";

import Counter from "./counter.model.js";

const SLA_HOURS = {
  urgent: 4,
  high: 8,
  medium: 24,
  low: 72,
};

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      unique: true,
      index: true,
      immutable: true,
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
      trim: true,
      maxlength: 50000,
    },

    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    requesterName: {
      type: String,
      trim: true,
      maxlength: 150,
    },

    requesterEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    assignedAt: {
      type: Date,
      default: null,
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
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
      index: true,
    },

    tags: {
      type: [String],
      default: [],
    },

    lastMessageAt: {
      type: Date,
      default: null,
    },

    lastReplyBy: {
      type: String,
      enum: ["customer", "agent", "admin", "system", null],
      default: null,
    },

    firstResponseAt: {
      type: Date,
      default: null,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },

    closedAt: {
      type: Date,
      default: null,
    },

    dueAt: {
      type: Date,
      default: null,
      index: true,
    },

    emailReplyTokenHash: {
      type: String,
      select: false,
      unique: true,
      sparse: true,
    },

    emailThreadMessageId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ticketSchema.virtual("isOverdue").get(function isOverdue() {
  if (!this.dueAt) return false;
  if (["resolved", "closed"].includes(this.status)) return false;
  return this.dueAt.getTime() < Date.now();
});

// Sequential, human-readable ticket numbers: TKT-2026-000001
ticketSchema.pre("validate", async function assignTicketNumber() {
  if (this.ticketNumber) return;

  const year = new Date().getFullYear();

  const counter = await Counter.findOneAndUpdate(
    { _id: `ticket-${year}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  this.ticketNumber = `TKT-${year}-${String(counter.seq).padStart(6, "0")}`;

  if (!this.dueAt) {
    const hours = SLA_HOURS[this.priority] ?? SLA_HOURS.medium;
    this.dueAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  }
});

ticketSchema.index({ requesterId: 1, createdAt: -1 });
ticketSchema.index({ assignedTo: 1, status: 1, updatedAt: -1 });
ticketSchema.index({ status: 1, priority: 1, createdAt: -1 });
ticketSchema.index({ subject: "text", description: "text", ticketNumber: "text" });

export default mongoose.model("Ticket", ticketSchema);
