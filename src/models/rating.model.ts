import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema(
    {
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
            required: false,
        },
        jobId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Job",
            required: false
        },
        description: {
            type: String,
            required: true,
        },
        isAppReview:{
            type:Boolean,
            default:false
        },
        appReview:{
            type:String,
            enum:["customer","partner",null],
            default:null
        },
        rating: {
            type: Number,
            default: 0
        }
    },
    { timestamps: true }
);

const Rating = mongoose.model("Rating", ratingSchema);
export default Rating;
