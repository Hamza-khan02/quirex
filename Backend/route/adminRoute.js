import express from "express";
import { propertyModel, buyerModel, userModel, findByIds } from "../model/table.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { send } from "../utils/http.js";
import { str, isObjectId } from "../utils/validate.js";
import { getImage, saveImage, removeImage, removeImageIfUnused } from "../utils/upload.js";

const adminRoute = express.Router();
const adminOnly = [authenticate, requireRole("admin")];

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

adminRoute.post("/add-property", adminOnly, async (req, res) => {
  const body = req.body ?? {};
  const fields = {
    title: str(body.title),
    price: str(body.price),
    area: str(body.area),
    description: str(body.description),
    location: str(body.location),
  };
  if (Object.values(fields).some((value) => !value)) {
    return send(res, 400, "Title, price, area, description and location are required.");
  }

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

export default adminRoute;
