import asyncHandler from "../../utils/asyncHandler.js";
import { sendSuccess, sendPaginated } from "../../utils/response.js";
import * as userService from "./user.service.js";

export const listUsers = asyncHandler(async (req, res) => {
  const result = await userService.listUsers(req.validatedQuery, req.user);

  return sendPaginated(
    res,
    "Users fetched successfully",
    result.users,
    result.pagination
  );
});

export const listAgents = asyncHandler(async (req, res) => {
  const agents = await userService.listAgents(req.user);

  return sendSuccess(res, 200, "Agents fetched successfully", agents);
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await userService.getUser(req.validatedParams.id, req.user);

  return sendSuccess(res, 200, "User fetched successfully", user);
});

export const createUser = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.validatedBody, req.user);

  return sendSuccess(res, 201, "User created successfully", user);
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(
    req.validatedParams.id,
    req.validatedBody,
    req.user
  );

  return sendSuccess(res, 200, "User updated successfully", user);
});

export const updateUserStatus = asyncHandler(async (req, res) => {
  const user = await userService.updateUserStatus(
    req.validatedParams.id,
    req.validatedBody.isActive,
    req.user
  );

  return sendSuccess(res, 200, "User status updated successfully", user);
});

export const updateUserRole = asyncHandler(async (req, res) => {
  const user = await userService.updateUserRole(
    req.validatedParams.id,
    req.validatedBody.role,
    req.user
  );

  return sendSuccess(res, 200, "User role updated successfully", user);
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await userService.deleteUser(req.validatedParams.id, req.user);

  return sendSuccess(res, 200, "User deactivated successfully", user);
});

export const getUserStats = asyncHandler(async (req, res) => {
  const stats = await userService.getUserStats(req.user);

  return sendSuccess(res, 200, "User statistics fetched successfully", stats);
});
