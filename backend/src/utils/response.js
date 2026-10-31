export function sendSuccess(res, statusCode, message, data, extra = {}) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...extra,
  });
}

export function sendPaginated(res, message, data, pagination) {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination,
  });
}
