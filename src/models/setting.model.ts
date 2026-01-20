import mongoose, { mongo, Schema, Types } from "mongoose";

export interface ISetting extends Document {
    partnerId: Types.ObjectId,
    customerId: Types.ObjectId,
    type: string,  // notification , refferal , etc
    paymentGateway: string,
    job: boolean,
    payment: boolean,
    wallet: boolean,
    service_tips: boolean,
    referrerPoints: number, // Points given to referrer
    refereePoints: number, // Points given to referee (new user)
    target:string,  // customer partner or admin
    pointToRupee: number,
    status: string,
    mode: string,
    razorpay_key_id: string,
    razorpay_key_secret: string,
    merchant_id: string,
    merchant_user_id: string,
    base_url: string,
    redeem_rate:number,
    client_id: string,
    client_secret: string,
}

const settingSchema = new Schema<ISetting>({
    partnerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false
    },
    type: {
        type: String,
        enum: ["notification", "referral", "gateway"],
        required: false
    },
    paymentGateway: {
        type: String,
        enum: ["PHONEPE", "RAZORPAY"],
        required: false, 
    },

    job: {
        type: Boolean,
        required: false
    },
    payment: {
        type: Boolean,
        required: false
    },
    wallet: {
        type: Boolean,
        required: false
    },
    service_tips: {
        type: Boolean,
        required: false
    },
    referrerPoints: {
        type: Number,
        required: false
    }, // Points given to referrer
    target:{
        type:String,
        required:false,
    },
    refereePoints: {
        type: Number,
        required: false
    }, // Points given to referee (new user)
    pointToRupee: {
        type: Number,
        required: false
    },
    status: {
        type: String,
        default: "active"
    },
    mode: {
        type: String,
        required: false
    },
    razorpay_key_id: {
        type: String,
        required: false
    },
    razorpay_key_secret: {
        type: String,
        required: false
    },
    merchant_id: {
        type: String,
        required: false
    },
    merchant_user_id: {
        type: String,
        required: false
    },
    redeem_rate:{
        type:Number,
        required:false
    },
    base_url: {
        type: String,
        required: false
    },
    client_id:{
        type:String,
        required:false
    },
    client_secret:{
        type:String,
        required:false
    }
}, {
    timestamps: true
})

const Setting = mongoose.model("Setting", settingSchema);
export default Setting;