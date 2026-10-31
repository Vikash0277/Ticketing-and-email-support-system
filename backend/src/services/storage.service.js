import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { v2 as cloudinary } from "cloudinary";

import env from "../config/env.js";
import logger from "../config/logger.js";

const UPLOAD_DIR = path.resolve("uploads");

if (env.cloudinary.enabled) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

function extensionFor(filename = "", contentType = "") {
  const fromName = path.extname(filename);
  if (fromName) return fromName.toLowerCase();

  const map = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
    "text/plain": ".txt",
    "text/csv": ".csv",
    "application/zip": ".zip",
  };

  return map[contentType] || "";
}

async function uploadToCloudinary({ buffer, filename, contentType }) {
  const folder = env.CLOUDINARY_FOLDER || "bitmax-tickets";
  const publicId = `${folder}/${Date.now()}-${crypto
    .randomBytes(6)
    .toString("hex")}`;

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
        folder,
        public_id: publicId,
        filename_override: filename,
        use_filename: false,
      },
      (error, uploaded) => {
        if (error) return reject(error);
        return resolve(uploaded);
      }
    );

    stream.end(buffer);
  });

  return {
    storageKey: result.public_id,
    url: result.secure_url,
    provider: "cloudinary",
  };
}

async function uploadToLocalDisk({ buffer, filename, contentType }) {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  const key = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${extensionFor(
    filename,
    contentType
  )}`;

  await fs.writeFile(path.join(UPLOAD_DIR, key), buffer);

  return {
    storageKey: key,
    url: `/api/v1/attachments/local/${key}`,
    provider: "local",
  };
}

export async function uploadBuffer({ buffer, filename, contentType }) {
  if (env.cloudinary.enabled) {
    try {
      return await uploadToCloudinary({ buffer, filename, contentType });
    } catch (error) {
      logger.error("Cloudinary upload failed, falling back to local disk", {
        message: error.message,
      });
    }
  }

  return uploadToLocalDisk({ buffer, filename, contentType });
}

export async function uploadFiles(files = []) {
  const results = [];

  for (const file of files) {
    const stored = await uploadBuffer({
      buffer: file.buffer,
      filename: file.originalname,
      contentType: file.mimetype,
    });

    results.push({
      filename: file.originalname,
      contentType: file.mimetype,
      size: file.size,
      ...stored,
    });
  }

  return results;
}

export function resolveLocalPath(storageKey) {
  const resolved = path.resolve(UPLOAD_DIR, path.basename(storageKey));

  if (!resolved.startsWith(UPLOAD_DIR)) {
    throw new Error("Invalid storage key");
  }

  return resolved;
}

export async function deleteStored(storageKey, provider = "local") {
  try {
    if (provider === "cloudinary") {
      await cloudinary.uploader.destroy(storageKey);
      return;
    }

    await fs.unlink(resolveLocalPath(storageKey));
  } catch (error) {
    logger.warn("Unable to delete stored file", {
      storageKey,
      message: error.message,
    });
  }
}

export default uploadFiles;
