import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { propertyModel, userModel } from "../model/table.js";

export const UPLOAD_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "uploads"
);
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

const IMAGE_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
};

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Returns { file } for a valid image, { status, error } for a rejected one,
// or {} when the field was not sent.
export const getImage = (req, field) => {
  let file = req.files?.[field];
  if (Array.isArray(file)) file = file[0];
  if (!file) return {};
  if (file.truncated) {
    return { status: 413, error: "Image is too large (max 5 MB)." };
  }
  if (!IMAGE_TYPES[file.mimetype]) {
    return { status: 400, error: "Only JPG, PNG, WEBP, GIF or AVIF images are allowed." };
  }
  return { file };
};

// The stored name is generated, never taken from the upload, so files cannot
// overwrite each other and always get an image extension.
export const saveImage = async (file) => {
  const name = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${IMAGE_TYPES[file.mimetype]}`;
  await file.mv(path.join(UPLOAD_DIR, name));
  return name;
};

export const removeImage = async (name) => {
  if (!name) return;
  await fs.promises
    .unlink(path.join(UPLOAD_DIR, path.basename(name)))
    .catch(() => {});
};

// Uploads made before generated names kept the original filename, so two
// records can share one file. Only delete it once nothing points at it.
export const removeImageIfUnused = async (name) => {
  if (!name) return;
  const inUse =
    (await propertyModel.exists({ pic: name })) ||
    (await userModel.exists({ profile: name }));
  if (!inUse) await removeImage(name);
};
