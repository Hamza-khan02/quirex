import "dotenv/config";
import express from "express";
import fileUpload from "express-fileupload";
import cors from "cors";
import { dbConnect } from "./config/db.js";
import { buyerModel } from "./model/table.js";
import router from "./route/userRoute.js";
import adminRoute from "./route/adminRoute.js";
import contactRoute from "./route/contactRoute.js";
import { send } from "./utils/http.js";
import { UPLOAD_DIR, MAX_FILE_SIZE } from "./utils/upload.js";

const app = express();
const PORT = process.env.PORT || 9000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// cors runs first so error responses from the parsers below carry CORS headers.
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());
// Files over the limit are marked `truncated`; getImage() rejects them.
app.use(fileUpload({ limits: { fileSize: MAX_FILE_SIZE } }));
app.use(
  "/img",
  express.static(UPLOAD_DIR, {
    setHeaders: (res) => res.setHeader("X-Content-Type-Options", "nosniff"),
  })
);
app.use("/api", router);
app.use("/api", adminRoute);
app.use("/api", contactRoute);
app.use("/api", (req, res) => send(res, 404, "Route not found."));

// Express 5 passes errors thrown in async route handlers to this handler.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err.type === "entity.parse.failed") return send(res, 400, "Invalid JSON body.");
  if (err.name === "CastError") return send(res, 400, "Invalid id.");
  if (err.code === 11000) return send(res, 409, "This record already exists.");
  console.error(err);
  return send(res, 500, "Internal server error.");
});

const startServer = async () => {
  try {
    await dbConnect();
    // Builds the unique index that stops a property being sold twice. It fails
    // if the database already holds two sales of the same property.
    await buyerModel.init().catch((err) => {
      console.warn(
        "Could not create the unique index on buyers.propertyId. Delete duplicate " +
          "sale records from the Sold page, then restart.",
        err.message
      );
    });
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Unable to start server:", error.message);
    process.exit(1);
  }
};

startServer();
