import express from "express";
import {
  propertyModel,
  buyerModel,
  userModel,
  contactModel,
  reviewModel,
  requestModel,
  wishlistModel,
  viewerContext,
  findByIds,
  dealsByProperty,
  ratingSummaries,
  withStatus,
  PROPERTY_TYPES,
  LISTING_TYPES,
} from "../model/table.js";
import { authenticate, optionalAuth, requireRole } from "../middleware/auth.js";
import { send } from "../utils/http.js";
import { str, num, escapeRegex, isObjectId } from "../utils/validate.js";
import { getImage, saveImage, removeImage, removeImageIfUnused } from "../utils/upload.js";

const adminRoute = express.Router();
const adminOnly = [authenticate, requireRole("admin")];

// One property in API form: stored fields plus status, rating and the
// viewer's flags (saved, requested, pending request count).
const presentProperty = async (property, viewerUser) => {
  const id = String(property._id);
  const [deals, ratings, viewer] = await Promise.all([
    dealsByProperty([id]),
    ratingSummaries([id]),
    viewerContext(viewerUser, [id]),
  ]);
  return withStatus(property, deals, ratings, viewer);
};

// Validates the property form. Returns { fields } or { error }.
const readPropertyFields = (body = {}) => {
  const title = str(body.title);
  const description = str(body.description);
  const location = str(body.location);
  if (!title || !description || !location) {
    return { error: "Title, description and location are required." };
  }

  const price = num(body.price);
  if (price === undefined || price <= 0) {
    return { error: "Price must be a number greater than 0." };
  }

  const bedrooms = num(body.bedrooms) ?? 0;
  if (!Number.isInteger(bedrooms) || bedrooms < 0 || bedrooms > 50) {
    return { error: "Bedrooms must be a whole number from 0 to 50." };
  }

  const area = num(body.area);
  if (area !== undefined && area < 0) return { error: "Area cannot be negative." };

  const propertyType = str(body.propertyType) || "house";
  if (!PROPERTY_TYPES.includes(propertyType)) {
    return { error: `Property type must be one of: ${PROPERTY_TYPES.join(", ")}.` };
  }
  const listingType = str(body.listingType) || "sale";
  if (!LISTING_TYPES.includes(listingType)) {
    return { error: "Listing type must be sale or rent." };
  }

  return {
    fields: { title, price, bedrooms, area: area ?? null, propertyType, listingType, description, location },
  };
};

const SORTS = {
  newest: { _id: -1 },
  price_asc: { price: 1, _id: -1 },
  price_desc: { price: -1, _id: -1 },
};
const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;

// Public: search and list properties. All query parameters are optional:
//   q            text matched against title, location and description
//   location     text matched against location
//   listingType  sale | rent
//   propertyType house | flat | shop | land
//   minPrice, maxPrice, bedrooms (minimum)
//   available    "true" hides sold and rented properties
//   sort         newest | price_asc | price_desc
//   page, limit  pagination (limit at most 50)
// Responds with { items, total, page, pages, limit }. Logged-in viewers also
// get their flags on each item (see viewerContext).
adminRoute.get("/property-list", optionalAuth, async (req, res) => {
  const query = req.query ?? {};
  const filter = {};

  const text = str(query.q);
  if (text) {
    const pattern = new RegExp(escapeRegex(text), "i");
    filter.$or = [{ title: pattern }, { location: pattern }, { description: pattern }];
  }
  const location = str(query.location);
  if (location) filter.location = new RegExp(escapeRegex(location), "i");

  const listingType = str(query.listingType);
  if (LISTING_TYPES.includes(listingType)) filter.listingType = listingType;
  const propertyType = str(query.propertyType);
  if (PROPERTY_TYPES.includes(propertyType)) filter.propertyType = propertyType;

  const minPrice = num(query.minPrice);
  const maxPrice = num(query.maxPrice);
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = minPrice;
    if (maxPrice !== undefined) filter.price.$lte = maxPrice;
  }
  const bedrooms = num(query.bedrooms);
  if (bedrooms !== undefined) filter.bedrooms = { $gte: bedrooms };

  const deals = await dealsByProperty();
  if (str(query.available) === "true") {
    filter._id = { $nin: [...deals.keys()].filter(isObjectId) };
  }

  const limit = Math.min(Math.max(Math.trunc(num(query.limit) ?? DEFAULT_PAGE_SIZE), 1), MAX_PAGE_SIZE);
  const total = await propertyModel.countDocuments(filter);
  const pages = Math.max(Math.ceil(total / limit), 1);
  const page = Math.min(Math.max(Math.trunc(num(query.page) ?? 1), 1), pages);

  const properties = await propertyModel
    .find(filter)
    .sort(SORTS[str(query.sort)] ?? SORTS.newest)
    .skip((page - 1) * limit)
    .limit(limit);
  const ids = properties.map((p) => p._id);
  const [ratings, viewer] = await Promise.all([ratingSummaries(ids), viewerContext(req.user, ids)]);

  return send(res, 200, "Data fetched successfully.", {
    items: properties.map((property) => withStatus(property, deals, ratings, viewer)),
    total,
    page,
    pages,
    limit,
  });
});

// Public: one property, for the detail page and the admin edit form.
adminRoute.get("/property/:id", optionalAuth, async (req, res) => {
  const { id } = req.params;
  const property = isObjectId(id) ? await propertyModel.findById(id) : null;
  if (!property) return send(res, 404, "Property not found.");
  return send(res, 200, "Data fetched successfully.", await presentProperty(property, req.user));
});

adminRoute.post("/add-property", adminOnly, async (req, res) => {
  const { fields, error } = readPropertyFields(req.body);
  if (error) return send(res, 400, error);

  const image = getImage(req, "pic");
  if (image.error) return send(res, image.status, image.error);
  if (!image.file) return send(res, 400, "Property image is required.");

  if (await propertyModel.exists({ title: fields.title })) {
    return send(res, 409, "Property already exists.");
  }

  const pic = await saveImage(image.file);
  try {
    const property = await propertyModel.create({ ...fields, pic });
    return send(res, 200, "Property added successfully.", await presentProperty(property, req.user));
  } catch (err) {
    await removeImage(pic);
    throw err;
  }
});

// The image is optional here: without one, the current image is kept.
adminRoute.put("/update-property", adminOnly, async (req, res) => {
  const id = str(req.body?._id);
  if (!isObjectId(id)) return send(res, 400, "Invalid property id.");

  const { fields, error } = readPropertyFields(req.body);
  if (error) return send(res, 400, error);

  const image = getImage(req, "pic");
  if (image.error) return send(res, image.status, image.error);

  const property = await propertyModel.findById(id);
  if (!property) return send(res, 404, "Property not found.");
  if (await propertyModel.exists({ title: fields.title, _id: { $ne: id } })) {
    return send(res, 409, "Another property already has this title.");
  }

  const oldPic = property.pic;
  const newPic = image.file ? await saveImage(image.file) : null;
  property.set(newPic ? { ...fields, pic: newPic } : fields);
  try {
    await property.save();
  } catch (err) {
    await removeImage(newPic);
    throw err;
  }
  if (newPic) await removeImageIfUnused(oldPic);

  return send(res, 200, "Property updated successfully.", await presentProperty(property, req.user));
});

adminRoute.get("/admin-dashboard", adminOnly, async (req, res) => {
  const deals = await dealsByProperty();
  // Only deals whose property still exists count towards sold/rented.
  const takenProperties = await propertyModel.find(
    { _id: { $in: [...deals.keys()].filter(isObjectId) } },
    "_id"
  );
  const takenTypes = takenProperties.map((p) => deals.get(String(p._id)));
  const soldProperties = takenTypes.filter((type) => type !== "rent").length;
  const rentedProperties = takenTypes.length - soldProperties;

  const [
    totalProperties,
    totalUsers,
    blockedUsers,
    totalEnquiries,
    unreadEnquiries,
    totalReviews,
    pendingRequests,
    latestDeals,
    latestEnquiries,
  ] = await Promise.all([
    propertyModel.countDocuments(),
    userModel.countDocuments({ userType: "user" }),
    userModel.countDocuments({ userType: "user", isBlocked: true }),
    contactModel.countDocuments(),
    contactModel.countDocuments({ isRead: false }),
    reviewModel.countDocuments(),
    requestModel.countDocuments({ status: "pending" }),
    // Newest first by _id, which also orders older records whose createdAt
    // values are all identical.
    buyerModel.find().sort({ _id: -1 }).limit(5),
    contactModel.find().sort({ _id: -1 }).limit(5),
  ]);

  const [properties, buyers] = await Promise.all([
    findByIds(propertyModel, latestDeals.map((d) => d.propertyId)),
    findByIds(userModel, latestDeals.map((d) => d.userId)),
  ]);

  return send(res, 200, "Data fetched successfully.", {
    counts: {
      totalProperties,
      soldProperties,
      rentedProperties,
      availableProperties: totalProperties - soldProperties - rentedProperties,
      totalUsers,
      blockedUsers,
      totalEnquiries,
      unreadEnquiries,
      totalReviews,
      pendingRequests,
    },
    recentSales: latestDeals.map((deal) => {
      const property = properties.get(deal.propertyId);
      return {
        _id: deal._id,
        title: property?.title ?? "Deleted property",
        price: property?.price,
        listingType: property?.listingType,
        dealType: deal.dealType ?? "sale",
        buyer: buyers.get(deal.userId)?.name ?? "Unknown buyer",
        date: deal._id.getTimestamp(),
      };
    }),
    recentEnquiries: latestEnquiries.map((enquiry) => ({
      _id: enquiry._id,
      name: enquiry.name,
      message: enquiry.message,
      isRead: enquiry.isRead,
      date: enquiry._id.getTimestamp(),
    })),
  });
});

adminRoute.get("/admin-sold-list", adminOnly, async (req, res) => {
  const deals = await buyerModel.find().sort({ _id: -1 });
  const [properties, buyers] = await Promise.all([
    findByIds(propertyModel, deals.map((d) => d.propertyId)),
    findByIds(userModel, deals.map((d) => d.userId)),
  ]);

  // Older deals can point at a deleted property or have no buyer at all.
  // They are still listed so the admin can delete them.
  const data = deals.map((deal) => {
    const property = properties.get(deal.propertyId);
    const buyer = buyers.get(deal.userId);
    return {
      _id: deal._id,
      dealType: deal.dealType ?? "sale",
      propertyId: property?._id,
      title: property?.title ?? "Deleted property",
      price: property?.price,
      listingType: property?.listingType,
      bedrooms: property?.bedrooms,
      area: property?.area,
      location: property?.location,
      description: property?.description,
      pic: property?.pic,
      name: buyer?.name ?? "Unknown buyer",
      email: buyer?.email,
      contact: buyer?.contact,
    };
  });

  return send(res, 200, "Data fetched successfully.", data);
});

// Deleting a property also deletes its deal record, requests, reviews and
// wishlist entries and, if nothing else uses it, its image file.
adminRoute.post("/delete-property", adminOnly, async (req, res) => {
  const id = str(req.body?._id);
  if (!isObjectId(id)) return send(res, 400, "Invalid property id.");

  const property = await propertyModel.findByIdAndDelete(id);
  if (!property) return send(res, 404, "Property not found.");

  await Promise.all([
    buyerModel.deleteMany({ propertyId: id }),
    reviewModel.deleteMany({ propertyId: id }),
    requestModel.deleteMany({ propertyId: id }),
    wishlistModel.deleteMany({ propertyId: id }),
  ]);
  await removeImageIfUnused(property.pic);
  return send(res, 200, "Property deleted successfully.");
});

// Deleting a deal record makes the property available again.
adminRoute.post("/delete-sold-item", adminOnly, async (req, res) => {
  const id = str(req.body?._id);
  if (!isObjectId(id)) return send(res, 400, "Invalid sale record id.");

  const deal = await buyerModel.findByIdAndDelete(id);
  if (!deal) return send(res, 404, "Sale record not found.");
  return send(res, 200, "Record deleted. The property is available again.");
});

adminRoute.get("/admin-user-list", adminOnly, async (req, res) => {
  const users = await userModel.find({ userType: "user" });
  return send(res, 200, "Data fetched successfully.", users);
});

// Body: { _id, isBlocked: true | false }. Only regular users can be blocked.
adminRoute.post("/admin-toggle-block", adminOnly, async (req, res) => {
  const id = str(req.body?._id);
  const isBlocked = req.body?.isBlocked;
  if (!isObjectId(id) || typeof isBlocked !== "boolean") {
    return send(res, 400, "A user id and isBlocked (true or false) are required.");
  }

  const user = await userModel.findOneAndUpdate(
    { _id: id, userType: "user" },
    { isBlocked },
    { new: true }
  );
  if (!user) return send(res, 404, "User not found.");
  return send(res, 200, isBlocked ? "User blocked." : "User unblocked.", user);
});

export default adminRoute;
