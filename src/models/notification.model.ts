import mongoose from "mongoose";
import { Types } from "mongoose";


export interface INotification extends Document {
    userId: Types.ObjectId,
    title: string,
    description: string,
    jobId: Types.ObjectId,
    isRead: boolean
}

const notificationSchema = new mongoose.Schema<INotification>(
    {
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        jobId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Job",
            default: null
        },
        isRead: {
            type: Boolean,
            default: false
        },
    },
    { timestamps: true }
);

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
