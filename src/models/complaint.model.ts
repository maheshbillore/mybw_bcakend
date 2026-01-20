import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema({
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    booking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking",
        required: true,
    },
    complainText: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ["open", "resolved", "escalated"],
        default: "open",
    },
    refundApproved: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    resolvedAt: {
        type: Date,
    },
});

const Complaint = mongoose.model("Complaint", complaintSchema);

export default Complaint;
