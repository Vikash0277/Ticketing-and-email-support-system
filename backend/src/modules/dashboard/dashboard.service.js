import mongoose from "mongoose";
import Ticket from "../tickets/ticket.model.js";

function getUserId(user) {
  const id = user?._id ?? user?.id;

  if (!id || !mongoose.isValidObjectId(id)) {
    throw Object.assign(new Error("Invalid authenticated user"), {
      statusCode: 401,
    });
  }

  return new mongoose.Types.ObjectId(id);
}

function isStaff(user) {
  return ["admin", "agent"].includes(
    String(user?.role || "").toLowerCase()
  );
}

export async function getDashboardSummary(user) {
  if (!isStaff(user)) {
    throw Object.assign(
      new Error("You are not authorized to access the staff dashboard"),
      { statusCode: 403 }
    );
  }

  const currentUserId = getUserId(user);

  const [summary] = await Ticket.aggregate([
    {
      $group: {
        _id: null,

        totalTickets: {
          $sum: 1,
        },

        openTickets: {
          $sum: {
            $cond: [{ $eq: ["$status", "open"] }, 1, 0],
          },
        },

        pendingInProgressTickets: {
          $sum: {
            $cond: [
              {
                $in: ["$status", ["pending", "in_progress"]],
              },
              1,
              0,
            ],
          },
        },

        resolvedTickets: {
          $sum: {
            $cond: [{ $eq: ["$status", "resolved"] }, 1, 0],
          },
        },

        closedTickets: {
          $sum: {
            $cond: [{ $eq: ["$status", "closed"] }, 1, 0],
          },
        },

        reopenedTickets: {
          $sum: {
            $cond: [{ $eq: ["$status", "reopened"] }, 1, 0],
          },
        },

        unassignedTickets: {
          $sum: {
            $cond: [
              {
                $eq: [
                  { $ifNull: ["$assignedTo", null] },
                  null,
                ],
              },
              1,
              0,
            ],
          },
        },

        assignedToCurrentAgent: {
          $sum: {
            $cond: [
              { $eq: ["$assignedTo", currentUserId] },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalTickets: 1,
        openTickets: 1,
        pendingInProgressTickets: 1,
        resolvedTickets: 1,
        closedTickets: 1,
        reopenedTickets: 1,
        unassignedTickets: 1,
        assignedToCurrentAgent: 1,
      },
    },
  ]);

  return (
    summary ?? {
      totalTickets: 0,
      openTickets: 0,
      pendingInProgressTickets: 0,
      resolvedTickets: 0,
      closedTickets: 0,
      reopenedTickets: 0,
      unassignedTickets: 0,
      assignedToCurrentAgent: 0,
    }
  );
}