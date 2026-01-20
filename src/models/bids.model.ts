import mongoose, { Schema, Types } from "mongoose";

export interface IBids extends Document {
    jobId: Types.ObjectId,
    customerId: Types.ObjectId,
    partnerId: Types.ObjectId,
    price: number,
    bidCharge: number,
    bidPaymentStatus: string,
    status: string,
    message: string,
    availableTime: string,
    reson_for_cancel: string
}

const bidSchema = new Schema<IBids>({
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Job",
        required: true
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    partnerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        strict: true
    },
    price: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
    },
    bidCharge: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
    },
    availableTime: {
        type: String,
        required: false,
        default: null
    },
    message: {
        type: String,
        required: false,
        default: null,
    },
    reson_for_cancel: {
        type: String,
        required: false,
        default: null
    },
    bidPaymentStatus: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ["pending", "declined", "accepted", "cancelled", "expired"],
        default: "pending"
    }

}, {
    timestamps: true
});

const Bid = mongoose.model("Bid", bidSchema);
export default Bid;