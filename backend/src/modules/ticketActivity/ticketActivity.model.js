import mongoose from "mongoose";

const ticketActivitySchema = new mongoose.Schema(
  {
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      required: true,
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "created",
        "assigned",
        "reassigned",
        "status_changed",
        "priority_changed",
        "category_changed",
        "replied",
        "internal_note_added",
        "resolved",
        "closed",
        "reopened",
      ],
    },
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

ticketActivitySchema.index({ ticketId: 1, createdAt: -1 });

export default mongoose.model("TicketActivity", ticketActivitySchema);