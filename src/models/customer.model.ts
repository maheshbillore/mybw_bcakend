import { longitudeKeys } from "geolib";
import mongoose, { Schema, model, Types } from "mongoose";


interface ILocation {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
}

export interface ICustomer {
    user: Types.ObjectId;
    address?: string;
    latitude?: number;
    longitude?: number;
    city?: string;
    state?: string;
    country?: string;
    pincode?: number;
    profile?: string;
    otp?: string;
    profilePendingScreens?: number;
    dob: string;
    bookingHistory: Types.ObjectId[];
    paymentHistory: Types.ObjectId[];
    referralHistory: Types.ObjectId[];
    complaints: Types.ObjectId[];
    wallet_amount: number;
    wallet_hold_amount: number;
    previousAddressDetails: [string];
    previousContactDetails: [string];
    languageCode: String;
    location: ILocation;
    isGuest: string;
    referredBy: Types.ObjectId;
    referralCode: String;
    referralPoints: Number;
    isSubscriptionPlaneActive: Boolean;
    activeSubscriptionPlan: Types.ObjectId;
    subscriptionExpiresAt: String;
    subscriptionPlans: Types.ObjectId;
    totalWithdrawRequests: Number;
    totalServiceAmount: Number;
    totalWithdrawAmount: Number;
}

const CustomerSchema = new Schema<ICustomer>({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    referralHistory: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ],
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
        coordinates: { type: [Number], required: true }, // [longitude, latitude]
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
    profilePendingScreens: {
        type: Number,
        default: 1,
        enum: [0, 1, 2], //0 complete, 1 pending for update profile, 2 pending for address
    },
    otp: {
        type: String,
    },
    dob: {
        type: String,
        require: false,
        default: null,
    },
    profile: {
        type: String,
        data: null
    },
    bookingHistory: [
        {
            type: Schema.Types.ObjectId,
            ref: "Booking",
        },
    ],
    paymentHistory: [
        {
            type: Schema.Types.ObjectId,
            ref: "Payment",
        },
    ],
    complaints: [
        {
            type: Schema.Types.ObjectId,
            ref: "Complaint",
        },
    ],
    previousAddressDetails: [
        {
            fullAddress: {
                type: String,
                default: null
            },
            latitude: {
                type: Number,
                default: null
            },
            longitude: {
                type: Number,
                default: null
            }
        }
    ],
    previousContactDetails: [
        {
            contactName: {
                type: String,
                default: null,
            },
            contactNumber: {
                type: Number,
                default: null,
            },
            contactEmail: {
                type: String,
                default: null
            }
        }
    ],
    wallet_amount: {
        type: Number,
        default: 0,
        min: 0
    },
    totalWithdrawRequests: {
        type: Number,
        default: 0,
        min: 0
    },
    totalServiceAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    totalWithdrawAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    wallet_hold_amount: {
        type: Number,
        default: 0,
        min: 0
    },
    languageCode: {
        type: String,
        default: "en_US"
    },
    isGuest: {
        type: String,
        default: "false"
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    referralCode: {
        type: String,
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
    subscriptionPlans: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SubscriptionPlans"
        }
    ],
}, {
    timestamps: true
});

const Customer = mongoose.model<ICustomer>("Customer", CustomerSchema);
export default Customer;
