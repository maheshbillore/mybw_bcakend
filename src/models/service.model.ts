import { min } from "lodash";
import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },
        slug: {
            type: String,
            required: true,
            unique: true,
        },

        description: { type: String },

        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true,
        },
        categorytype: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Categorytype",
            required: true,
        },
        isCustomService: {
            type: Boolean,
            require: false,
        },
        pricingTiers: [
            {
                name: {
                    type: String,
                    required: true,
                    enum: ["Basic", "Standard", "Premium"],
                },
                price: {
                    type: Number,
                    required: true,
                },
            },
        ],

        surgePricing: {
            enabled: {
                type: Boolean,
                default: false,
            },
            surgeMultiplier: {
                type: Number,
                default: 1.5,
            },
            surgeHours: [
                {
                    start: {
                        type: String,
                    },
                    end: {
                        type: String,
                    },
                },
            ],
        },

        partnerCommissionRate: {
            type: Number,
            default: 10,
        },

        createdAt: {
            type: Date,
            default: Date.now,
        },
        metaTitle: {
            type: String,
            default: null,
        },
        metaDescripton: {
            type: String,
            default: null,
        },
        metaKeyword: {
            type: String,
            default: null,
        },
        image: {
            type: String,
            default: null,
        },
        isCertificate: {
            type: Boolean,
            default: false,
        },
        bookmarkStatus: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
        },
        isPrepaidService: {
            type: Boolean,
            default: false
        },
        isCouponActive: {
            type: Boolean,
            default: false
        },
        ratingDetails: {
            type: Object,
            default: {
                review: 0,
                averageRating: 0,
                reviewList: []
            }
        },
        price: {
            type: Number,
            default: 0,
            min: 0
        },
        workerAvl: {
            type: Number,
            default: 0,
            min: 0
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    { timestamps: true }
);

const Service = mongoose.model("Service", serviceSchema);
export default Service;
