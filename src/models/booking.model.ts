import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    partnerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    serviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
        required: true,
    },
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Job",
        required: true
    },
    partner_availability_time: {  // partner available time on job
        type: String,
        required: true,
    },
    job_startAt: {
        type: Date,
        required: false,
        default: null
    },
    job_endAt: {
        type: Date,
        required: false,
        default: null
    },
    booking_date: {
        type: String,
        required: true,
        strict: false
    },
    job_time: {
        type: String,
        required: true,
        strict: false
    },
    location: {
        type: String,
        required: true,
    },
    partner_current_latitude: {  //partner crrent lat
        type: Number,
        required: true
    },
    partner_current_longitude: {
        type: Number,
        required: true
    },
    job_latitude: {
        type: Number,
        required: true
    },
    job_longitude: {
        type: Number,
        required: true
    },
    basePrice: {
        type: Number,
        required: true
    },
    extraWorkAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    totalPaid: {
        type: Number,
        default: 0,
        min: 0
    },
    totalDueAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    totalAmount: {
        type: Number,
        required: true
    },
    totalRefund: {
        type: Number,
        default: 0,
        min: 0
    },
    portalFeePercentage: {
        type: Number,
        default: 0,
        min: 0
    },
    portalFee: {
        type: Number,
        default: 0,
        min: 0
    },
    getNetAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    extraWorkHistory: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ExtraWork",
        },
    ],
    status: {
        type: String,
        enum: ["pending", "confirmed", "on_the_Way", "arrived", "paused", "awaiting_material", "awaiting_payment", "in_progress", "completed", "cancelled"],
        default: "pending",
    },
    paymentStatus: {  // extraWorkPaymentPending
        type: String,
        enum: ["COMPLETED", "FAILED", "PENDING", "HOLD",
            "refunded", "cancelled",
            "refund_pending", "refund_failed", "REFUND_TO_WALLET", "PENDING"],
        default: "PENDING",
    },
    partnerProfile: {
        type: String,
        default: ""
    },
    partnerDetails: {
        type: String,
        default: ""
    },
    paymentImage:{
        type:String,
        default:null
    },
    paymentMode:{
        type:String,
        default:null
    }
},
    { timestamps: true }
);

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;
