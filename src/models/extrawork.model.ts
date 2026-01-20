import mongoose, { Types } from "mongoose";

export interface IExtraWork extends Document {
    jobId: Types.ObjectId,
    bookingId: Types.ObjectId,
    workTitle: string,
    workDescription: string,
    amount: number,
    timeTaken: string,
    status: string,
    paymentStatus: string,
}

const ExtraWorkSchema = new mongoose.Schema({
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Job",
        default: null,
    },
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking",
        default: null
    },
    workTitle: {
        type: String,
        required: true
    },
    workDescription: {
        type: String,
        required: false
    },
    amount: {
        type: Number,
        required: false
    },
    timeTaken: {
        type: String,
        default: null
    },

    status: {
        type: String,
        enum: ["pending", "confirmed", "cancelled"],
        default: "pending"
    },
    paymentStatus: {
        type: String,
        enum: ["PENDING","PAYMENT_IN_PROCESS","COMPLETED", "REFUND_TO_WALLET", "FAILED", "refunded", "cancelled",
            "refund_pending", "refund_failed"],
        default: "PENDING",
    },
    cancellation_reason: {
        type: String,
        default: null
    }
},
    { timestamps: true }

)


const ExtraWork = mongoose.model("ExtraWork", ExtraWorkSchema);
export default ExtraWork;