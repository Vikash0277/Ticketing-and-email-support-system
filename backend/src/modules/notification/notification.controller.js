import asyncHandler from "../../utils/asyncHandler.js";
import { sendSuccess, sendPaginated } from "../../utils/response.js";
import * as notificationService from "./notification.service.js";

export const listNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.listNotifications(
    req.user,
    req.validatedQuery
  );

  return sendPaginated(
    res,
    "Notifications fetched successfully",
    result.notifications,
    { ...result.pagination, unreadCount: result.unreadCount }
  );
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const result = await notificationService.getUnreadCount(req.user);

  return sendSuccess(res, 200, "Unread count fetched successfully", result);
});

export const markRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markRead(
    req.user,
    req.validatedParams.id
  );

  return sendSuccess(res, 200, "Notification marked as read", notification);
});

export const markAllRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllRead(req.user);

  return sendSuccess(res, 200, "All notifications marked as read", result);
});
