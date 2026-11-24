import mongoose from "mongoose";
import { isObjectId } from "../utils/validate.js";

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
    price: { type: String },
    area: { type: String },
    description: { type: String },
    location: { type: String },
    pic: { type: String },
  },
  { timestamps: true }
);

export const propertyModel = mongoose.model("properties", propertySchema);

const buyerSchema = new mongoose.Schema(
  {
    userId: { type: String },
    // unique: a property can only be bought once, even when two buy requests
    // arrive at the same moment.
    propertyId: { type: String, unique: true },
  },
  { timestamps: true }
);

export const buyerModel = mongoose.model("buyers", buyerSchema);

// Loads documents by id and returns them as a Map keyed by the id string.
// Invalid ids (older records can hold undefined) are skipped.
export const findByIds = async (model, ids) => {
  const validIds = [...new Set(ids)].filter(isObjectId);
  const docs = await model.find({ _id: { $in: validIds } });
  return new Map(docs.map((doc) => [String(doc._id), doc]));
};
