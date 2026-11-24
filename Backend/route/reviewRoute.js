import express from "express";
import { reviewModel, propertyModel, userModel, findByIds } from "../model/table.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { send } from "../utils/http.js";
import { str, num, isObjectId } from "../utils/validate.js";

const reviewRoute = express.Router();

const MAX_COMMENT = 1000;

// Public: reviews of one property, newest first, with the reviewer's name.
reviewRoute.get("/property/:id/reviews", async (req, res) => {
  const { id } = req.params;
  if (!isObjectId(id)) return send(res, 404, "Property not found.");

  const reviews = await reviewModel.find({ propertyId: id }).sort({ _id: -1 });
  const users = await findByIds(userModel, reviews.map((r) => r.userId));
  const data = reviews.map((review) => ({
    _id: review._id,
    userId: review.userId,
    name: users.get(review.userId)?.name ?? "Former user",
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
  }));
  return send(res, 200, "Data fetched successfully.", data);
});

// Logged-in users rate a property from 1 to 5 with an optional comment.
// Posting again replaces the user's earlier review.
reviewRoute.post("/property/:id/reviews", authenticate, requireRole("user"), async (req, res) => {
  const { id } = req.params;
  if (!isObjectId(id) || !(await propertyModel.exists({ _id: id }))) {
    return send(res, 404, "Property not found.");
  }

  const rating = num(req.body?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return send(res, 400, "Rating must be a whole number from 1 to 5.");
  }
  const comment = str(req.body?.comment);
  if (comment.length > MAX_COMMENT) {
    return send(res, 400, `Comment can be ${MAX_COMMENT} characters at most.`);
  }

  const key = { propertyId: id, userId: String(req.user._id) };
  const existed = await reviewModel.exists(key);
  const review = await reviewModel.findOneAndUpdate(
    key,
    { rating, comment },
    { upsert: true, new: true, runValidators: true }
  );
  return send(res, 200, existed ? "Review updated." : "Thanks for your review!", review);
});

// Users can delete their own review; admins can delete any review.
reviewRoute.post("/delete-review", authenticate, async (req, res) => {
  const id = str(req.body?._id);
  if (!isObjectId(id)) return send(res, 400, "Invalid review id.");

  const review = await reviewModel.findById(id);
  if (!review) return send(res, 404, "Review not found.");

  const isOwner = review.userId === String(req.user._id);
  if (!isOwner && req.user.userType !== "admin") {
    return send(res, 403, "You can only delete your own review.");
  }

  await review.deleteOne();
  return send(res, 200, "Review deleted.");
});

export default reviewRoute;
