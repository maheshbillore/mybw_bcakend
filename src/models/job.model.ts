import mongoose, { Schema, Types } from "mongoose";

interface ILocation {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
}

export interface IJOB {
    serviceId: Types.ObjectId | string;
    bidPartnerIds: Types.ObjectId | [];
    vocationalBannerServiceId: Types.ObjectId | string;
    price: number;
    customerId: Types.ObjectId;
    bookingId: Types.ObjectId;
    ratingId: Types.ObjectId;
    title: string;
    description: string;
    job_date: string;
    job_time: string;
    packageType: string;
    estimated_time: string;
    full_address: string;
    latitude: number;
    longitude: number;
    cancellation_reason: string;
    status: string;
    contact_name: string;
    contact_number: string;
    contact_email: string;
    image: string[];
    applicants: number;
    job_distance: number;
    location: ILocation;
    otp: string;
    inSurgePrice: Boolean;
    isCouponApply: Boolean;
    couponCodeDetails: Object;
    isEmergencyService: Boolean;
    isVocationalBannerService: Boolean;
    jobCreatedAt: Date;
    createdAt: Date;
}

const JobSchema = new Schema<IJOB>(
    {
        serviceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Service",
            required: true,
        },
        bookingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Booking",
            default: null
        },
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        bidPartnerIds: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            }
        ],
        ratingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Rating",
            default: null
        },
        price: {
            type: Number,
            required: true
        },
        title: {
            type: String,
            required: false
        },
        description: {
            type: String,
            required: false
        },
        job_date: {
            type: String,
            required: true
        },
        job_time: {
            type: String,
            required: true
        },
        estimated_time: {
            type: String,
            required: false
        },
        full_address: {
            type: String,
            required: true
        },
        latitude: {
            type: Number,
            required: true
        },
        longitude: {
            type: Number,
            required: true
        },
        contact_name: {
            type: String,
            required: false,
            default: null,
        },
        contact_number: {
            type: String,
            required: false,
            default: null,
        },
        contact_email: {
            type: String,
            required: false,
            default: null,
        },
        cancellation_reason: {
            type: String,
            required: false,
            default: null,
        },
        status: {
            type: String,
            enum: ["pending", "open", "confirmation_Pending", "confirmed", "on_the_Way", "arrived", "paused", "awaiting_material", "awaiting_payment", "in_progress", "completed", "cancelled", "expired"],
            default: "pending",
        },
        applicants: {
            type: Number,
            default: 0,
            min: 0
        },
        job_distance: {
            type: Number,
            default: 0,
            min: 0
        },
        otp: {
            type: String,
            default: null
        },
        location: {
            type: { type: String, enum: ["Point"], default: "Point" },
            coordinates: { type: [Number], required: true }, // [longitude, latitude]
        },
        inSurgePrice: {
            type: Boolean,
            default: false
        },
        isCouponApply: {
            type: Boolean,
            required: false,
        },
        isEmergencyService: {
            type: Boolean,
            required: false,
        },
        isVocationalBannerService: {
            type: Boolean,
            required: false,
        },
        vocationalBannerServiceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Banner",
            required: false
        },

        couponCodeDetails: {
            couponCodeId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "CouponCode",
                required: false
            },
            code: { type: String },
            discount: { type: Number },
            type: { type: String, enum: ["flat", "%"] },
            beforePrice: { type: Number },
            afterPrice: { type: Number },
        },
        image: [{
            type: String,
            required: true
        }]
    }, {
    timestamps: true,
}
)

JobSchema.index({ location: "2dsphere" });
const Job = mongoose.model("Job", JobSchema);
Job.syncIndexes();
export default Job;
