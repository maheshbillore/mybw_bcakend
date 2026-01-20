import mongoose, { Schema } from "mongoose";

export interface IBanner extends Document {
    title: string,
    description: string,
    banner: string,
    bannerType: string,
    status: string,
    validity:Date,
    vocationalBanner:Boolean
}

const BannerSchema = new Schema<IBanner>({
    title: {
        type: String,
        default: null
    },

    description: {
        type: String,
        default: null
    },
    banner: {
        type: String,
        default: null
    },
    bannerType: {
        type: String,
        enum: ["customer", "partner"],
        default: "customer"
    },
    vocationalBanner:{
        type: Boolean,
        default:false
    },
    validity:{
       type:Date,
       default:null
    },
    status: {
        type: String,
        default: "deactive"
    }
})


const Banner = mongoose.model("Banner", BannerSchema);
export default Banner;