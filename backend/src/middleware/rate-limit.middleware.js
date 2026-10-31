import rateLimit from "express-rate-limit";

const message = {
  success: false,
  message: "Too many requests. Please try again later.",
};

function limiter({ windowMs, max, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message,
    skipSuccessfulRequests,
  });
}

// Authentication endpoints are the most sensitive to brute force.
export const authLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  skipSuccessfulRequests: true,
});

export const otpLimiter = limiter({
  windowMs: 10 * 60 * 1000,
  max: 10,
});

export const passwordResetLimiter = limiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
});

export const ticketCreateLimiter = limiter({
  windowMs: 60 * 60 * 1000,
  max: 60,
});

export const inboundEmailLimiter = limiter({
  windowMs: 60 * 1000,
  max: 120,
});

export const apiLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  max: 1000,
});

export default apiLimiter;
