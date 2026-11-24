import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { userModel } from "../model/table.js";
import { send } from "../utils/http.js";

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

const JWT_SECRET = (() => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set in production.");
  }
  console.warn(
    "JWT_SECRET is not set, so a random one is used and everyone is logged out " +
      "whenever the server restarts. Set JWT_SECRET in Backend/.env."
  );
  return crypto.randomBytes(32).toString("hex");
})();

export const signToken = (user) =>
  jwt.sign({ sub: String(user._id), role: user.userType }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

// Requires "Authorization: Bearer <token>" and loads the user into req.user.
// The user is re-read from the database so a deleted account or a role change
// takes effect immediately.
export const authenticate = async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return send(res, 401, "Please log in first.");

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return send(res, 401, "Your session has expired. Please log in again.");
  }

  const user = await userModel.findById(payload.sub);
  if (!user) return send(res, 401, "Account not found. Please log in again.");

  req.user = user;
  next();
};

export const requireRole = (role) => (req, res, next) =>
  req.user?.userType === role
    ? next()
    : send(res, 403, "You are not allowed to do this.");
