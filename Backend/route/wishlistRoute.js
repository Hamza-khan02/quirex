import express from "express";
import {
  wishlistModel,
  propertyModel,
  dealsByProperty,
  ratingSummaries,
  viewerContext,
  withStatus,
} from "../model/table.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { send } from "../utils/http.js";
import { str, isObjectId } from "../utils/validate.js";

const wishlistRoute = express.Router();
const userOnly = [authenticate, requireRole("user")];

// Saves a property to the user's wishlist, or removes it if already saved.
// Responds with { saved: true | false }.
wishlistRoute.post("/wishlist-toggle", userOnly, async (req, res) => {
  const propertyId = str(req.body?.propertyId);
  if (!isObjectId(propertyId)) return send(res, 400, "Invalid property.");

  const key = { userId: String(req.user._id), propertyId };
  if (await wishlistModel.findOneAndDelete(key)) {
    return send(res, 200, "Removed from your wishlist.", { saved: false });
  }

  if (!(await propertyModel.exists({ _id: propertyId }))) {
    return send(res, 404, "Property not found.");
  }
  try {
    await wishlistModel.create(key);
  } catch (err) {
    // A double click saved it already; that's fine.
    if (err.code !== 11000) throw err;
  }
  return send(res, 200, "Saved to your wishlist.", { saved: true });
});

// The user's saved properties, most recently saved first, in the same shape
// as /property-list items.
wishlistRoute.get("/wishlist", userOnly, async (req, res) => {
  const entries = await wishlistModel.find({ userId: String(req.user._id) }).sort({ _id: -1 });
  const ids = entries.map((e) => e.propertyId).filter(isObjectId);
  const properties = await propertyModel.find({ _id: { $in: ids } });
  const byId = new Map(properties.map((p) => [String(p._id), p]));

  const [deals, ratings, viewer] = await Promise.all([
    dealsByProperty(ids),
    ratingSummaries(ids),
    viewerContext(req.user, ids),
  ]);

  // Properties deleted since they were saved are left out.
  const data = ids
    .filter((id) => byId.has(id))
    .map((id) => withStatus(byId.get(id), deals, ratings, viewer));
  return send(res, 200, "Data fetched successfully.", data);
});

export default wishlistRoute;
