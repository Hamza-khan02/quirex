import "dotenv/config";
import express from "express";
import fileUpload from "express-fileupload";
import cors from "cors";
import mongoose from "mongoose";
import { rateLimit } from "express-rate-limit";
import { dbConnect } from "./config/db.js";
import {
  buyerModel,
  requestModel,
  reviewModel,
  wishlistModel,
} from "./model/table.js";
import router from "./route/userRoute.js";
import adminRoute from "./route/adminRoute.js";
import contactRoute from "./route/contactRoute.js";
import reviewRoute from "./route/reviewRoute.js";
import requestRoute from "./route/requestRoute.js";
import wishlistRoute from "./route/wishlistRoute.js";
import siteRoute from "./route/siteRoute.js";
import { migrateProperties } from "./utils/migrate.js";
import { send } from "./utils/http.js";
import { UPLOAD_DIR, MAX_FILE_SIZE, STORAGE } from "./utils/upload.js";

const app = express();
const PORT = process.env.PORT || 9000;
// One or more frontend URLs allowed by CORS, separated by commas.
const CLIENT_URLS = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((url) => url.trim().replace(/\/$/, ""))
  .filter(Boolean);
// Behind a hosting proxy (Render, Railway, ...) set TRUST_PROXY=1 so rate
// limits see each visitor's real IP instead of the proxy's.
const TRUST_PROXY = Number(process.env.TRUST_PROXY || 0);
// Attempts allowed per IP per 15 minutes on login, register and contact.
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 20);

app.disable("x-powered-by");
app.set("trust proxy", TRUST_PROXY);

const limiter = () =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: RATE_LIMIT_MAX,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (req, res) => send(res, 429, "Too many attempts. Please try again in a few minutes."),
  });

// cors runs first so error responses from the parsers below carry CORS headers.
app.use(cors({ origin: CLIENT_URLS }));
app.use(express.json());
// Files over the limit are marked `truncated`; getImage() rejects them.
app.use(fileUpload({ limits: { fileSize: MAX_FILE_SIZE } }));
app.use(
  "/img",
  express.static(UPLOAD_DIR, {
    setHeaders: (res) => res.setHeader("X-Content-Type-Options", "nosniff"),
  })
);

// For uptime checks by the hosting service.
app.get("/api/health", (req, res) =>
  send(res, 200, "OK", {
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    storage: STORAGE,
  })
);

app.use("/api/login", limiter());
app.use("/api/user-register", limiter());
app.use("/api/contact", limiter());

app.use("/api", router);
app.use("/api", adminRoute);
app.use("/api", contactRoute);
app.use("/api", reviewRoute);
app.use("/api", requestRoute);
app.use("/api", wishlistRoute);
app.use("/api", siteRoute);
app.use("/api", (req, res) => send(res, 404, "Route not found."));

// Express 5 passes errors thrown in async route handlers to this handler.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err.type === "entity.parse.failed") return send(res, 400, "Invalid JSON body.");
  if (err.name === "CastError") return send(res, 400, "Invalid id.");
  if (err.code === 11000) return send(res, 409, "This record already exists.");
  console.error(err);
  // Errors that carry a message meant for users, such as a failed image upload.
  if (err.publicMessage) return send(res, err.status || 500, err.publicMessage);
  return send(res, 500, "Internal server error.");
});

const startServer = async () => {
  try {
    await dbConnect();
    await migrateProperties();
    // Build the unique indexes the app relies on: one deal per property, one
    // pending request per user and property, one review and one wishlist
    // entry per user and property. A build fails if the data already breaks
    // the rule (for example two sales of one property).
    for (const model of [buyerModel, requestModel, reviewModel, wishlistModel]) {
      await model.init().catch((err) => {
        console.warn(`Could not create the indexes for "${model.collection.name}":`, err.message);
      });
    }
    app.listen(PORT, () => {
      console.log(STORAGE === "cloudinary" ? "Images are stored on Cloudinary." : `Images are stored in ${UPLOAD_DIR}.`);
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Unable to start server:", error.message);
    process.exit(1);
  }
};

startServer();
