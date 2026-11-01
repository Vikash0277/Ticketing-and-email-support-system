import mongoose from "mongoose";

import ApiError from "../../utils/ApiError.js";
import { buildPagination } from "../../utils/pagination.js";
import Notification from "./notification.model.js";

function getUserId(user) {
  return user?._id ?? user?.id ?? null;
}

export async function createNotification({
  userId,
  ticketId = null,
  type,
  title,
  message,
  metadata = {},
}) {
  if (!userId || !type || !title || !message) return null;

  try {
    return await Notification.create({
      userId,
      ticketId,
      type,
      title,
      message,
      metadata,
    });
  } catch {
    // Notifications are a convenience; never break the main workflow.
    return null;
  }
}

export async function listNotifications(user, query) {
  const userId = getUserId(user);

  if (!userId) throw ApiError.unauthorized();

  const { page, limit, unreadOnly } = query;

  const filter = { userId };

  if (unreadOnly) filter.isRead = false;

  const skip = (page - 1) * limit;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId, isRead: false }),
  ]);

  return {
    notifications,
    unreadCount,
    pagination: buildPagination(page, limit, total),
  };
}

export async function getUnreadCount(user) {
  const userId = getUserId(user);

  if (!userId) throw ApiError.unauthorized();

  return { unreadCount: await Notification.countDocuments({ userId, isRead: false }) };
}

export async function markRead(user, notificationId) {
  const userId = getUserId(user);

  if (!userId) throw ApiError.unauthorized();

  if (!mongoose.isValidObjectId(notificationId)) {
    throw ApiError.badRequest("Invalid notification ID");
  }

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { $set: { isRead: true, readAt: new Date() } },
    { returnDocument: "after" }
  );

  if (!notification) throw ApiError.notFound("Notification not found");

  return notification;
}

export async function markAllRead(user) {
  const userId = getUserId(user);

  if (!userId) throw ApiError.unauthorized();

  const result = await Notification.updateMany(
    { userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );

  return { updated: result.modifiedCount ?? 0 };
}
