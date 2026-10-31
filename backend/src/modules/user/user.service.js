import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import ApiError from "../../utils/ApiError.js";
import { buildPagination } from "../../utils/pagination.js";
import { escapeRegex } from "../../utils/sanitize.js";
import User from "./user.model.js";
import Session from "../session/session.model.js";

const STAFF_ROLES = ["agent", "admin"];

function isAdmin(user) {
  return user?.role === "admin";
}

function isStaff(user) {
  return STAFF_ROLES.includes(user?.role);
}

function assertAdmin(user) {
  if (!isAdmin(user)) {
    throw ApiError.forbidden("Only administrators can manage users");
  }
}

export function publicUser(user) {
  return {
    id: user._id,
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    jobTitle: user.jobTitle,
    role: user.role,
    isActive: user.isActive,
    isEmailVerified: user.isEmailVerified,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

export async function listUsers(query, currentUser) {
  if (!isStaff(currentUser)) {
    throw ApiError.forbidden("Only support staff can list users");
  }

  const { page, limit, search, role, isActive } = query;

  const filter = {};

  // Agents may only look up their colleagues (for assignment dropdowns).
  if (!isAdmin(currentUser)) {
    filter.role = { $in: STAFF_ROLES };
    filter.isActive = true;
  } else {
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive;
  }

  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ name: regex }, { email: regex }];
  }

  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  return {
    users: users.map((user) => ({
      id: user._id,
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      jobTitle: user.jobTitle,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    })),
    pagination: buildPagination(page, limit, total),
  };
}

export async function listAgents(currentUser) {
  if (!isStaff(currentUser)) {
    throw ApiError.forbidden("Only support staff can list agents");
  }

  const agents = await User.find({
    role: { $in: STAFF_ROLES },
    isActive: true,
  })
    .select("name email avatarUrl jobTitle role")
    .sort({ name: 1 })
    .lean();

  return agents.map((agent) => ({
    id: agent._id,
    _id: agent._id,
    name: agent.name,
    email: agent.email,
    avatarUrl: agent.avatarUrl,
    jobTitle: agent.jobTitle,
    role: agent.role,
  }));
}

export async function getUser(userId, currentUser) {
  if (!isStaff(currentUser)) {
    throw ApiError.forbidden("Only support staff can view users");
  }

  if (!mongoose.isValidObjectId(userId)) {
    throw ApiError.badRequest("Invalid user ID");
  }

  const user = await User.findById(userId);

  if (!user) throw ApiError.notFound("User not found");

  return publicUser(user);
}

export async function createUser(data, currentUser) {
  assertAdmin(currentUser);

  const existing = await User.findOne({ email: data.email });

  if (existing) {
    throw ApiError.conflict("An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await User.create({
    name: data.name,
    email: data.email,
    phone: data.phone ?? undefined,
    jobTitle: data.jobTitle ?? null,
    role: data.role ?? "customer",
    passwordHash,
    // Admin-created accounts are trusted and can sign in immediately.
    isEmailVerified: true,
    isActive: true,
  });

  return publicUser(user);
}

export async function updateUser(userId, data, currentUser) {
  assertAdmin(currentUser);

  if (!mongoose.isValidObjectId(userId)) {
    throw ApiError.badRequest("Invalid user ID");
  }

  const user = await User.findById(userId);

  if (!user) throw ApiError.notFound("User not found");

  const isSelf = String(user._id) === String(currentUser._id ?? currentUser.id);

  if (data.email && data.email !== user.email) {
    const duplicate = await User.findOne({
      _id: { $ne: user._id },
      email: data.email,
    });

    if (duplicate) {
      throw ApiError.conflict("An account with this email already exists");
    }

    user.email = data.email;
  }

  if (data.role !== undefined && data.role !== user.role) {
    if (isSelf && data.role !== "admin") {
      throw ApiError.conflict("You cannot remove your own admin role");
    }

    user.role = data.role;
  }

  if (data.isActive !== undefined) {
    if (isSelf && data.isActive === false) {
      throw ApiError.conflict("You cannot deactivate your own account");
    }

    user.isActive = data.isActive;

    if (data.isActive === false) {
      await Session.updateMany(
        { userId: user._id, revokedAt: null },
        { $set: { revokedAt: new Date() } }
      );
    }
  }

  for (const field of ["name", "jobTitle", "avatarUrl"]) {
    if (data[field] !== undefined) {
      user[field] = data[field];
    }
  }

  if (data.phone !== undefined) {
    user.phone = data.phone ? data.phone : undefined;
  }

  await user.save();

  return publicUser(user);
}

export async function updateUserStatus(userId, isActive, currentUser) {
  return updateUser(userId, { isActive }, currentUser);
}

export async function updateUserRole(userId, role, currentUser) {
  return updateUser(userId, { role }, currentUser);
}

export async function deleteUser(userId, currentUser) {
  return updateUser(userId, { isActive: false }, currentUser);
}

export async function getUserStats(currentUser) {
  assertAdmin(currentUser);

  const [total, active, customers, agents, admins] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ isActive: true }),
    User.countDocuments({ role: "customer" }),
    User.countDocuments({ role: "agent" }),
    User.countDocuments({ role: "admin" }),
  ]);

  return { total, active, customers, agents, admins };
}
