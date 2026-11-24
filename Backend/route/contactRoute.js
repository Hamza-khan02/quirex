import express from "express";
import { contactModel, propertyModel, findByIds } from "../model/table.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { send } from "../utils/http.js";
import { str, isEmail, isObjectId } from "../utils/validate.js";

const contactRoute = express.Router();
const adminOnly = [authenticate, requireRole("admin")];

const MAX_NAME = 100;
const MAX_MESSAGE = 2000;

// Public: the Contact Us form. `propertyId` is optional and links the message
// to the property it is about.
contactRoute.post("/contact", async (req, res) => {
  const body = req.body ?? {};
  const name = str(body.name);
  const email = str(body.email);
  const message = str(body.message);
  const propertyId = str(body.propertyId);

  if (!name || !message || !isEmail(email)) {
    return send(res, 400, "Name, a valid email and a message are required.");
  }
  if (name.length > MAX_NAME || message.length > MAX_MESSAGE) {
    return send(res, 400, `Name can be ${MAX_NAME} and message ${MAX_MESSAGE} characters at most.`);
  }
  if (propertyId && !(isObjectId(propertyId) && (await propertyModel.exists({ _id: propertyId })))) {
    return send(res, 400, "The property this message is about no longer exists.");
  }

  const enquiry = await contactModel.create({
    name,
    email,
    message,
    propertyId: propertyId || undefined,
  });
  return send(res, 200, "Thank you! Your message has been sent.", enquiry);
});

contactRoute.get("/admin-contact-list", adminOnly, async (req, res) => {
  const enquiries = await contactModel.find().sort({ _id: -1 });
  const properties = await findByIds(
    propertyModel,
    enquiries.map((e) => e.propertyId)
  );
  const data = enquiries.map((enquiry) => ({
    ...enquiry.toJSON(),
    propertyTitle: enquiry.propertyId
      ? properties.get(enquiry.propertyId)?.title ?? "Deleted property"
      : null,
  }));
  return send(res, 200, "Data fetched successfully.", data);
});

// Body: { _id, isRead: true | false }
contactRoute.post("/admin-contact-read", adminOnly, async (req, res) => {
  const id = str(req.body?._id);
  const isRead = req.body?.isRead;
  if (!isObjectId(id) || typeof isRead !== "boolean") {
    return send(res, 400, "A message id and isRead (true or false) are required.");
  }
  const enquiry = await contactModel.findByIdAndUpdate(id, { isRead }, { new: true });
  if (!enquiry) return send(res, 404, "Message not found.");
  return send(res, 200, isRead ? "Marked as read." : "Marked as unread.", enquiry);
});

contactRoute.post("/delete-contact", adminOnly, async (req, res) => {
  const id = str(req.body?._id);
  if (!isObjectId(id)) return send(res, 400, "Invalid message id.");
  const enquiry = await contactModel.findByIdAndDelete(id);
  if (!enquiry) return send(res, 404, "Message not found.");
  return send(res, 200, "Message deleted.");
});

export default contactRoute;
