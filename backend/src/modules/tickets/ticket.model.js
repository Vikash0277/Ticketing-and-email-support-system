
import mongoose from "mongoose";
import crypto from "node:crypto";

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

    // Customer who raised the ticket.
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

    // Support agent assigned to this ticket.
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
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
  }
);

// Generate a unique-looking, human-readable ticket number.
ticketSchema.pre("validate", function () {
  if (!this.ticketNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(4).toString("hex").toUpperCase();

    this.ticketNumber = `TKT-${timestamp}-${random}`;
  }
});

// Efficient ticket listing and filtering.
ticketSchema.index({
  requesterId: 1,
  createdAt: -1,
});

ticketSchema.index({
  assignedTo: 1,
  status: 1,
  updatedAt: -1,
});

ticketSchema.index({
  status: 1,
  priority: 1,
  createdAt: -1,
});

export default mongoose.model("Ticket", ticketSchema);
