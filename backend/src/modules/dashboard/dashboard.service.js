import mongoose from "mongoose";

import ApiError from "../../utils/ApiError.js";
import Ticket from "../tickets/ticket.model.js";
import User from "../user/user.model.js";
import Category from "../categories/category.model.js";

const POPULATE = [
  { path: "categoryId", select: "name" },
  { path: "assignedTo", select: "name email avatarUrl" },
  { path: "requesterId", select: "name email avatarUrl" },
];

function getUserId(user) {
  const id = user?._id ?? user?.id;

  if (!id || !mongoose.isValidObjectId(id)) {
    throw ApiError.unauthorized("Invalid authenticated user");
  }

  return new mongoose.Types.ObjectId(id);
}

function isStaff(user) {
  return ["admin", "agent"].includes(String(user?.role || "").toLowerCase());
}

function scopeFor(user, userId) {
  return isStaff(user) ? {} : { requesterId: userId };
}

function emptySummary() {
  return {
    total: 0,
    open: 0,
    inProgress: 0,
    pending: 0,
    resolved: 0,
    closed: 0,
    reopened: 0,
    unassigned: 0,
    overdue: 0,
    assignedToMe: 0,
  };
}

async function ticketSummary(scope, userId) {
  const [summary] = await Ticket.aggregate([
    { $match: scope },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        open: { $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] } },
        inProgress: {
          $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] },
        },
        pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
        resolved: {
          $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] },
        },
        closed: { $sum: { $cond: [{ $eq: ["$status", "closed"] }, 1, 0] } },
        reopened: {
          $sum: { $cond: [{ $eq: ["$status", "reopened"] }, 1, 0] },
        },
        unassigned: {
          $sum: {
            $cond: [{ $eq: [{ $ifNull: ["$assignedTo", null] }, null] }, 1, 0],
          },
        },
        overdue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $lt: ["$dueAt", new Date()] },
                  {
                    $not: [
                      { $in: ["$status", ["resolved", "closed"]] },
                    ],
                  },
                ],
              },
              1,
              0,
            ],
          },
        },
        assignedToMe: {
          $sum: { $cond: [{ $eq: ["$assignedTo", userId] }, 1, 0] },
        },
      },
    },
    { $project: { _id: 0 } },
  ]);

  return { ...emptySummary(), ...(summary || {}) };
}

async function trendSeries(scope, days = 14) {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (days - 1));

  const rows = await Ticket.aggregate([
    { $match: { ...scope, createdAt: { $gte: since } } },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
        created: { $sum: 1 },
        resolved: {
          $sum: { $cond: [{ $ne: ["$resolvedAt", null] }, 1, 0] },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const map = new Map(rows.map((row) => [row._id, row]));
  const series = [];

  for (let index = 0; index < days; index += 1) {
    const date = new Date(since);
    date.setUTCDate(since.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    const row = map.get(key);

    series.push({
      date: key,
      created: row?.created ?? 0,
      resolved: row?.resolved ?? 0,
    });
  }

  return series;
}

async function staffExtras(user) {
  const userId = getUserId(user);

  const [recentTickets, categories, agentWorkload] = await Promise.all([
    Ticket.find({})
      .populate(POPULATE)
      .sort({ updatedAt: -1 })
      .limit(8)
      .lean({ virtuals: true }),

    Category.find({ isActive: true }).select("name").sort({ name: 1 }).lean(),

    Ticket.aggregate([
      { $match: { assignedTo: { $ne: null } } },
      {
        $group: {
          _id: "$assignedTo",
          total: { $sum: 1 },
          open: {
            $sum: {
              $cond: [
                {
                  $in: ["$status", ["open", "in_progress", "pending", "reopened"]],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "agent",
        },
      },
      { $unwind: { path: "$agent", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          agentId: "$_id",
          name: { $ifNull: ["$agent.name", "Unknown agent"] },
          email: "$agent.email",
          total: 1,
          open: 1,
        },
      },
    ]),
  ]);

  const extras = {
    recentTickets,
    categories,
    agentWorkload,
    myTickets: await Ticket.countDocuments({
      assignedTo: userId,
      status: { $nin: ["resolved", "closed"] },
    }),
  };

  if (user.role === "admin") {
    const [totalUsers, totalAgents, totalCustomers, activeUsers] =
      await Promise.all([
        User.countDocuments({}),
        User.countDocuments({ role: "agent" }),
        User.countDocuments({ role: "customer" }),
        User.countDocuments({ isActive: true }),
      ]);

    extras.users = { totalUsers, totalAgents, totalCustomers, activeUsers };
  }

  return extras;
}

async function customerExtras(user) {
  const userId = getUserId(user);

  const recentTickets = await Ticket.find({ requesterId: userId })
    .populate(POPULATE)
    .sort({ updatedAt: -1 })
    .limit(8)
    .lean({ virtuals: true });

  const categories = await Category.find({ isActive: true })
    .select("name description")
    .sort({ name: 1 })
    .lean();

  return { recentTickets, categories };
}

export async function getDashboardSummary(user) {
  const userId = getUserId(user);
  const scope = scopeFor(user, userId);
  const staff = isStaff(user);

  const [summary, trends, extras] = await Promise.all([
    ticketSummary(scope, userId),
    trendSeries(scope),
    staff ? staffExtras(user) : customerExtras(user),
  ]);

  return {
    role: user.role,
    summary,
    trends,
    ...extras,
  };
}

export default getDashboardSummary;
