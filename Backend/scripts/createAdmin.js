import "dotenv/config";
import mongoose from "mongoose";
import { dbConnect } from "../config/db.js";
import { userModel } from "../model/table.js";

const ADMIN_EMAIL = "admin@quirex.com";
const ADMIN_PASSWORD = "Admin@123";

const createAdmin = async () => {
  try {
    await dbConnect();

    const adminPayload = {
      name: "Quirex Admin",
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      contact: "9999999999",
      address: "Quirex Admin Panel",
      profile: "",
      userType: "admin",
      updatedAt: new Date(),
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
