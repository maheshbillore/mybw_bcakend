import mongoose, { Schema, Document } from "mongoose";

export interface IContact extends Document {
  name: string;
  email: string;
  phone: string;
  service: string;
  message: string;
  createdAt: Date;
}

const ContactSchema: Schema = new Schema<IContact>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    service: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
  },
  { timestamps: true } // ✅ automatically adds createdAt & updatedAt
);

export default mongoose.model<IContact>("Contact", ContactSchema);