import mongoose, { Schema, Types } from "mongoose";

export interface ReferralCode extends Document {
    subscriptionPlans: Types.ObjectId;
    referralFromPoint: number;
    referraltoPoint: number;
    status: string;
    target: string;
    pointToRupee: number;
}

const referalcodeSchema = new Schema<ReferralCode>({
    subscriptionPlans: {
        type: Schema.Types.ObjectId,
        ref: "SubscriptionPlans",
        required: true,
    },
    referralFromPoint: {
        type: Number,
        required: true
    },
    referraltoPoint: {
        type: Number,
        required: true
    },
    target:{
        type:String,
        enum:["customer","partner"],
        default:"partner"
    },
    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active",
    },
    pointToRupee: {
        type: Number,
        required: true
    }
},
    { timestamps: true })


const ReferralCode = mongoose.model<ReferralCode>("ReferralCode", referalcodeSchema);
export default ReferralCode;