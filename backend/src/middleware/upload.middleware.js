import multer from "multer";

import ApiError from "../utils/ApiError.js";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 5;

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
]);

const storage = multer.memoryStorage();

function fileFilter(req, file, callback) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return callback(
      ApiError.badRequest(
        `Unsupported file type: ${file.mimetype}. Allowed: images, PDF, text, CSV, Word, Excel, ZIP.`
      )
    );
  }

  return callback(null, true);
}

export const uploadAttachments = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  fileFilter,
}).array("attachments", MAX_FILES);

export function attachmentUpload(req, res, next) {
  uploadAttachments(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return next(ApiError.badRequest("Each attachment must be 10 MB or less"));
      }

      if (error.code === "LIMIT_FILE_COUNT") {
        return next(ApiError.badRequest(`You can upload up to ${MAX_FILES} files`));
      }

      return next(ApiError.badRequest(error.message));
    }

    return next(error);
  });
}

export default attachmentUpload;
