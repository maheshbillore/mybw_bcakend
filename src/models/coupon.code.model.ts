import mongoose, { Schema } from "mongoose";

interface CouponCode extends Document {
    couponCode: string,
    discountAmount: Number,
    discountType: string,
    status: string,
    target: string,
}

const couponCodeSchema = new Schema<CouponCode>({
    couponCode: {
        type: String,
        required: true,
        unique: true
    },
    discountAmount: {
        type: Number,
        required: true
    },
    discountType: {
        type: String,
        enum: ["flat", "%"],
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
    }
},
    { timestamps: true }
)


const CouponCode = mongoose.model("CouponCode", couponCodeSchema);
export default CouponCode;