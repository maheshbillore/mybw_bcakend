import mongoose from "mongoose";
import { ref } from "process";

const transactionSchema = new mongoose.Schema(
  {
    // Who is making the transaction
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    settlementAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentMethod",
      default: null
    },
    gatewayId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Setting",
      default: null,
      index: true
    },
    paymentforSubscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usersubscription",
      default: null,
    },
    walletPayment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      default: null
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
      index: true
    },
    extraWorkId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExtraWork",
      default: null,
    },
    // Payment details
    paymentMethod: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      default: null,
    },
    transactionId: {
      type: String,
      true: true,
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: [
        "COMPLETED", "FAILED", "PENDING", "HOLD",
        "REFUNDED", "cancelled",
        "refund_pending", "refund_failed", "refund_to_wallet", "WITHDRAW_REQUEST",
        "created", "authorized", "captured", "failed", "refunded", "NETWORK ISSUE"
      ],
      required: true,
      trim: true,
      index: true,
    },
    paymentBy: {
      type: String,
      enum: ["partner", "customer", "admin"],
      required: true,
      lowercase: true,
      trim: true,
    },
    paymentFor: {
      type: String,
      enum: ["subscription", "withdraw", "wallet", "service", "other", "job", "booking", "booking_amount_refund", "extra_work_amount_refund"],
      required: true,
      lowercase: true,
      trim: true,
    },
    // Invoice & transaction
    invoiceNo: {
      type: String,
      required: true,
      // index: true, // Often used in search
      // unique: true, // Add this if each invoice is unique
    },
    merchantOrderId: {
      type: String,
      required: true,
      trim: true,
    },

    particular: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentGateway: {
      type: String,
      enum: ["PHONEPE", "RAZORPAY"],
      required: false,
      default: null
    },
    transactionType: {
      type: String,
      enum: ["debited", "credited"],
      required: true,
      lowercase: true,
      trim: true,
    },
    transactionDate: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    }
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);



const Transaction = mongoose.model("Transaction", transactionSchema);

mongoose.connection.once('open', async () => {
  try {
    const collection = mongoose.connection.collection('transactions'); // collection names are usually lowercase & plural
    const indexes = await collection.indexes();

    // Helper function to drop index if exists
    const dropIndexIfExists = async (indexName: string) => {
      const exists = indexes.some(index => index.name === indexName);
      if (exists) {
        await collection.dropIndex(indexName);
      } else {
      }
    };

    await dropIndexIfExists('invoiceNumber_1');
  } catch (err: any) {
    //   console.error('Error dropping index:', err.message);
  }
});

mongoose.connection.once('open', async () => {
  try {
    const collection = mongoose.connection.collection('transactions');
    await collection.dropIndex('merchantOrderId_1');
  } catch (err: any) {
    console.error('Error dropping index:', err.message);
  }
});
export default Transaction;