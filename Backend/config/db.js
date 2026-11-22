import mongoose from "mongoose";

export const dbConnect = async () => {
  const mongoUri =
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/quirex";

  const conn = await mongoose.connect(mongoUri);
  console.log(
    `Db connected successfully on ${conn.connection.host}/${conn.connection.name}`
  );

  return conn;
};
