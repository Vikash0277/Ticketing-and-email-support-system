import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import User from "../modules/user/user.model.js";
import ApiError from "../utils/ApiError.js";

function extractToken(req) {
  const authorization = req.headers.authorization;
  const match = authorization?.match(/^Bearer\s+(\S+)$/i);

  return match?.[1] ?? null;
}

function toRequestUser(user) {
  return {
    id: user._id,
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    isEmailVerified: user.isEmailVerified,
    avatarUrl: user.avatarUrl,
  };
}

export async function authenticate(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return next(ApiError.unauthorized());
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    if (
      typeof payload !== "object" ||
      typeof payload.sub !== "string" ||
      !mongoose.isValidObjectId(payload.sub)
    ) {
      return next(ApiError.unauthorized("Invalid authentication token"));
    }

    const user = await User.findById(payload.sub);

    if (!user || !user.isActive) {
      return next(ApiError.unauthorized("Invalid authentication token"));
    }

    req.user = toRequestUser(user);
    req.tokenPayload = payload;

    return next();
  } catch (error) {
    return next(error);
  }
}

export async function optionalAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) return next();

  return authenticate(req, res, next);
}

export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden("Your role does not allow this action")
      );
    }

    return next();
  };
}

export function isStaff(user) {
  return ["agent", "admin"].includes(user?.role);
}

export function isAdmin(user) {
  return user?.role === "admin";
}

export default authenticate;
