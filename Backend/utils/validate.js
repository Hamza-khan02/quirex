// Request fields are read through these helpers. Anything that is not a plain
// string (for example {"$ne": null} sent as JSON) becomes '', so it can never
// reach a MongoDB query as an operator.

export const str = (value) => (typeof value === "string" ? value.trim() : "");

// Passwords are not trimmed: spaces are allowed characters.
export const passwordField = (value) => (typeof value === "string" ? value : "");

export const MIN_PASSWORD = 8;
// bcrypt ignores everything after 72 bytes.
export const MAX_PASSWORD = 72;

export const passwordError = (password) =>
  password.length < MIN_PASSWORD || password.length > MAX_PASSWORD
    ? `Password must be ${MIN_PASSWORD}-${MAX_PASSWORD} characters.`
    : null;

export const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const isObjectId = (value) =>
  typeof value === "string" && /^[a-f\d]{24}$/i.test(value);

// Reads a number from a form field or query string. Empty strings and
// anything that is not a finite number give undefined.
export const num = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

// Makes user text safe to use inside a RegExp (matched literally).
export const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
