import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../modules/user/user.model.js";

function createError(message, statusCode = 401) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export async function authenticate(req, res, next) {
  const authorization = req.headers.authorization;
  const match = authorization?.match(/^Bearer\s+(\S+)$/i);

  if (!match) {
    return next(createError("Authentication required"));
  }

  try {
    const payload = jwt.verify(match[1], process.env.JWT_ACCESS_SECRET);

    if (
      typeof payload !== "object" ||
      typeof payload.sub !== "string" ||
      !mongoose.isValidObjectId(payload.sub)
    ) {
      return next(createError("Invalid authentication token"));
    }

    const user = await User.findById(payload.sub);

    if (!user || !user.isActive) {
      return next(createError("Invalid authentication token"));
    }

    req.user = {
      id: user._id,
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}
