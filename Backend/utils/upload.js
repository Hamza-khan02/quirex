import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { v2 as cloudinary } from "cloudinary";
import { propertyModel, userModel } from "../model/table.js";

// Where uploaded images go:
// - Cloudinary, when CLOUDINARY_URL is set (cloudinary://key:secret@cloud_name).
//   The database stores the image's full https URL.
// - Otherwise this server's disk, in UPLOAD_DIR (default Backend/uploads).
//   The database stores the file name, served from /img/<name>.
export const STORAGE = process.env.CLOUDINARY_URL ? "cloudinary" : "local";
const CLOUDINARY_FOLDER = process.env.CLOUDINARY_FOLDER || "quirex";

export const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "uploads");
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

const IMAGE_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
};

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const isRemote = (name) => /^https?:\/\//i.test(name);

// https://res.cloudinary.com/<cloud>/image/upload/v1712345/quirex/abc.jpg
//   -> "quirex/abc", but only for images in our own Cloudinary account.
const cloudinaryPublicId = (url) => {
  const cloudName = cloudinary.config().cloud_name;
  const marker = `/${cloudName}/image/upload/`;
  const start = url.indexOf(marker);
  if (!cloudName || start < 0) return null;
  return url
    .slice(start + marker.length)
    .replace(/^v\d+\//, "")
    .replace(/\.[a-z0-9]+$/i, "");
};

// An error whose message is safe to show to the user (see index.js).
const uploadFailed = (cause) => {
  const err = new Error(`Image upload failed: ${cause?.message ?? cause}`);
  err.status = 502;
  err.publicMessage = "Could not upload the image. Please try again.";
  return err;
};

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

// Stores an image and returns what the database should keep for it: a
// Cloudinary URL, or a generated local file name (never the uploaded name,
// so files cannot overwrite each other and always get an image extension).
export const saveImage = async (file) => {
  if (STORAGE === "cloudinary") {
    try {
      const result = await cloudinary.uploader.upload(
        `data:${file.mimetype};base64,${file.data.toString("base64")}`,
        { folder: CLOUDINARY_FOLDER, resource_type: "image" }
      );
      return result.secure_url;
    } catch (err) {
      throw uploadFailed(err);
    }
  }

  const name = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${IMAGE_TYPES[file.mimetype]}`;
  await file.mv(path.join(UPLOAD_DIR, name));
  return name;
};

export const removeImage = async (name) => {
  if (!name) return;
  if (isRemote(name)) {
    const publicId = STORAGE === "cloudinary" ? cloudinaryPublicId(name) : null;
    if (publicId) {
      await cloudinary.uploader.destroy(publicId).catch((err) => {
        console.warn(`Could not delete ${publicId} from Cloudinary:`, err?.message ?? err);
      });
    }
    return;
  }
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
