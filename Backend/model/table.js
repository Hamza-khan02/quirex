import mongoose from "mongoose";
import { isObjectId } from "../utils/validate.js";

export const PROPERTY_TYPES = ["house", "flat", "shop", "land"];
export const LISTING_TYPES = ["sale", "rent"];

const userSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String },
    // select: false keeps the hash out of every query result. Login asks for
    // it explicitly with .select('+password').
    password: { type: String, select: false },
    contact: { type: String },
    address: { type: String },
    profile: { type: String },
    userType: { type: String, default: "user" },
    // Blocked users cannot log in, and their existing sessions stop working.
    isBlocked: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    // Never send a password in an API response, even if it was selected.
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.password;
        return ret;
      },
    },
  }
);

export const userModel = mongoose.model("users", userSchema);

const propertySchema = new mongoose.Schema(
  {
    title: { type: String },
    // Sale price, or the monthly rent when listingType is "rent".
    price: { type: Number },
    // Size in square feet. Optional.
    area: { type: Number },
    bedrooms: { type: Number, default: 0 },
    propertyType: { type: String, enum: PROPERTY_TYPES, default: "house" },
    listingType: { type: String, enum: LISTING_TYPES, default: "sale" },
    description: { type: String },
    location: { type: String },
    pic: { type: String },
  },
  { timestamps: true }
);

export const propertyModel = mongoose.model("properties", propertySchema);

// A completed deal: a property bought (dealType "sale") or rented ("rent").
const buyerSchema = new mongoose.Schema(
  {
    userId: { type: String },
    // unique: a property can only be taken once, even when two requests
    // arrive at the same moment.
    propertyId: { type: String, unique: true },
    dealType: { type: String, enum: LISTING_TYPES, default: "sale" },
  },
  { timestamps: true }
);

export const buyerModel = mongoose.model("buyers", buyerSchema);

// Messages sent from the Contact Us page, optionally about one property.
const contactSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String },
    message: { type: String },
    propertyId: { type: String },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const contactModel = mongoose.model("contacts", contactSchema);

const reviewSchema = new mongoose.Schema(
  {
    propertyId: { type: String },
    userId: { type: String },
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String },
  },
  { timestamps: true }
);
// One review per user per property; posting again updates it.
reviewSchema.index({ propertyId: 1, userId: 1 }, { unique: true });

export const reviewModel = mongoose.model("reviews", reviewSchema);

export const REQUEST_STATUSES = ["pending", "approved", "rejected", "cancelled"];

// A user's request to buy or rent a property. The admin approves one request
// (which creates the deal) or rejects it.
const requestSchema = new mongoose.Schema(
  {
    userId: { type: String },
    propertyId: { type: String },
    dealType: { type: String, enum: LISTING_TYPES },
    status: { type: String, enum: REQUEST_STATUSES, default: "pending" },
    // Optional reason shown to the user when a request is rejected.
    note: { type: String },
    decidedAt: { type: Date },
  },
  { timestamps: true }
);
// A user can have only one pending request per property. Approved, rejected
// and cancelled requests don't count, so the user can ask again later.
requestSchema.index(
  { userId: 1, propertyId: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

export const requestModel = mongoose.model("requests", requestSchema);

const wishlistSchema = new mongoose.Schema(
  {
    userId: { type: String },
    propertyId: { type: String },
  },
  { timestamps: true }
);
wishlistSchema.index({ userId: 1, propertyId: 1 }, { unique: true });

export const wishlistModel = mongoose.model("wishlists", wishlistSchema);

// Loads documents by id and returns them as a Map keyed by the id string.
// Invalid ids (older records can hold undefined) are skipped.
export const findByIds = async (model, ids) => {
  const validIds = [...new Set(ids)].filter(isObjectId);
  const docs = await model.find({ _id: { $in: validIds } });
  return new Map(docs.map((doc) => [String(doc._id), doc]));
};

// Map of propertyId -> "sale" | "rent" for properties that have been taken.
// Pass ids to limit the lookup; older deals without a dealType were sales.
export const dealsByProperty = async (propertyIds) => {
  const filter = propertyIds ? { propertyId: { $in: propertyIds.map(String) } } : {};
  const deals = await buyerModel.find(filter, "propertyId dealType");
  return new Map(deals.map((deal) => [deal.propertyId, deal.dealType ?? "sale"]));
};

// Map of propertyId -> { average, count } from the reviews collection.
export const ratingSummaries = async (propertyIds) => {
  const rows = await reviewModel.aggregate([
    { $match: { propertyId: { $in: propertyIds.map(String) } } },
    { $group: { _id: "$propertyId", average: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  return new Map(
    rows.map((row) => [row._id, { average: Math.round(row.average * 10) / 10, count: row.count }])
  );
};

// What the person looking at a list of properties should see about them:
// for a user, which ones they saved and which they have a pending request
// for; for an admin, how many pending requests each one has.
export const viewerContext = async (user, propertyIds) => {
  const ids = propertyIds.map(String);
  if (user?.userType === "user") {
    const userId = String(user._id);
    const [saved, requested] = await Promise.all([
      wishlistModel.find({ userId, propertyId: { $in: ids } }, "propertyId"),
      requestModel.find({ userId, propertyId: { $in: ids }, status: "pending" }, "propertyId"),
    ]);
    return {
      saved: new Set(saved.map((s) => s.propertyId)),
      requested: new Set(requested.map((r) => r.propertyId)),
    };
  }
  if (user?.userType === "admin") {
    const rows = await requestModel.aggregate([
      { $match: { propertyId: { $in: ids }, status: "pending" } },
      { $group: { _id: "$propertyId", count: { $sum: 1 } } },
    ]);
    return { pendingCounts: new Map(rows.map((row) => [row._id, row.count])) };
  }
  return {};
};

// A property as the API returns it: the stored fields plus whether it is
// still available, its rating summary and the viewer flags above.
export const withStatus = (property, deals, ratings, viewer = {}) => {
  const id = String(property._id);
  const deal = deals.get(id);
  return {
    ...property.toJSON(),
    status: deal === "rent" ? "rented" : deal ? "sold" : "available",
    isSold: Boolean(deal),
    rating: ratings.get(id) ?? { average: 0, count: 0 },
    isSaved: viewer.saved?.has(id) ?? false,
    hasPendingRequest: viewer.requested?.has(id) ?? false,
    pendingRequests: viewer.pendingCounts?.get(id) ?? 0,
  };
};
