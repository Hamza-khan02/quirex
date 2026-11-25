import express from "express";
import {
  propertyModel,
  reviewModel,
  userModel,
  findByIds,
  dealsByProperty,
  PROPERTY_TYPES,
} from "../model/table.js";
import { send } from "../utils/http.js";
import { isObjectId } from "../utils/validate.js";

const siteRoute = express.Router();

// Public numbers for the home page.
siteRoute.get("/site-stats", async (req, res) => {
  const [totalProperties, locations, typeRows, deals] = await Promise.all([
    propertyModel.countDocuments(),
    propertyModel.distinct("location"),
    propertyModel.aggregate([{ $group: { _id: "$propertyType", count: { $sum: 1 } } }]),
    dealsByProperty(),
  ]);
  // Only deals whose property still exists count.
  const dealsCompleted = await propertyModel.countDocuments({
    _id: { $in: [...deals.keys()].filter(isObjectId) },
  });

  const byType = Object.fromEntries(PROPERTY_TYPES.map((type) => [type, 0]));
  for (const row of typeRows) if (row._id in byType) byType[row._id] = row.count;

  return send(res, 200, "Data fetched successfully.", {
    totalProperties,
    availableProperties: totalProperties - dealsCompleted,
    dealsCompleted,
    // Case-insensitive, so "Pune" and "pune" count once.
    locations: new Set(locations.filter(Boolean).map((l) => l.trim().toLowerCase())).size,
    byType,
  });
});

const FEATURED_LIMIT = 3;

// Public: the newest 4- and 5-star reviews that have a comment, for the home
// page's customer feedback section.
siteRoute.get("/featured-reviews", async (req, res) => {
  const reviews = await reviewModel
    .find({ rating: { $gte: 4 }, comment: { $nin: [null, ""] } })
    .sort({ _id: -1 })
    .limit(FEATURED_LIMIT);
  const [users, properties] = await Promise.all([
    findByIds(userModel, reviews.map((r) => r.userId)),
    findByIds(propertyModel, reviews.map((r) => r.propertyId)),
  ]);

  const data = reviews
    .filter((review) => properties.has(review.propertyId))
    .map((review) => ({
      _id: review._id,
      rating: review.rating,
      comment: review.comment,
      name: users.get(review.userId)?.name ?? "Former user",
      propertyId: review.propertyId,
      propertyTitle: properties.get(review.propertyId).title,
      createdAt: review.createdAt,
    }));
  return send(res, 200, "Data fetched successfully.", data);
});

export default siteRoute;
