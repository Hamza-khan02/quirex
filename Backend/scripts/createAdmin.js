import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { dbConnect } from "../config/db.js";
import { userModel } from "../model/table.js";

// Credentials come from Backend/.env so they are never committed.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@quirex.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const createAdmin = async () => {
  if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) {
    console.error("Set ADMIN_PASSWORD (at least 8 characters) in Backend/.env first.");
    process.exitCode = 1;
    return;
  }

  try {
    await dbConnect();

    const adminPayload = {
      name: "Quirex Admin",
      email: ADMIN_EMAIL,
      password: await bcrypt.hash(ADMIN_PASSWORD, 10),
      contact: "9999999999",
      address: "Quirex Admin Panel",
      profile: "",
      userType: "admin",
    };

    const existingUser = await userModel.findOne({ email: ADMIN_EMAIL });

    if (existingUser) {
      existingUser.set(adminPayload);
      await existingUser.save();
      console.log(`Admin user updated: ${ADMIN_EMAIL}`);
    } else {
      await userModel.create(adminPayload);
      console.log(`Admin user created: ${ADMIN_EMAIL}`);
    }
  } catch (error) {
    console.error("Failed to seed admin user:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

createAdmin();
