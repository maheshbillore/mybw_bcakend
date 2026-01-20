import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    booking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking",
    },
    amount: Number,
    status: {
        type: String,
        enum: ["pending", "successful", "failed", "refunded"],
    },
    method: {
        type: String,
        enum: ["UPI", "Card", "NetBanking", "Wallet"],
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
