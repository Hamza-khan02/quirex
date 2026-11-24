import express from "express";
import {
  requestModel,
  buyerModel,
  propertyModel,
  userModel,
  findByIds,
  dealsByProperty,
} from "../model/table.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { send } from "../utils/http.js";
import { str, isObjectId } from "../utils/validate.js";

const requestRoute = express.Router();
const userOnly = [authenticate, requireRole("user")];
const adminOnly = [authenticate, requireRole("admin")];

const MAX_NOTE = 500;
const OTHER_APPROVED_NOTE = "Another request for this property was approved.";

const takenMessage = (dealType) =>
  dealType === "rent" ? "Property already rented." : "Property already sold.";

// Asks to buy a sale listing or rent a rental. Nothing is sold yet: the admin
// approves or rejects the request from the Requests page.
requestRoute.post("/buy", userOnly, async (req, res) => {
  const propertyId = str(req.body?.propertyId);
  if (!isObjectId(propertyId)) return send(res, 400, "Invalid property.");

  const property = await propertyModel.findById(propertyId);
  if (!property) return send(res, 404, "Property not found.");

  const deal = await buyerModel.findOne({ propertyId });
  if (deal) return send(res, 409, takenMessage(deal.dealType));

  try {
    const request = await requestModel.create({
      userId: String(req.user._id),
      propertyId,
      dealType: property.listingType === "rent" ? "rent" : "sale",
    });
    return send(res, 200, "Request sent! The admin will review it soon.", request);
  } catch (err) {
    // The partial unique index allows one pending request per user and property.
    if (err.code === 11000) return send(res, 409, "You have already requested this property.");
    throw err;
  }
});

// The logged-in user's requests, newest first.
requestRoute.get("/my-requests", userOnly, async (req, res) => {
  const requests = await requestModel.find({ userId: String(req.user._id) }).sort({ _id: -1 });
  const properties = await findByIds(propertyModel, requests.map((r) => r.propertyId));
  const data = requests.map((request) => {
    const property = properties.get(request.propertyId);
    return {
      _id: request._id,
      status: request.status,
      dealType: request.dealType,
      note: request.note,
      createdAt: request.createdAt,
      decidedAt: request.decidedAt,
      propertyId: request.propertyId,
      propertyExists: Boolean(property),
      title: property?.title ?? "Deleted property",
      price: property?.price,
      listingType: property?.listingType,
      location: property?.location,
      pic: property?.pic,
    };
  });
  return send(res, 200, "Data fetched successfully.", data);
});

requestRoute.post("/cancel-request", userOnly, async (req, res) => {
  const id = str(req.body?._id);
  if (!isObjectId(id)) return send(res, 400, "Invalid request id.");

  const request = await requestModel.findById(id);
  if (!request || request.userId !== String(req.user._id)) {
    return send(res, 404, "Request not found.");
  }
  if (request.status !== "pending") {
    return send(res, 409, "Only pending requests can be cancelled.");
  }

  request.set({ status: "cancelled", decidedAt: new Date() });
  await request.save();
  return send(res, 200, "Request cancelled.", request);
});

// All requests, newest first, with the property and the requester. Pass
// ?status=pending (or approved, rejected, cancelled) to filter.
requestRoute.get("/admin-request-list", adminOnly, async (req, res) => {
  const status = str(req.query?.status);
  const filter = ["pending", "approved", "rejected", "cancelled"].includes(status) ? { status } : {};
  const requests = await requestModel.find(filter).sort({ _id: -1 });

  const propertyIds = requests.map((r) => r.propertyId);
  const [properties, users, deals] = await Promise.all([
    findByIds(propertyModel, propertyIds),
    findByIds(userModel, requests.map((r) => r.userId)),
    dealsByProperty(propertyIds.filter(isObjectId)),
  ]);

  const data = requests.map((request) => {
    const property = properties.get(request.propertyId);
    const user = users.get(request.userId);
    const deal = deals.get(request.propertyId);
    return {
      _id: request._id,
      status: request.status,
      dealType: request.dealType,
      note: request.note,
      createdAt: request.createdAt,
      decidedAt: request.decidedAt,
      propertyId: request.propertyId,
      propertyExists: Boolean(property),
      title: property?.title ?? "Deleted property",
      price: property?.price,
      listingType: property?.listingType,
      pic: property?.pic,
      propertyStatus: deal === "rent" ? "rented" : deal ? "sold" : "available",
      name: user?.name ?? "Unknown user",
      email: user?.email,
      contact: user?.contact,
    };
  });
  return send(res, 200, "Data fetched successfully.", data);
});

// Approving a request creates the deal (the property becomes sold or rented)
// and turns down every other pending request for the same property.
requestRoute.post("/admin-approve-request", adminOnly, async (req, res) => {
  const id = str(req.body?._id);
  if (!isObjectId(id)) return send(res, 400, "Invalid request id.");

  // Claim the request first, so it cannot be approved twice.
  const request = await requestModel.findOneAndUpdate(
    { _id: id, status: "pending" },
    { status: "approved", decidedAt: new Date() },
    { new: true }
  );
  if (!request) {
    return (await requestModel.exists({ _id: id }))
      ? send(res, 409, "This request has already been handled.")
      : send(res, 404, "Request not found.");
  }

  const reject = (note) =>
    requestModel.updateOne({ _id: id }, { status: "rejected", note, decidedAt: new Date() });

  if (!(await propertyModel.exists({ _id: request.propertyId }))) {
    await reject("The property no longer exists.");
    return send(res, 404, "The property no longer exists. The request was rejected.");
  }

  let deal;
  try {
    deal = await buyerModel.create({
      userId: request.userId,
      propertyId: request.propertyId,
      dealType: request.dealType,
    });
  } catch (err) {
    // Another request for this property won (approved at the same moment, or
    // the property was already taken).
    if (err.code === 11000) {
      await reject(OTHER_APPROVED_NOTE);
      return send(res, 409, "This property is no longer available. The request was rejected.");
    }
    throw err;
  }

  await requestModel.updateMany(
    { propertyId: request.propertyId, status: "pending" },
    { status: "rejected", note: OTHER_APPROVED_NOTE, decidedAt: new Date() }
  );

  const message =
    request.dealType === "rent"
      ? "Request approved. The property is now rented."
      : "Request approved. The property is now sold.";
  return send(res, 200, message, { request, deal });
});

// Body: { _id, note? }. The note is shown to the user.
requestRoute.post("/admin-reject-request", adminOnly, async (req, res) => {
  const id = str(req.body?._id);
  if (!isObjectId(id)) return send(res, 400, "Invalid request id.");
  const note = str(req.body?.note);
  if (note.length > MAX_NOTE) return send(res, 400, `The note can be ${MAX_NOTE} characters at most.`);

  const request = await requestModel.findOneAndUpdate(
    { _id: id, status: "pending" },
    { status: "rejected", note: note || undefined, decidedAt: new Date() },
    { new: true }
  );
  if (!request) {
    return (await requestModel.exists({ _id: id }))
      ? send(res, 409, "This request has already been handled.")
      : send(res, 404, "Request not found.");
  }
  return send(res, 200, "Request rejected.", request);
});

export default requestRoute;
