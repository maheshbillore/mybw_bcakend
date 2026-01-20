import mongoose, { Schema, Types } from "mongoose";


export interface IWallet extends Document {
    customerId: Types.ObjectId,
    partnerId: Types.ObjectId,
    adminId: Types.ObjectId,
    jobId: Types.ObjectId,
    bookingId: Types.ObjectId,
    extraWorkId: Types.ObjectId,
    settlementAccountId: Types.ObjectId,
    bidId: Types.ObjectId,
    merchantOrderId: string,
    transactionId: string,
    paymentMethod: string,
    paymentStatus: string,
    invoiceNo: string,
    amount: number,
    transactionDate: Date,
    walletType: string,
    orderId: string,
    particular: string,
    paymentGateway: string,
    gatewayId: Types.ObjectId,
    razorpayObj: object,
    referral_points_redeemed: number,
    redeemRateId: Types.ObjectId,

}

const WalletSchema = new Schema<IWallet>({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
        index: true
    },
    gatewayId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Setting",
        default: null,
        index: true
    },
    partnerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
        index: true
    },
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
        index: true
    },
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Job",
        default: null,
        index: true
    },
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking",
        default: null,
        index: true
    },
    extraWorkId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ExtraWork",
        default: null,
    },
    bidId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Bid",
        default: null,
    },
    merchantOrderId: {
        type: String,
        required: true
    },
    transactionId: {
        type: String,
        required: false,
        default: null
    },
    paymentMethod: {
        type: String,
        required: false,
        trim: true,
        lowercase: true,
        default: null
    },
    paymentStatus: {
        type: String,
        enum: ["COMPLETED", "FAILED", "PENDING",
            "REFUNDED", "CANCELLED", "HOLD",
            "created", "authorized", "captured",
            "failed", "refunded", "NETWORK ISSUE"],
        default: "PENDING",
    },
    invoiceNo: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    transactionDate: {
        type: Date,
        default: Date.now,
        required: true,
        index: true,
    },
    walletType: {
        type: String,
        enum: ["added", "deducted"],
        required: true
    },
    orderId: {  // phone pay order id
        type: String,
        required: false,
        default: null
    },
    particular: {
        type: String,
        default: null
    },
    referral_points_redeemed: {
        type: Number,
        required: false
    },
    redeemRateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:"Setting",
        required: false
    },
    settlementAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PaymentMethod",
        default: null
    },
    paymentGateway: {
        type: String,
        enum: ["PHONEPE", "RAZORPAY"],
        required: false,
        default: null
    },
    razorpayObj: {
        type: Object,
        default: () => ({})
    },
},
    {
        timestamps: true
    }
)

const Wallet = mongoose.model("Wallet", WalletSchema);
export default Wallet;