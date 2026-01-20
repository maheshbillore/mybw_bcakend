import mongoose, { Types } from "mongoose";

export interface IBookmark extends Document {
    partnerId: Types.ObjectId,
    customerId: Types.ObjectId,
    jobId: Types.ObjectId,
    serviceId: Types.ObjectId,
}

const BookmarkSchema = new mongoose.Schema<IBookmark>({
    partnerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: false,
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: false,
    },
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "job",
        required: false,
    },
    serviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
        required: false,
    },
}, {
    timestamps: true
})

const Bookmark = mongoose.model("Bookmark", BookmarkSchema);
export default Bookmark;