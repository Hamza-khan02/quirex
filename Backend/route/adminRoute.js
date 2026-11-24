import express from "express";
import {
  propertyModel,
  buyerModel,
  userModel,
  contactModel,
  findByIds,
} from "../model/table.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { send } from "../utils/http.js";
import { str, isObjectId } from "../utils/validate.js";
import { getImage, saveImage, removeImage, removeImageIfUnused } from "../utils/upload.js";

const adminRoute = express.Router();
const adminOnly = [authenticate, requireRole("admin")];

const isSold = async (propertyId) =>
  Boolean(await buyerModel.exists({ propertyId }));

// Reads the property form fields; returns null if any is missing.
const readPropertyFields = (body = {}) => {
  const fields = {
    title: str(body.title),
    price: str(body.price),
    area: str(body.area),
    description: str(body.description),
    location: str(body.location),
  };
  return Object.values(fields).every(Boolean) ? fields : null;
};
const MISSING_PROPERTY_FIELDS =
  "Title, price, area, description and location are required.";

// Public: the landing page lists properties too. `isSold` lets the page show
// a Sold label instead of a Buy button.
adminRoute.get("/property-list", async (req, res) => {
  const [properties, purchases] = await Promise.all([
    propertyModel.find(),
    buyerModel.find({}, "propertyId"),
  ]);
  const soldIds = new Set(purchases.map((p) => p.propertyId));
  const data = properties.map((property) => ({
    ...property.toJSON(),
    isSold: soldIds.has(String(property._id)),
  }));
  return send(res, 200, "Data fetched successfully.", data);
});

// Public: one property, for the detail page and the admin edit form.
adminRoute.get("/property/:id", async (req, res) => {
  const { id } = req.params;
  const property = isObjectId(id) ? await propertyModel.findById(id) : null;
  if (!property) return send(res, 404, "Property not found.");
  return send(res, 200, "Data fetched successfully.", {
    ...property.toJSON(),
    isSold: await isSold(id),
  });
});

adminRoute.post("/add-property", adminOnly, async (req, res) => {
  const fields = readPropertyFields(req.body);
  if (!fields) return send(res, 400, MISSING_PROPERTY_FIELDS);

  const image = getImage(req, "pic");
  if (image.error) return send(res, image.status, image.error);
  if (!image.file) return send(res, 400, "Property image is required.");

  if (await propertyModel.exists({ title: fields.title })) {
    return send(res, 409, "Property already exists.");
  }

  const pic = await saveImage(image.file);
  try {
    const property = await propertyModel.create({ ...fields, pic });
    return send(res, 200, "Property added successfully.", property);
  } catch (err) {
    await removeImage(pic);
    throw err;
  }
});

// The image is optional here: without one, the current image is kept.
adminRoute.put("/update-property", adminOnly, async (req, res) => {
  const id = str(req.body?._id);
  if (!isObjectId(id)) return send(res, 400, "Invalid property id.");

  const fields = readPropertyFields(req.body);
  if (!fields) return send(res, 400, MISSING_PROPERTY_FIELDS);

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

  return send(res, 200, "Property updated successfully.", {
    ...property.toJSON(),
    isSold: await isSold(id),
  });
});

adminRoute.get("/admin-dashboard", adminOnly, async (req, res) => {
  const soldIds = (await buyerModel.distinct("propertyId")).filter(isObjectId);
  const [
    totalProperties,
    soldProperties,
    totalUsers,
    blockedUsers,
    totalEnquiries,
    unreadEnquiries,
    latestPurchases,
    latestEnquiries,
  ] = await Promise.all([
    propertyModel.countDocuments(),
    // Counts only sales whose property still exists.
    propertyModel.countDocuments({ _id: { $in: soldIds } }),
    userModel.countDocuments({ userType: "user" }),
    userModel.countDocuments({ userType: "user", isBlocked: true }),
    contactModel.countDocuments(),
    contactModel.countDocuments({ isRead: false }),
    // Newest first by _id, which also orders older records whose createdAt
    // values are all identical.
    buyerModel.find().sort({ _id: -1 }).limit(5),
    contactModel.find().sort({ _id: -1 }).limit(5),
  ]);

  const [properties, buyers] = await Promise.all([
    findByIds(propertyModel, latestPurchases.map((p) => p.propertyId)),
    findByIds(userModel, latestPurchases.map((p) => p.userId)),
  ]);

  return send(res, 200, "Data fetched successfully.", {
    counts: {
      totalProperties,
      soldProperties,
      availableProperties: totalProperties - soldProperties,
      totalUsers,
      blockedUsers,
      totalEnquiries,
      unreadEnquiries,
    },
    recentSales: latestPurchases.map((purchase) => ({
      _id: purchase._id,
      title: properties.get(purchase.propertyId)?.title ?? "Deleted property",
      price: properties.get(purchase.propertyId)?.price,
      buyer: buyers.get(purchase.userId)?.name ?? "Unknown buyer",
      date: purchase._id.getTimestamp(),
    })),
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
  const purchases = await buyerModel.find();
  const [properties, buyers] = await Promise.all([
    findByIds(propertyModel, purchases.map((p) => p.propertyId)),
    findByIds(userModel, purchases.map((p) => p.userId)),
  ]);

  // Older sales can point at a deleted property or have no buyer at all. They
  // are still listed so the admin can delete them.
  const data = purchases.map((purchase) => {
    const property = properties.get(purchase.propertyId);
    const buyer = buyers.get(purchase.userId);
    return {
      _id: purchase._id,
      propertyId: property?._id,
      title: property?.title ?? "Deleted property",
      price: property?.price,
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

// Deleting a property also deletes its sale record and, if nothing else uses
// it, its image file.
adminRoute.post("/delete-property", adminOnly, async (req, res) => {
  const id = str(req.body?._id);
  if (!isObjectId(id)) return send(res, 400, "Invalid property id.");

  const property = await propertyModel.findByIdAndDelete(id);
  if (!property) return send(res, 404, "Property not found.");

  await buyerModel.deleteMany({ propertyId: id });
  await removeImageIfUnused(property.pic);
  return send(res, 200, "Property deleted successfully.");
});

// Deleting a sale record makes the property available to buy again.
adminRoute.post("/delete-sold-item", adminOnly, async (req, res) => {
  const id = str(req.body?._id);
  if (!isObjectId(id)) return send(res, 400, "Invalid sale record id.");

  const purchase = await buyerModel.findByIdAndDelete(id);
  if (!purchase) return send(res, 404, "Sale record not found.");
  return send(res, 200, "Sale record deleted. The property can be bought again.");
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
