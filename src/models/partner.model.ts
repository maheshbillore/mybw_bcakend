import mongoose from "mongoose";

const partnerSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    address: {
        type: String,
        default: null,
    },
    latitude: {
        type: Number,
        default: null,
    },
    longitude: {
        type: Number,
        default: null,
    },
    location: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], required: false }, // [longitude, latitude]
    },
    city: {
        type: String,
        default: null,
    },
    state: {
        type: String,
        default: null,
    },
    country: {
        type: String,
        default: null,
    },
    pincode: {
        type: Number,
        default: null,
    },
    bookingHistory: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Booking",
        },
    ],
    paymentHistory: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Payment",
        },
    ],
    complaints: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Complaint",
        },
    ],
    subscriptionPlans: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SubscriptionPlans"
        }
    ],
    referralHistory: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ],
    aadharFront: {
        type: String,
        required: false,
        default: null,
    },
    aadharBack: {
        type: String,
        required: false,
        default: null,
    },
    aadharNo: {
        type: String,
        required: false,
        default: null,
    },
    panFront: {
        type: String,
        required: false,
        default: null,
    },
    panBack: {
        type: String,
        required: false,
        default: null,
    },
    panNo: {
        type: String,
        required: false,
        default: null,
    },
    experienceCertificates: [String],
    kycStatus: {
        type: String,
        enum: ["pending", "approved", "rejected", ""],
        default: "pending",
    },
    kycRejectionReason: {
        type: String,
        default: null,
    },
    skills: [
        {
            serviceId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Service",
            },
            skill: String,
            yearOfExprence: Number,
            experienceCertificates: String,
        },
    ],
    isOnline: {
        type: Boolean,
        default: false,
    },
    profilePendingScreens: {
        type: Number,
        default: 2,
        enum: [0, 1, 2, 3, 4, 5, 6], //0 mean profile is complete 1 pending for profile update 2 pending for skills 5 pending for update work location 6 pending for upload documents
    },
    performanceScore: [Number],
    dob: {
        type: String,
        require: false,
        default: null,
    },
    profile: {
        type: String,
        required: false,
        default: null,
    },
    serviceAreaDistance: {
        type: Number,
        required: false,
        default: null,
        comment: "Service area distance in km",
    },
    isSuspended: {
        type: Boolean,
        default: false,
    },
    category: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
        },
    ],
    services: [  // sub category mean services
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Service",
        },
    ],
    categoryType: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Categorytype",
        },
    ],
    profileCompletion: {
        type: Number,
        default: 0,
    },
    totalExperience: {
        type: Number,
        default: 0
    },
    waitingForApproval: {
        type: Boolean,
        default: false
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false,
        default: null,
    },
    referralCode: {
        type: String,
        required: false,
        default: null,
    },
    referralPoints: {
        type: Number,
        default: 0
    },
    isSubscriptionPlaneActive: {
        type: Boolean,
        default: false
    },
    activeSubscriptionPlan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Usersubscription",
        default: null
    },
    subscriptionExpiresAt: {
        type: String,
        default: null
    },
    baseServiceCharge: {
        type: Number,
        default: 0,
        min: 0
    },
    language: {
        type: String,
        default: null
    },
    rating: {
        type: String,
        default: null
    },
    ratingDetails: {
        type: [
            {
                customerName: String,
                rating: Number,
                review: String,
                date: Date,
                profile: String,
            }],
        default: null
    },
    total_review: {
        type: Number,
        default: 0
    },
    jobs_completed: {
        type: Number,
        default: 0
    },
    professionalSummary: {
        type: String,
        default: null
    },
    languageCode: {
        type: String,
        default: "en_US"
    },
    kycApprovedAt: {
        type: Date,
        default: null
    },
    total_income: {
        type: Number,
        default: 0,
        min: 0
    },
    totalWithdrawRequests: {
        type:Number,
        default:0,
        min:0
    },
    totalWithdrawAmount: {
        type:Number,
        default:0,
        min:0
    },

    wallet_amount: {
        type: Number,
        default: 0,
        min: 0
    },
    wallet_hold_amount: {
        type: Number,
        default: 0,
        min: 0
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
}, {
    timestamps: true
});


partnerSchema.index({ location: "2dsphere" });
const Partner = mongoose.model("Partner", partnerSchema);
Partner.syncIndexes();
export default Partner;
