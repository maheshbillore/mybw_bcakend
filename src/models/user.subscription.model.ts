import mongoose, { Schema, Types } from "mongoose";
import { IReferralCode } from "../shared/interface";


export interface IUserSubscription extends Document {
    userId: Types.ObjectId,
    subscriptionPlans: Types.ObjectId,
    couponCodeId: Types.ObjectId,
    referralcodeId: Types.ObjectId | IReferralCode,
    referrerBy: Types.ObjectId,
    codeType: 'coupon code' | 'referral code' | null,
    referralOrCoupon: string,
    price: number,
    discountAmount: number,
    discountType: 'flat' | '%' | null,
    payableAmount: number,
    merchantOrderId: string,
    startDate: string,
    endDate: string,
    status: 'pending' | 'active' | 'trial' | 'failed' | 'in_queue' | 'expired',
    remainingDays: number,
    transactionId: string,
    paymentGateway: string,
    gatewayId:Types.ObjectId,
    razorpayObj: object,
    invoiceNo: string,
    createdAt?: Date,
    updatedAt?: Date,
}
/*
'pending',      // Awaiting payment/activation
'active',       // Running
'trial',        // Free trial
'in_queue',     // Scheduled after current one ends
'cancelled',    // Cancelled by user/admin
'expired',      // Time is over
'paused',       // Temporarily halted
'failed',       // Payment or setup failed
'refunded',     // Money returned
'upcoming',     // Future scheduled plan
'on_hold'       // Blocked due to issue
*/
const userSubscription = new Schema<IUserSubscription>({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    gatewayId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Setting",
        default: null,
        index: true
    },
    subscriptionPlans: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SubscriptionPlans",
        required: true
    },
    couponCodeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CouponCode",
        default: null
    },
    referralcodeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ReferralCode",
        default: null
    },
    referrerBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    codeType: {
        type: String,
        enum: ['coupon code', 'referral code', null],
        default: null
    },
    referralOrCoupon: {
        type: String,
        default: null
    },
    merchantOrderId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    price: {
        type: Number,
        required: false,
        default: 0
    },
    discountAmount: {
        type: Number,
        required: false,
        default: 0
    },
    discountType: {
        type: String,
        enum: ['flat', '%', null],
        default: null
    },
    payableAmount: {
        type: Number,
        required: false,
        default: 0
    },
    startDate: {
        type: String,
        required: true
    },
    endDate: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'active', 'trial', 'failed', 'in_queue', 'expired'],
        default: 'pending'
    },
    remainingDays: {
        type: Number,
        default: 0
    },
    transactionId: {
        type: String,
        required: false
    },
    invoiceNo: {
        type: String,
        required: false
    },
    paymentGateway: {
        type: String,
        enum: ["PHONEPE", "RAZORPAY"],
        required: false,
        default: "PHONEPE"
    },
    razorpayObj: {
        type: Object,
        default: () => ({})
    },
},
    { timestamps: true }
)


mongoose.connection.once('open', async () => {
    try {
        const collection = mongoose.connection.collection('usersubscriptions'); // collection names are usually lowercase & plural

        const indexes = await collection.indexes();
        await collection.dropIndex("merchantTransactionId_1");
        await collection.dropIndex('orderId_1'); // most likely name  
    } catch (err: any) {
        //   console.error('Error dropping index:', err.message);
    }
});

const UserSubscription = mongoose.model("Usersubscription", userSubscription);

export default UserSubscription;   