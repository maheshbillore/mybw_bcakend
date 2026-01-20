import mongoose from "mongoose";

const SubscriptionPlans = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    features: {
        type: [String],
        required: true,
    },
    mrp: {
        type: Number,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    flat_discount: {
        type: Number,
        required: true,
    },
    percentage_discount: {
        type: Number,
    },
    price_type: {
        type: String,
        required: true,
        enum: ["monthly", "yearly"],
        default: "monthly",
    },
    currency: {
        type: String,
        required: true,
        enum: ["USD", "EUR", "GBP", "INR", "PKR"],
        default: "INR",
    },
    duration: {
        type: Number,
        required: true,
    },
    discription: {
        type: String,
        required: true,
    },
    pricingTiers: {
        type: String,
        enum: ["Basic", "Standard", "Premium"],
        default: null
    },
    target: {
        type: String,
        enum: ["customer", "partner"],
        default: "partner"
    },
    status: {
        type: String,
        required: true,
        enum: ["active", "inactive"],
        default: "active",
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },

});

export default mongoose.model("SubscriptionPlans", SubscriptionPlans);







