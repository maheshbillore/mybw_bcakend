import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const dbConnection = async () => {
  if (!process.env.MONGODB_URL) {
    throw new Error("MONGODB_URL is not defined in environment variables");
  } 
  await mongoose.connect(process.env.MONGODB_URL);
  console.log("database connected successfully");
};

export default dbConnection;
