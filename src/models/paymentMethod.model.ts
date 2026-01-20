import mongoose, { Schema } from "mongoose";
import { Types } from "mongoose";

export interface IPaymentMethod extends Document {
    user: Types.ObjectId;                // user (customer or partner)
    userType: "customer" | "partner" | "admin";
    method: "BANK" | "UPI";

    // UPI Fields
    upiId?: string | null;

    // Bank Fields
    accountHolderName?: string | null;
    accountNumber?: string | null;
    ifscCode?: string | null;
    bankName?: string | null;
    branchAddress?: string | null;
    bankCode?: string | null;
    isPrimary?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

const PaymentMethodSchema = new Schema<IPaymentMethod>({
    user: {
        type: Schema.Types.ObjectId,
        ref: "user",
        required: true
    },

    userType: {
        type: String,
        enum: ["customer", "partner", "admin"],
        required: true
    },

    method: {
        type: String,
        enum: ["BANK", "UPI"],
        required: true
    },

    /* ---------- UPI PAYMENT ---------- */
    upiId: {
        type: String,
        default: null
    },

    /* ---------- BANK PAYMENT ---------- */
    accountHolderName: {
        type: String,
        default: null
    },

    accountNumber: {
        type: String,
        default: null,
        minlength: 10,
        maxlength: 18
    },

    ifscCode: {
        type: String,
        default: null,
        uppercase: true
    },

    bankName: {
        type: String,
        default: null
    },
    branchAddress: {
        type: String,
        default: null
    },
    isPrimary: {
        type: String,
        default: false
    },
    bankCode: {
        type: String,
        default: null
    }
}, { timestamps: true });

export default mongoose.model<IPaymentMethod>("PaymentMethod", PaymentMethodSchema);
