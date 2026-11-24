import express from "express";
import bcrypt from "bcryptjs";
import { userModel, propertyModel, buyerModel, findByIds } from "../model/table.js";
import { authenticate, requireRole, signToken } from "../middleware/auth.js";
import { send } from "../utils/http.js";
import { str, passwordField, passwordError, isEmail, isObjectId } from "../utils/validate.js";
import { getImage, saveImage, removeImage, removeImageIfUnused } from "../utils/upload.js";

const router = express.Router();

const hashPassword = (password) => bcrypt.hash(password, 10);
const isBcryptHash = (value) => /^\$2[aby]\$\d{2}\$/.test(value || "");

// Accounts created before passwords were hashed still store plain text. Those
// are accepted once and replaced with a hash, so nobody has to reset anything.
const checkPassword = async (user, password) => {
  if (!user.password) return false;
  if (isBcryptHash(user.password)) return bcrypt.compare(password, user.password);
  if (user.password !== password) return false;
  user.password = await hashPassword(password);
  await user.save();
  return true;
};

router.post("/user-register", async (req, res) => {
  const body = req.body ?? {};
  const name = str(body.name);
  const email = str(body.email);
  const contact = str(body.contact);
  const address = str(body.address);
  const password = passwordField(body.password);

  if (!name || !contact || !address || !isEmail(email)) {
    return send(res, 400, "Name, a valid email, contact and address are required.");
  }
  const badPassword = passwordError(password);
  if (badPassword) return send(res, 400, badPassword);

  const image = getImage(req, "profile");
  if (image.error) return send(res, image.status, image.error);
  if (!image.file) return send(res, 400, "Profile picture is required.");

  if (await userModel.exists({ email })) {
    return send(res, 409, "User already exists.");
  }

  const profile = await saveImage(image.file);
  try {
    const user = await userModel.create({
      name,
      email,
      password: await hashPassword(password),
      contact,
      address,
      profile,
    });
    return send(res, 200, "User registered successfully.", user);
  } catch (err) {
    await removeImage(profile);
    throw err;
  }
});

router.post("/login", async (req, res) => {
  const body = req.body ?? {};
  const email = str(body.email);
  const password = passwordField(body.password);
  if (!email || !password) {
    return send(res, 400, "Email and password are required.");
  }

  const user = await userModel.findOne({ email }).select("+password");
  if (!user || !(await checkPassword(user, password))) {
    return send(res, 401, "Invalid credentials.");
  }
  // Checked after the password so the blocked status is only revealed to the
  // account owner.
  if (user.isBlocked) {
    return send(res, 403, "Your account has been blocked. Please contact us.");
  }

  return send(res, 200, "Login successful.", { token: signToken(user), user });
});

// Updates the logged-in user's own profile. The email is the login identity
// and cannot be changed here. Password and picture are optional: leave them
// out to keep the current ones.
router.put("/user-update", authenticate, async (req, res) => {
  const body = req.body ?? {};
  const name = str(body.name);
  const contact = str(body.contact);
  const address = str(body.address);
  const password = passwordField(body.password);

  if (!name || !contact || !address) {
    return send(res, 400, "Name, contact and address are required.");
  }
  if (password) {
    const badPassword = passwordError(password);
    if (badPassword) return send(res, 400, badPassword);
  }

  const image = getImage(req, "profile");
  if (image.error) return send(res, image.status, image.error);

  const update = { name, contact, address };
  if (password) update.password = await hashPassword(password);
  if (image.file) update.profile = await saveImage(image.file);

  const oldProfile = req.user.profile;
  const user = await userModel.findByIdAndUpdate(req.user._id, update, { new: true });
  if (image.file) await removeImageIfUnused(oldProfile);

  return send(res, 200, "Profile updated successfully.", user);
});

router.post("/buy", authenticate, requireRole("user"), async (req, res) => {
  const propertyId = str(req.body?.propertyId);
  if (!isObjectId(propertyId)) return send(res, 400, "Invalid property.");

  if (!(await propertyModel.exists({ _id: propertyId }))) {
    return send(res, 404, "Property not found.");
  }
  if (await buyerModel.exists({ propertyId })) {
    return send(res, 409, "Property already sold.");
  }

  try {
    const purchase = await buyerModel.create({
      userId: String(req.user._id),
      propertyId,
    });
    return send(res, 200, "Property bought successfully.", purchase);
  } catch (err) {
    // Another buyer got there between the check above and this insert.
    if (err.code === 11000) return send(res, 409, "Property already sold.");
    throw err;
  }
});

router.post("/user-bought-list", authenticate, async (req, res) => {
  const purchases = await buyerModel.find({ userId: String(req.user._id) });
  const properties = await findByIds(
    propertyModel,
    purchases.map((p) => p.propertyId)
  );

  const data = purchases
    .filter((purchase) => properties.has(purchase.propertyId))
    .map((purchase) => {
      const property = properties.get(purchase.propertyId);
      return {
        _id: purchase._id,
        propertyId: property._id,
        title: property.title,
        price: property.price,
        area: property.area,
        location: property.location,
        description: property.description,
        pic: property.pic,
      };
    });

  return send(res, 200, "Data fetched successfully.", data);
});

export default router;
