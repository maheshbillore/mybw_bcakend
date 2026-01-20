
import crypto from "crypto";
import Wallet from "../models/wallet.model.js";
import { createResponse, customerReferralPointDetails, getAdminId, getPlansDuration, referralPointDetails, updatePartnerWalletAmount, updateWalletAmount } from "./helper.js";
import mongoose from "mongoose";
import { GenericResponse } from "../shared/type.js";
import Transaction from "../models/transaction.model.js";
import UserSubscription from "../models/user.subscription.model.js";
import User from "../models/user.model.js";
import Customer from "../models/customer.model.js";
import { IReferralCode } from "../shared/interface.js";
import Partner from "../models/partner.model.js";
import Setting from "../models/setting.model.js";
import Razorpay from "razorpay";
import logger from "./logger.js";
import { activeGatewayId, checkCustomerSubscriptionPlans } from "./comman.js";


export const rzp_auth = async () => {
    const setting = await Setting.findOne({ type: "gateway", status: "active", paymentGateway: "RAZORPAY" });
    return setting;
};

export const getRazorpayInstance = async () => {
    const setting = await Setting.findOne({ type: "gateway", status: "active", paymentGateway: "RAZORPAY" });

    if (!setting || !setting?.razorpay_key_id) {
        throw new Error("Razorpay settings not found");
    }

    return new Razorpay({
        key_id: setting?.razorpay_key_id,
        key_secret: setting?.razorpay_key_secret,
    });
};

export const initiateRazorpayOrder = async (amount: any) => {
    if (!amount) return { amount: 0, id: "" };
    const razorpay = await getRazorpayInstance();
    const options = {
        amount: Math.round(amount * 100), // rupees -> paise
        currency: "INR",
        receipt: `rcpt_${Date.now()}`,
        payment_capture: 1, // 1 = auto-capture, 0 = manual capture
    };
    const order = await razorpay.orders.create(options);
    return order;
}


export const verifyRazorpayPayment = async (payload: any) => {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
    } = payload;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const rzp_authenticate: any = await rzp_auth();
    const expectedSignature = crypto
        .createHmac("sha256", rzp_authenticate?.razorpay_key_secret)
        .update(body.toString())
        .digest("hex");

    return expectedSignature === razorpay_signature;
}

export const checkRazorpayPaymentStatus = async (paymentId: any) => {
    try {
        const razorpay = await getRazorpayInstance();

        const payment: any = await razorpay.payments.fetch(
            paymentId
        );
        return {
            success: true,
            status: payment.status,   // created | authorized | captured | failed
            amount: payment.amount / 100,
            method: payment.method,
            email: payment.email,
            contact: payment.contact,
            order_id: payment.order_id,
            captured: payment.captured,
            description: payment.description,
            bank: payment.bank,
            acquirer_data: payment.acquirer_data
        };
    } catch (error: any) {
        return {
            success: false,
            message: error.message,
        };
    }

}



export const getOrderPaymentStatus = async (order_id: any) => {
    const razorpay = await getRazorpayInstance();
    const payments = await razorpay.orders.fetchPayments(order_id);

    if (!payments.items.length) {
        return { status: "PENDING", message: "No payment attempt yet" };
    }

    const successPayment = payments.items.find(
        (p) => p.status === "captured"
    );

    if (successPayment) {
        return {
            status: "captured",
            paymentId: successPayment.id,
            method: successPayment.method,
            amount: successPayment.amount,
        };
    }

    const failedPayment = payments.items.find(
        (p) => p.status === "failed"
    );

    if (failedPayment) {
        return {
            status: "FAILED",
            reason: failedPayment.error_description,
        };
    }

    return { status: "PENDING" };
};


export const addInitiateRazorpayWalletOrder = async (orderDetails: any, customerId: any = null, partnerId: any = null) => {

    const adminId = await getAdminId();
    if (!adminId) {
        throw new Error("Admin not found");
    }

    const gatewayId = await activeGatewayId();

    const wallet = await Wallet.create({
        customerId,
        partnerId,
        adminId,
        paymentMethod: "unknown",
        razorpayObj: orderDetails,
        transactionDate: new Date(orderDetails?.created_at * 1000),
        paymentGateway: "RAZORPAY",
        gatewayId,
        paymentStatus: orderDetails?.status,
        merchantOrderId: orderDetails?.id,
        invoiceNo: orderDetails?.receipt,
        amount: orderDetails?.amount / 100,
        walletType: "added"
    });
    const walletTransaction = await addCustomerWalletRazorpayPendingTrasncation(orderDetails?.id, orderDetails);
    return walletTransaction;
}

export async function addCustomerWalletRazorpayPendingTrasncation(merchantOrderId: string, orderDetails: any): Promise<GenericResponse<any>> {
    const session = await mongoose.startSession();
    try {
        await session.startTransaction();
        const walletObj = await Wallet.findOne({ merchantOrderId });

        if (!walletObj)
            return createResponse(false, null, "Wallet details is not found");

        const adminId = await getAdminId();
        if (!adminId) {
            throw new Error("Admin not found");
        }
        // Prepare transaction payload
        const adminTransactionPayload = {
            adminId: adminId,
            walletPayment: walletObj._id,
            gatewayId: walletObj?.gatewayId,
            // customerId: walletObj.customerId,
            bookingId: walletObj?.bookingId,
            amount: walletObj.amount,
            paymentGateway: "RAZORPAY",
            invoiceNo: walletObj.invoiceNo,
            merchantOrderId: walletObj.merchantOrderId,
            transactionId: walletObj.transactionId,
            paymentMethod: "unknown",
            paymentStatus: walletObj?.paymentStatus,
            paymentBy: "customer",
            paymentFor: "wallet",
            particular: "Pending! Wallet amount",
            transactionType: "credited",
        };

        await Transaction.create([adminTransactionPayload], { session });

        // Prepare transaction payload
        const customerTransactionPayload = {
            // adminId: adminId,
            walletPayment: walletObj._id,
            customerId: walletObj.customerId,
            partnerId: walletObj.partnerId,
            bookingId: walletObj?.bookingId,
            amount: walletObj.amount,
            gatewayId: walletObj?.gatewayId,
            paymentGateway: "RAZORPAY",
            invoiceNo: walletObj.invoiceNo,
            merchantOrderId: walletObj.merchantOrderId,
            transactionId: walletObj.transactionId,
            paymentMethod: "unknown",
            paymentStatus: walletObj?.paymentStatus,
            paymentBy: "customer",
            paymentFor: "wallet",
            particular: "Pending! wallet amount",
            transactionType: "debited",
        };
        await Transaction.create([customerTransactionPayload], { session });

        await session.commitTransaction();
        return createResponse(true, null, `Your transaction is currently ${customerTransactionPayload?.paymentStatus}`);
    } catch (error: any) {
        await session.abortTransaction();
        return createResponse(false, null, error?.message || "Error when add transaction");
    } finally {
        await session.endSession();
    }
}




export async function addCustomerRazorpayWalletAmountSuccess(merchantOrderId: string, res: any) {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        const walletObj = await Wallet.findOne({ merchantOrderId }).session(session);
        if (!walletObj) {
            throw new Error("Wallet detail not found");
        }
        // Update wallet details
        Object.assign(walletObj, {
            paymentStatus: res?.captured ? "COMPLETED" : res.status,
            paymentMethod: res?.method,
            razorpayObj: {
                ...walletObj.razorpayObj,
                status: res.status,
                method: res.method,
                bank: res.bank
            },
        });
        await walletObj.save({ session });

        // Get admin
        const adminId = await getAdminId();
        if (!adminId) {
            throw new Error("Admin not found");
        }

        const adminTransactions = await Transaction.deleteMany(
            { merchantOrderId }
        ).session(session);
        // Prepare transaction payload
        const adminTransactionPayload = {
            adminId: adminId,
            walletPayment: walletObj._id,
            // customerId: walletObj.customerId,
            bookingId: walletObj?.bookingId,
            amount: walletObj.amount,
            invoiceNo: walletObj.invoiceNo,
            merchantOrderId: walletObj.merchantOrderId,
            transactionId: walletObj.transactionId,
            paymentMethod: walletObj.paymentMethod,
            paymentStatus: walletObj.paymentStatus,
            gatewayId: walletObj?.gatewayId,
            paymentGateway: "RAZORPAY",
            paymentBy: "customer",
            paymentFor: "wallet",
            particular: "Received! Wallet amount",
            transactionType: "credited",
        };

        await Transaction.create([adminTransactionPayload], { session });

        // Prepare transaction payload
        const customerTransactionPayload = {
            // adminId: adminId,
            walletPayment: walletObj._id,
            customerId: walletObj.customerId,
            bookingId: walletObj?.bookingId,
            amount: walletObj.amount,
            invoiceNo: walletObj.invoiceNo,
            merchantOrderId: walletObj.merchantOrderId,
            transactionId: walletObj.transactionId,
            paymentMethod: walletObj.paymentMethod,
            paymentStatus: walletObj.paymentStatus,
            gatewayId: walletObj?.gatewayId,
            paymentGateway: "RAZORPAY",
            paymentBy: "customer",
            paymentFor: "wallet",
            particular: "Payment! wallet amount",
            transactionType: "debited",
        };
        await Transaction.create([customerTransactionPayload], { session });

        await session.commitTransaction();

        if (walletObj) {
            let customerId: string = walletObj?.customerId.toString();
            await updateWalletAmount(customerId);
        }

        return createResponse(true, null, "Wallet payment added successfully");
    } catch (error: any) {
        await session.abortTransaction();
        return createResponse(false, null, error.message || "Error when adding wallet amount");
    } finally {
        session.endSession();
    }

}

export async function addInitiateRazorpaySubscriptionOrder(subscriptionDetails: any, customerId: any, data: any, res: any, referralcodeid: any = null, referrerId: any = null) {
    const plansDuration = await getPlansDuration(subscriptionDetails, customerId);
    const gatewayId = await activeGatewayId();
    console.log(data, 'data');
    const userSubscription = await UserSubscription.create({
        userId: customerId,
        subscriptionPlans: data.subscriptionplans,
        gatewayId,
        paymentGateway: "RAZORPAY",
        merchantOrderId: res?.id,
        invoiceNo: res?.receipt,
        codeType: data.codeType,
        couponCodeId: data.couponCodeId,
        referralcodeId: referralcodeid,
        referralOrCoupon: data.referralOrCoupon,
        referrerBy: referrerId,
        price: data.planPrice,
        discountAmount: data.discountAmount,
        discountType: data.discountType,
        payableAmount: data.totalPayable,
        razorpayObj: res,
        startDate: plansDuration?.startDate,
        endDate: plansDuration?.endDate,
        status: "pending"
    });

    await addCustomerSubscriptionRazorpayPaymentPending(res?.id, userSubscription, res);

    return userSubscription;
}



export async function addCustomerSubscriptionRazorpayPaymentPending(merchantOrderId: any, userSubscription: any, res: any) {
    const session = await mongoose.startSession();

    try {
        // Start transaction
        session.startTransaction();

        const invoiceNo = `INV${Date.now()}`;
        const amount = userSubscription.payableAmount;

        const admin = await User.findOne({ role: "admin" }).session(session);
        if (!admin) {
            await session.abortTransaction();
            return createResponse(false, null, "Admin not found");
        }

        const checkUser = await User.findOne({ _id: userSubscription.userId }).select("role");

        const customerTransactionPayload = {
            customerId: checkUser?.role == "customer" ? new mongoose.Types.ObjectId(userSubscription.userId) : null,
            partnerId: checkUser?.role == "partner" ? new mongoose.Types.ObjectId(userSubscription.userId) : null,
            // adminId: admin._id,
            paymentforSubscription: userSubscription._id,
            gatewayId: userSubscription?.gatewayId,
            paymentStatus: res?.status,
            paymentBy: "customer",
            paymentFor: "subscription",
            paymentMethod: "unknown",
            paymentGateway: "RAZORPAY",
            invoiceNo: res?.receipt,
            merchantOrderId,
            particular: "Payment! Subscription amount",
            amount,
            transactionType: "debited",
        };

        // Ensure model uses the session
        const customerTransaction = await Transaction.create([customerTransactionPayload], { session });


        const adminTransactionPayload = {
            // customerId: new mongoose.Types.ObjectId(userSubscription.userId),
            adminId: admin._id,
            paymentforSubscription: userSubscription._id,
            paymentStatus: res?.status,
            gatewayId: userSubscription?.gatewayId,
            paymentGateway: "RAZORPAY",
            paymentBy: "customer",
            paymentFor: "subscription",
            paymentMethod: "unknown",
            invoiceNo: res?.receipt,
            merchantOrderId,
            particular: "Payment! Subscription amount",
            amount,
            transactionType: "credited",
        };

        // Ensure model uses the session
        const adminTransaction = await Transaction.create([adminTransactionPayload], { session });

        // Commit the transaction
        await session.commitTransaction();

        return customerTransaction[0]; // Return the created document, not an array
    } catch (error: any) {
        await session.abortTransaction();
        console.error("Transaction failed:", error);
        throw new Error("Failed to add subscription payment: " + error.message);
    } finally {
        await session.endSession();
    }
}



export async function customerRazorpaySubscriptionPaymentCompleted(merchantOrderId: any, response: any) {

    const session = await mongoose.startSession();
    try {
        await session.startTransaction();
        const userSubscription = await UserSubscription.findOne({ merchantOrderId }).session(session);
        if (!userSubscription) {
            await session.abortTransaction();
            return createResponse(false, null, 'User subscription not found');
        }

        const checkCurrentPlan = await UserSubscription.findOne({
            userId: userSubscription.userId,
            status: "active",
            endDate: { $lte: new Date() }
        });
        userSubscription.status = checkCurrentPlan ? "in_queue" : "active";

        userSubscription.razorpayObj = {
            ...userSubscription.razorpayObj,
            status: response?.status,
            method: response?.method,
            bank: response?.bank
        };
        await userSubscription.save({ session });

        const admin = await User.findOne({ role: "admin" }).session(session);
        if (!admin) {
            await session.abortTransaction();
            return createResponse(false, null, "Admin not found");
        }

        const adminTransactions = await Transaction.deleteMany(
            { merchantOrderId }
        ).session(session);

        const userSubscriptionDetails = await UserSubscription.findOne({ merchantOrderId });
        const customerTransactionPayload = {
            customerId: new mongoose.Types.ObjectId(userSubscriptionDetails?.userId),
            paymentforSubscription: userSubscription._id,
            amount: userSubscriptionDetails?.payableAmount,
            transactionDate: response?.created_at ? new Date(response?.created_at * 1000) : new Date(),
            invoiceNo: userSubscriptionDetails?.invoiceNo,
            gatewayId: userSubscriptionDetails?.gatewayId,
            merchantOrderId: userSubscriptionDetails?.merchantOrderId,
            paymentMethod: response?.method,
            transactionId: userSubscriptionDetails?.transactionId,
            paymentStatus: response?.captured ? "COMPLETED" : response.status,
            paymentGateway: "RAZORPAY",
            paymentBy: "customer",
            paymentFor: "subscription",
            particular: "Received! Subscription amount",
            transactionType: "debited",
        };
        await Transaction.create([customerTransactionPayload], { session });


        const adminTransactionPayload = {
            adminId: admin._id,
            paymentforSubscription: userSubscription._id,
            amount: userSubscriptionDetails?.payableAmount,
            invoiceNo: userSubscriptionDetails?.invoiceNo,
            merchantOrderId: userSubscriptionDetails?.merchantOrderId,
            paymentMethod: response?.method,
            transactionDate: response.created_at ? new Date(response?.created_at * 1000) : new Date(),
            transactionId: userSubscriptionDetails?.transactionId,
            paymentStatus: response?.captured ? "COMPLETED" : response.status,
            gatewayId: userSubscriptionDetails?.gatewayId,
            paymentGateway: "RAZORPAY",
            paymentBy: "customer",
            paymentFor: "subscription",
            particular: "Received! Subscription amount",
            transactionType: "credited",
        };
        await Transaction.create([adminTransactionPayload], { session });
        await session.commitTransaction();


        // update customer and referer referal point 
        if (userSubscription?.codeType === "referral code") {
            const referralPoints = await customerReferralPointDetails(userSubscription?.userId?.toString());
            const referrerByPoints = await customerReferralPointDetails(userSubscription?.referrerBy?.toString());

            const subscription = await UserSubscription
                .findOne({ merchantOrderId })
                .populate<{ referralcodeId: Pick<IReferralCode, "referraltoPoint" | "referralFromPoint"> }>(
                    "referralcodeId",
                    "referraltoPoint referralFromPoint"
                )
                .lean(); 
            if (subscription?.referralcodeId) { 
                const [refereeObj, referralObj] = await Promise.all([
                    Customer.findOneAndUpdate(
                        { user: userSubscription?.userId },
                        {
                            $push: { subscriptionPlans: subscription?._id },
                            $set: { referredBy: subscription?.referrerBy, referralPoints: referralPoints?.avilable }
                        },
                        { new: true }
                    ),

                    // Update customer for referrerBy
                    Customer.findOneAndUpdate(
                        { user: subscription?.referrerBy },
                        {
                            $push: { referralHistory: userSubscription.userId },
                            $set: { referralPoints: referrerByPoints?.avilable }
                        },
                        { new: true }
                    )
                ]);
            }
        }
        await checkCustomerSubscriptionPlans(userSubscription.userId);

        return createResponse(true, null, "Payment done successfully");

    } catch (error: any) {
        await session.abortTransaction();
        return createResponse(false, null, error?.message || "Failed to update subscription payment status");
    } finally {
        session.endSession();
    }
}


export async function addPartnerRazorpayWalletAmountSuccess(merchantOrderId: string, res: any) {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        const walletObj = await Wallet.findOne({ merchantOrderId }).session(session);
        if (!walletObj) {
            throw new Error("Wallet detail not found");
        }

        // Update wallet details 
        Object.assign(walletObj, {
            paymentStatus: res?.captured ? "COMPLETED" : res.status,
            paymentMethod: res?.method,
            razorpayObj: {
                ...walletObj.razorpayObj,
                status: res.status,
                method: res.method,
                bank: res.bank
            }
        });
        await walletObj.save({ session });

        // Get admin
        const adminId = await getAdminId();
        if (!adminId) {
            throw new Error("Admin not found");
        }

        const adminTransactions = await Transaction.deleteMany(
            { merchantOrderId }
        ).session(session);
        // Prepare transaction payload
        const adminTransactionPayload = {
            adminId: adminId,
            walletPayment: walletObj._id,
            // customerId: walletObj.customerId, 
            bookingId: walletObj?.bookingId,
            amount: walletObj.amount,
            invoiceNo: walletObj.invoiceNo,
            merchantOrderId: walletObj.merchantOrderId,
            transactionId: walletObj.transactionId,
            paymentMethod: walletObj.paymentMethod,
            paymentStatus: walletObj.paymentStatus,
            gatewayId: walletObj?.gatewayId,
            transactionDate: res.created_at ? new Date(res?.created_at * 1000) : new Date(),
            paymentGateway: "RAZORPAY",
            paymentBy: "partner",
            paymentFor: "wallet",
            particular: "Wallet payment from partner done",
            transactionType: "credited",
        };

        await Transaction.create([adminTransactionPayload], { session });

        // Prepare transaction payload
        const partnerTransactionPayload = {
            // adminId: adminId,
            walletPayment: walletObj._id,
            partnerId: walletObj.partnerId,
            bookingId: walletObj?.bookingId,
            amount: walletObj.amount,
            invoiceNo: walletObj.invoiceNo,
            merchantOrderId: walletObj.merchantOrderId,
            transactionId: walletObj.transactionId,
            paymentMethod: walletObj.paymentMethod,
            paymentStatus: walletObj.paymentStatus,
            transactionDate: res.created_at ? new Date(res?.created_at * 1000) : new Date(),
            paymentGateway: "RAZORPAY",
            gatewayId: walletObj?.gatewayId,
            paymentBy: "partner",
            paymentFor: "wallet",
            particular: "Payment! added wallet",
            transactionType: "debited",
        };
        await Transaction.create([partnerTransactionPayload], { session });

        await session.commitTransaction();

        if (walletObj) {
            let partnerId: string = walletObj?.partnerId.toString();
            await updatePartnerWalletAmount(partnerId);
            // await addBookingStatus(walletObj?.partnerId, walletObj.jobId, "confirmed");
        }

        return createResponse(true, null, "Wallet payment added successfully");
    } catch (error: any) {
        await session.abortTransaction();
        return createResponse(false, null, error.message || "Error when adding wallet amount");
    } finally {
        session.endSession();
    }

}




export async function partnerRazorpaySubscriptionPaymentCompleted(merchantOrderId: any, response: any) {

    const session = await mongoose.startSession();
    try {
        await session.startTransaction();
        const userSubscription = await UserSubscription.findOne({ merchantOrderId }).session(session);
        if (!userSubscription) {
            await session.abortTransaction();
            return createResponse(false, null, 'User subscription not found');
        }
        const userId = userSubscription?.userId;
        const checkCurrentPlan = await UserSubscription.findOne({
            userId: userSubscription.userId,
            status: "active",
            endDate: { $lte: new Date() }
        });
        userSubscription.status = checkCurrentPlan ? "in_queue" : "active";
        userSubscription.razorpayObj = {
            ...userSubscription.razorpayObj,
            status: response?.status,
            method: response?.method,
            bank: response?.bank
        }
        await userSubscription.save({ session });

        const admin = await User.findOne({ role: "admin" }).session(session);
        if (!admin) {
            await session.abortTransaction();
            return createResponse(false, null, "Admin not found");
        }

        const partnerTransaction = await Transaction.findOne({ merchantOrderId, transactionType: "debited" }).session(session);

        if (partnerTransaction) {
            partnerTransaction.transactionId = userSubscription.transactionId;
            partnerTransaction.paymentMethod = response.method;
            partnerTransaction.paymentStatus = response?.captured ? "COMPLETED" : response.status;
            partnerTransaction.paymentGateway = "RAZORPAY";
            partnerTransaction.particular = "Payment! Subscription amount";
            await partnerTransaction.save();
        }

        const adminTransactions = await Transaction.deleteMany(
            { merchantOrderId, transactionType: "credited" }
        ).session(session);


        const adminTransactionPayload = {
            adminId: admin._id,
            paymentforSubscription: userSubscription._id,
            // partnerId: partnerTransaction?.partnerId,
            amount: partnerTransaction?.amount,
            invoiceNo: partnerTransaction?.invoiceNo,
            merchantOrderId: partnerTransaction?.merchantOrderId,
            transactionId: userSubscription.transactionId,
            gatewayId: userSubscription.gatewayId,
            paymentMethod: response.method,
            paymentStatus: response?.captured ? "COMPLETED" : response.status,
            paymentGateway: "RAZORPAY",
            paymentBy: "partner",
            paymentFor: "subscription",
            particular: "Received! Subscription amount",
            transactionType: "credited",
        };
        await Transaction.create([adminTransactionPayload], { session });

        // update partner and referer referal point 
        await session.commitTransaction();

        if (userSubscription?.codeType === "referral code") {
            const referralPoints = await referralPointDetails(userId);
            const referrerByPoints = await referralPointDetails(userSubscription?.referrerBy);
            const subscription = await UserSubscription
                .findOne({ merchantOrderId })
                .populate<{ referralcodeId: Pick<IReferralCode, "referraltoPoint" | "referralFromPoint"> }>(
                    "referralcodeId",
                    "referraltoPoint referralFromPoint"
                )
                .lean();
            if (subscription?.referralcodeId) {
                await Promise.all([
                    // Update Partner for partnerId
                    Partner.findOneAndUpdate(
                        { user: userId },
                        {
                            $push: { subscriptionPlans: subscription?._id },
                            $set: { referredBy: subscription?.referrerBy, referralPoints: referralPoints?.avilable }
                        },
                        { new: true }
                    ),

                    Partner.findOneAndUpdate(
                        { user: subscription?.referrerBy },
                        {
                            $push: { referralHistory: userId },
                            $set: { referralPoints: referrerByPoints?.avilable }
                        },
                        { new: true }
                    )
                ]);
            }
        }


        return createResponse(true, null, "Payment done successfully");

    } catch (error: any) {
        await session.abortTransaction();
        return createResponse(false, null, error?.message || "Failed to update subscription payment status");
    } finally {
        session.endSession();
    }


}


export async function activeGatewayCredencial() {
    const result = await Setting.findOne({ type: "gateway", status: "active" });
    return result;
}

export async function paymentStatusArray() {
    let paymentStatus: any = ["COMPLETED", "FAILED", "PENDING", "HOLD",
        "REFUNDED", "cancelled", "refund_pending", "refund_failed",
        "refund_to_wallet", "WITHDRAW_REQUEST", "created", "authorized",
        "captured", "failed", "refunded", "NETWORK ISSUE"];
    return paymentStatus;
}



export const pendingMessages = async () => {
    return "We’ve received your payment request, but the transaction is still pending. Don’t worry—this usually resolves automatically within a few minutes";
}

