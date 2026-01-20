import mongoose from "mongoose";
import Customer from "../models/customer.model.js";
import User from "../models/user.model.js";
import { checkCustomerType, createResponse, createResponseStatus, customerReferralPointDetails, dateFormate, displayJobDateTime, getAdminId, getFormatedDateTime, planRemaingDays, serviceWisePartnerCount, serviceWiseRatingDetails, updateWalletAmount } from "./helper.js";
import Transaction from "../models/transaction.model.js";
import UserSubscription from "../models/user.subscription.model.js";
import { IReferralCode } from "../shared/interface.js";
import Service from "../models/service.model.js";
import Job from "../models/job.model.js";
import logger from "../utils/logger.js";
import fs from "fs";
import path from "path";
import Wallet from "../models/wallet.model.js";
import Booking from "../models/booking.model.js";
import moment from "moment-timezone";
import Rating from "../models/rating.model.js";
import { format } from "timeago.js";
import Partner from "../models/partner.model.js";
import Bookmark from "../models/bookmark.model.js";
import { GenericResponseCode } from "../shared/type.js";
import Category from "../models/category.model.js";
import axios from "axios";
import PaymentMethod from "../models/paymentMethod.model.js";
import Setting from "../models/setting.model.js";
import { increaseServicePartnerAvl } from "./seo_helper.js";

export async function customerRefferalCode(name: string) {
  const time = Date.now().toString();
  const last6 = time.slice(-6);
  const firstName = name.split(" ")[0];
  const referralCode = `${firstName.toUpperCase()}${last6}`;
  const checkCode = await Customer.findOne({ referralCode });
  if (checkCode) {
    customerRefferalCode(name);
  }

  return referralCode;
}

export async function addCustomerSubscriptionPaymentPending(merchantOrderId: any, userSubscription: any) {
  const session = await mongoose.startSession();

  try {
    // Start transaction
    session.startTransaction();


    const amount = userSubscription.payableAmount;

    const admin = await User.findOne({ role: "admin" }).session(session);
    if (!admin) {
      await session.abortTransaction();
      return createResponse(false, null, "Admin not found");
    }

    const customerTransactionPayload = {
      customerId: new mongoose.Types.ObjectId(userSubscription.userId),
      // adminId: admin._id,
      paymentforSubscription: userSubscription._id,
      gatewayId: userSubscription?.gatewayId,
      paymentStatus: "PENDING",
      paymentBy: "customer",
      paymentFor: "subscription",
      paymentMethod: "unknown",
      invoiceNo: userSubscription?.invoiceNo,
      paymentGateway: "PHONEPE",
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
      paymentStatus: "PENDING",
      paymentBy: "customer",
      paymentFor: "subscription",
      paymentMethod: "unknown",
      invoiceNo: userSubscription?.invoiceNo,
      gatewayId: userSubscription?.gatewayId,
      paymentGateway: "PHONEPE",
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


export async function customerSubscriptionPaymentCompleted(merchantOrderId: any, response: any) {

  const session = await mongoose.startSession();
  try {
    await session.startTransaction();
    const userSubscription = await UserSubscription.findOne({ merchantOrderId }).session(session);
    if (!userSubscription) {
      await session.abortTransaction();
      return createResponse(false, null, 'User subscription not found');
    }

    if (response?.state === "COMPLETED") {
      const checkCurrentPlan = await UserSubscription.findOne({
        userId: userSubscription.userId,
        status: "active",
        endDate: { $lte: new Date() }
      });
      userSubscription.status = checkCurrentPlan ? "in_queue" : "active";
      await userSubscription.save({ session });

      const admin = await User.findOne({ role: "admin" }).session(session);
      if (!admin) {
        await session.abortTransaction();
        return createResponse(false, null, "Admin not found");
      }

      const customerTransaction = await Transaction.findOne({ merchantOrderId, transactionType: "debited" }).session(session);

      if (customerTransaction) {
        customerTransaction.paymentGateway = "PHONEPE";
        customerTransaction.transactionId = response?.paymentDetails[0].transactionId;
        customerTransaction.paymentMethod = response?.paymentDetails[0].paymentMode;
        customerTransaction.paymentStatus = response?.state;
        customerTransaction.particular = "Payment! Subscription amount";
        await customerTransaction.save();
      }

      const adminTransactions = await Transaction.deleteMany(
        { merchantOrderId, transactionType: "credited" }
      ).session(session);


      const adminTransactionPayload = {
        adminId: admin._id,
        paymentforSubscription: userSubscription._id,
        amount: customerTransaction?.amount,
        gatewayId: customerTransaction?.gatewayId,
        invoiceNo: customerTransaction?.invoiceNo,
        merchantOrderId: customerTransaction?.merchantOrderId,
        paymentMethod: response?.paymentDetails[0].paymentMode,
        transactionId: response?.paymentDetails[0].transactionId,
        paymentGateway: "PHONEPE",
        paymentStatus: response?.state,
        paymentBy: "customer",
        paymentFor: "subscription",
        particular: "Received! Subscription amount",
        transactionType: "credited",
      };
      await Transaction.create([adminTransactionPayload], { session });
      // update customer and referer referal point   
    }
    await session.commitTransaction();

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
        console.log(userSubscription.userId, 'userSubscription.userId');
        console.log(userSubscription.referrerBy, 'userSubscription.referrerBy');
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



export async function customerSubscriptionPaymentFaild(merchantOrderId: any, response: any) {

  const session = await mongoose.startSession();

  try {
    await session.startTransaction();
    const userSubscription = await UserSubscription.findOne({ merchantOrderId }).session(session);
    if (!userSubscription) {
      await session.abortTransaction();
      return createResponse(false, null, 'User subscription not found');
    }
    if ((response?.state == "FAILED") || (response?.state == "PENDING")) {
      const customerTransaction = await Transaction.findOne({ merchantOrderId, transactionType: "debited" }).session(session);
      if (customerTransaction) {
        customerTransaction.paymentGateway = "PHONEPE";
        customerTransaction.gatewayId = userSubscription?.gatewayId;
        customerTransaction.transactionId = response?.paymentDetails[0].transactionId;
        customerTransaction.paymentMethod = response?.paymentDetails[0].paymentMode;
        customerTransaction.paymentStatus = response?.state;
        customerTransaction.particular = `${response?.state}! Subscription amount`;
        await customerTransaction.save();
      }

      if (response?.state == "FAILED") {
        const adminTransactions = await Transaction.deleteMany(
          { merchantOrderId, transactionType: "credited" }
        ).session(session);

        const admin = await User.findOne({ role: "admin" }).session(session);
        if (!admin) {
          await session.abortTransaction();
          return createResponse(false, null, "Admin not found");
        }
        const adminTransactionPayload = {
          adminId: admin._id,
          paymentforSubscription: userSubscription._id,
          gatewayId: userSubscription.gatewayId,
          amount: customerTransaction?.amount,
          invoiceNo: customerTransaction?.invoiceNo,
          merchantOrderId: customerTransaction?.merchantOrderId,
          paymentMethod: response?.paymentDetails[0].paymentMode,
          transactionId: response?.paymentDetails[0].transactionId,
          paymentStatus: response?.state,
          paymentGateway: "PHONEPE",
          paymentBy: "customer",
          paymentFor: "subscription",
          particular: `${response?.state}! Subscription amount`,
          transactionType: "credited",
        };

        await Transaction.create([adminTransactionPayload], { session });
      }

    }

    await session.commitTransaction();
    return createResponse(true, null, "Your subscription payment has failed. Please try again or use a different payment method");

  } catch (error: any) {
    await session.abortTransaction();
    return createResponse(false, null, error?.message || "Failed to update subscription payment status");
  } finally {
    session.endSession();
  }

}



export async function checkCustomerSubscriptionPlans(customerId: any) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const now = new Date();
    const activePlan = await Customer.findOne({
      user: customerId,
      subscriptionExpiresAt: { $lt: new Date() },
    });
    console.log(activePlan, 'activePlan 1');
    if (activePlan)
      return true;

    // 1. Expire old subscriptions 

    const response = await UserSubscription.updateMany(
      { userId: customerId, endDate: { $gte: new Date() }, status: "active" },
      { $set: { status: "expired" } },
      { session }
    );
    console.log(response, 'response');
    // 2. Find latest valid subscription
    let subscriptionPlan = await UserSubscription.findOne(
      {
        userId: customerId,
        status: { $in: ["active", "in_queue"] },
        endDate: { $lt: new Date() },
      }
    ).sort({ endDate: 1 });
    console.log(subscriptionPlan, 'subscriptionPlan');

    // 3. Promote to active if needed
    if (subscriptionPlan && subscriptionPlan.status !== "active") {
      subscriptionPlan.status = "active";
      await subscriptionPlan.save({ session });
    }

    // 4. Build update data
    const updateData = subscriptionPlan
      ? {
        isSubscriptionPlaneActive: true,
        activeSubscriptionPlan: subscriptionPlan._id,
        subscriptionExpiresAt: subscriptionPlan.endDate,
      }
      : {
        isSubscriptionPlaneActive: false,
        activeSubscriptionPlan: null,
        subscriptionExpiresAt: null,
      };
    // 5. Update Partner doc
    const updatedPartner = await Customer.findOneAndUpdate(
      { user: customerId },
      { $set: updateData },
      { new: true, session }
    );

    // ✅ Commit all changes
    await session.commitTransaction();
    session.endSession();

    return updatedPartner;
  } catch (error) {
    // ❌ Rollback everything if any step fails
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
}


export async function customerSubscriptionPlanType(customerId: any) {

  const checkUserSubscription: any = await UserSubscription.findOne({ userId: customerId, status: "active" })
    .select("subscriptionPlans")
    .populate("subscriptionPlans", "pricingTiers");
  let pricingTiersType = "Basic";
  if (checkUserSubscription) {
    pricingTiersType = checkUserSubscription?.subscriptionPlans ? checkUserSubscription?.subscriptionPlans?.pricingTiers : "Basic";
  }
  return pricingTiersType;
}


export const isToday = (dateString: string): boolean => {
  const [day, month, year] = dateString.split("/").map(Number);

  const givenDate = new Date(year, month - 1, day);
  const today = new Date();
  return (
    givenDate.getDate() === today.getDate() &&
    givenDate.getMonth() === today.getMonth() &&
    givenDate.getFullYear() === today.getFullYear()
  );
};


export async function checkSurgePricing(job_payload: any, customerId: any) {
  const { job_date, serviceId, job_time } = job_payload;

  const service = await Service.findOne({ _id: serviceId }).select("surgePricing pricingTiers");
  const checkCustomerSubPlan = await customerSubscriptionPlanType(customerId);
  const servicePrice = await checkCustomerType(service, customerId, checkCustomerSubPlan);

  const jobdate = await isToday(job_date);
  //if (jobdate == false)    surge pricing commented
  return { inSurgePrice: false, surgeMultiplier: 1, price: servicePrice, surgeHours: [] };
  /*   surge pricing commented
  const { enabled, surgeMultiplier } = service?.surgePricing || {};
  const surgeHours = service?.surgePricing?.surgeHours || [];
  if (enabled != true)
    return { inSurgePrice: false, surgeMultiplier: 1, price: servicePrice };

  function toMinutes(time: any) {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  }

  const given = toMinutes(job_time);

  const isBetween = surgeHours.some(({ start, end }) => {
    const startMinutes = toMinutes(start);
    const endMinutes = toMinutes(end);
    return given >= startMinutes && given <= endMinutes;
  });
  if (isBetween == false)
    return { inSurgePrice: false, surgeMultiplier: 1, price: servicePrice, };

  return { inSurgePrice: isBetween, surgeMultiplier, price: servicePrice * surgeMultiplier!, surgeHours };
  */
}

export async function customerCouponCodeCalculation(coupon: any, price: any) {

  const { discountType, discountAmount, couponCode } = coupon;
  let totalDiscount = discountAmount;
  let afterDiscountPrice = price;
  if (discountType === 'flat') {
    afterDiscountPrice = Math.max(0, price - discountAmount);
  } else if (discountType === '%') {
    const discount = (price * discountAmount) / 100;
    totalDiscount = discount;
    afterDiscountPrice = Math.max(0, price - discount);
  }

  return {
    "service_price": price.toFixed(2),
    "discount": totalDiscount.toFixed(2),
    "totalPayable": afterDiscountPrice.toFixed(2),
    "discountType": discountType,
    "discountAmount": discountAmount.toFixed(2),
    "couponCodeId": coupon?._id,
    "codeType": "coupon code",
    "couponCode": couponCode
  };
}


export async function markExpiredJobs() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkJob = (await Job.find({
      status: "open",
      $expr: {
        $lt: [
          { $dateFromString: { dateString: "$job_date", format: "%d/%m/%Y" } },
          today
        ]
      }
    }).distinct("_id").lean()).map((id) => id.toString()).join(",");


    const result = await Job.updateMany(
      {
        status: "open",
        $expr: {
          $lt: [
            { $dateFromString: { dateString: "$job_date", format: "%d/%m/%Y" } },
            today
          ]
        }
      },
      { $set: { status: "expired" } }
    );
    logger.info(`count ✅ ${result.modifiedCount} jobs marked as expired ids(${checkJob})`);
  } catch (error) {
    console.error("Error updating expired jobs:", error);
  }
}

export async function getWalletTransaction(query: any, limit: any) {
  const result = await Transaction.find(query).select("paymentMethod transactionId paymentStatus particular amount transactionType createdAt paymentFor updatedAt").sort({ _id: -1 }).limit(Number(limit) || 10).lean();

  const lastId = result?.length > 0 ? result[result.length - 1]._id : null;
  const result1 = await Promise.all(
    result?.map(async (transaction) => {
      let paymentMode = transaction?.paymentMethod;
      let totalAmount = transaction?.amount;
      let createdAt = await moment(transaction?.createdAt).tz("Asia/Kolkata").format('DD MMM, YYYY HH:mm:ss');
      return {
        ...transaction,
        paymentIcon: transaction?.paymentFor,
        paymentMode,
        totalAmount,
        createdAt
      }
    })
  )
  return { allTransaction: result1, lastId }
}

export async function bannerExireyDate(dateString: any) {
  const date = new Date(dateString);

  const day = date.getUTCDate();
  const monthName = date.toLocaleString("en-US", { month: "long" });

  // Convert 1,2,3,... to 1st, 2nd, 3rd...
  const ordinal = (n: any) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const formatted = `${ordinal(day)} ${monthName}`;
  return formatted;
}

export async function customerTotalService(customerId: any) {
  const result = await Booking.aggregate([
    {
      $match: {
        customerId,
        status: "completed"
      }
    },
    {
      $group: {
        _id: null,
        totalAmountSum: { $sum: "$totalAmount" }
      }
    }
  ]);

  const services_amount = result.length > 0 ? result[0].totalAmountSum : 0;
  return services_amount;
}


export async function customerTotalWithdraw(customerId: any) {
  const result = await Wallet.aggregate([
    { $match: { customerId, paymentMethod: "withdraw_request", paymentStatus: "PENDING", walletType: "deducted" } },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: "$amount" }
      }
    }
  ])
  const services_amount = result.length > 0 ? result[0].totalAmount : 0;
  return services_amount;
}



export async function customerWithdrawRequest(customerId: any, request_amount: number, settlementAccountId: any) {
  const session = await mongoose.startSession();
  try {
    await session.startTransaction();

    const adminId = await getAdminId();
    const merchantOrderId = "BW_JOBORD" + Date.now();
    const walletObj = await Wallet.create({
      customerId: customerId,
      settlementAccountId,
      paymentStatus: "PENDING",
      paymentMethod: "WITHDRAW_REQUEST",
      merchantOrderId,
      invoiceNo: `INV${Date.now()}`,
      amount: request_amount,
      particular: "Withdrawal request submitted successfully.",
      walletType: "deducted"
    });

    // Prepare transaction payload
    const adminTransactionPayload = {
      adminId: adminId,
      settlementAccountId,
      walletPayment: walletObj._id,
      amount: walletObj.amount,
      invoiceNo: walletObj.invoiceNo,
      merchantOrderId: walletObj.merchantOrderId,
      transactionId: walletObj.transactionId,
      paymentMethod: "WITHDRAW_REQUEST",
      paymentStatus: "PENDING",
      paymentBy: "partner",
      paymentFor: "withdraw",
      particular: "Received ! Withdraw request",
      transactionType: "credited",
    };

    await Transaction.create([adminTransactionPayload], { session });

    // Prepare transaction payload
    const partnerTransactionPayload = {
      // adminId: adminId,
      settlementAccountId,
      walletPayment: walletObj._id,
      customerId: walletObj.customerId,
      amount: walletObj.amount,
      invoiceNo: walletObj.invoiceNo,
      merchantOrderId: walletObj.merchantOrderId,
      transactionId: walletObj.transactionId,
      paymentMethod: "WITHDRAW_REQUEST",
      paymentStatus: "PENDING",
      paymentBy: "partner",
      paymentFor: "withdraw",
      particular: "Payment! withdraw request",
      transactionType: "debited",
    };
    await Transaction.create([partnerTransactionPayload], { session });

    await session.commitTransaction();
    await updateWalletAmount(customerId);
    return createResponse(true, { withdraw: walletObj }, `Your withdraw request added successfully`);
  } catch (error: any) {
    await session.abortTransaction();
    return createResponse(false, null, error?.message || "Error when add transaction");
  } finally {
    await session.endSession();
  }

}

export async function allStatusArray() {
  const statusOrder = [
    "open",
    "confirmation_Pending",
    "confirmed",
    "on_the_Way",
    "arrived",
    "paused",
    "pending",
    "awaiting_material",
    "awaiting_payment",
    "in_progress",
    "completed",
    "cancelled",
    "expired"
  ];
  return statusOrder;
}

export async function dashboardallJob(query: any, payload: any) {

  const page = Number(payload.page) || 1;
  const limit = Number(payload.limit) || 10;
  const skip = (page - 1) * limit;

  const result = await Job.aggregate([
    // -------------------------
    // 1. LOOKUP CUSTOMER DETAILS
    // -------------------------
    {
      $lookup: {
        from: "users",
        localField: "customerId",
        foreignField: "_id",
        as: "customer"
      }
    },
    {
      $unwind: {
        path: "$customer",
        preserveNullAndEmptyArrays: true
      }
    },

    // -------------------------
    // 2. LOOKUP BOOKING DETAILS
    // -------------------------
    {
      $lookup: {
        from: "bookings",
        localField: "bookingId",
        foreignField: "_id",
        as: "booking"
      }
    },
    {
      $unwind: {
        path: "$booking",
        preserveNullAndEmptyArrays: true
      }
    },

    // -------------------------
    // 3. LOOKUP PARTNER DETAILS INSIDE BOOKING
    // -------------------------
    {
      $lookup: {
        from: "users",
        localField: "booking.partnerId",
        foreignField: "_id",
        as: "partner"
      }
    },
    {
      $unwind: {
        path: "$partner",
        preserveNullAndEmptyArrays: true
      }
    },
    { $match: query },

    // -------------------------
    // 4. GROUP BY STATUS
    // -------------------------
    {
      $group: {
        _id: "$status",
        totalCount: { $sum: 1 },
        data: {
          $push: {
            _id: "$_id",
            jobId: "$jobId",
            status: "$status",
            job_date: "$job_date",
            job_time: "$job_time",
            serviceId: "$serviceId",
            applicants: "$applicants",
            bidPartnerIds: "$bidPartnerIds",
            bookingId: "$bookingId",
            cancellation_reason: "$cancellation_reason",
            contact_email: "$contact_email",
            contact_name: "$contact_name",
            contact_number: "$contact_number",
            title: "$title",
            description: "$description",
            full_address: "$full_address",
            image: "$image",
            price: "$price",
            customer: {
              _id: { $ifNull: ["$customer._id", null] },
              name: { $ifNull: ["$customer.name", null] },
              email: { $ifNull: ["$customer.email", null] },
              phone: { $ifNull: ["$customer.phone", null] }
            },
            partner: {
              _id: { $ifNull: ["$partner._id", null] },
              name: { $ifNull: ["$partner.name", null] },
              email: { $ifNull: ["$partner.email", null] },
              phone: { $ifNull: ["$partner.phone", null] }
            },
            createdAt: "$createdAt",
            updatedAt: "$updatedAt",
          }
        }
      }
    },

    // -------------------------
    // 5. APPLY PAGINATION (limit 10 per page)
    // -------------------------
    {
      $project: {
        status: "$_id",
        totalCount: 1,
        totalPages: { $ceil: { $divide: ["$totalCount", limit] } },
        list: { $slice: ["$data", skip, limit] }
      }
    },
    // Sort by status ascending
    { $sort: { status: 1 } }
  ]);

  let allJobs: any = [];
  result?.forEach((job) => {
    let jobObj = {
      status: job?.status,
      base_url: `${process.env.BASE_URL}/uploads/job-images/`,
      page: 1,
      limit: 10,
      totalPages: Math.ceil(job.totalCount / 10),
      total: job.totalCount,
      list: job.list
    }
    allJobs.push(jobObj);
  })

  const statusOrder = await allStatusArray();
  const orderMap = statusOrder.reduce((acc: any, s, i) => ({ ...acc, [s]: i }), {});

  const filterAllJobs = allJobs.sort((a: any, b: any) =>
    (orderMap[a._id] ?? 9999) - (orderMap[b._id] ?? 9999)
  );

  return filterAllJobs

}

export async function dashboardallJobSearch(query: any, payload: any) {
  let { searchText, status } = payload;
  searchText = typeof searchText === "string" ? searchText.trim() : "";
  const searchRegex = searchText ? new RegExp(searchText, "i") : /.*/; // match all if empty

  const page = Number(payload.page) || 1;
  const limit = Number(payload.limit) || 10;
  const skip = (page - 1) * limit;

  if (searchText != '') {
    query.$or = [
      { contact_email: { $regex: searchText, $options: "i" } },
      { contact_name: { $regex: searchText, $options: "i" } },
      { contact_number: { $regex: searchText, $options: "i" } },
      { description: { $regex: searchText, $options: "i" } },
      { full_address: { $regex: searchText, $options: "i" } },
      { title: { $regex: searchText, $options: "i" } },
      { status: { $regex: searchText, $options: "i" } },
      { "customer.name": { $regex: searchText, $options: "i" } },
      { "customer.email": { $regex: searchText, $options: "i" } },
      { "customer.phone": { $regex: searchText, $options: "i" } },
      { "partner.name": { $regex: searchText, $options: "i" } },
      { "partner.email": { $regex: searchText, $options: "i" } },
      { "partner.phone": { $regex: searchText, $options: "i" } },
    ]
  }

  const allJobStatus = await allStatusArray();
  if (allJobStatus.includes(status)) {
    query.status = status;
  }

  const result = await Job.aggregate([
    // 1. LOOKUP CUSTOMER
    {
      $lookup: {
        from: "users",
        localField: "customerId",
        foreignField: "_id",
        as: "customer"
      }
    },
    { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },

    // 2. LOOKUP BOOKING
    {
      $lookup: {
        from: "bookings",
        localField: "bookingId",
        foreignField: "_id",
        as: "booking"
      }
    },
    { $unwind: { path: "$booking", preserveNullAndEmptyArrays: true } },

    // 3. LOOKUP PARTNER
    {
      $lookup: {
        from: "users",
        localField: "booking.partnerId",
        foreignField: "_id",
        as: "partner"
      }
    },
    { $unwind: { path: "$partner", preserveNullAndEmptyArrays: true } },

    // 4. FACET FOR PAGINATION
    { $match: query },
    {
      $facet: {
        data: [
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              jobId: 1,
              status: 1,
              job_date: 1,
              job_time: 1,
              serviceId: 1,
              applicants: 1,
              bidPartnerIds: 1,
              bookingId: 1,
              cancellation_reason: 1,
              contact_email: 1,
              contact_name: 1,
              contact_number: 1,
              title: 1,
              description: 1,
              full_address: 1,
              image: 1,
              price: 1,
              customer: {
                _id: { $ifNull: ["$customer._id", null] },
                name: { $ifNull: ["$customer.name", null] },
                email: { $ifNull: ["$customer.email", null] },
                phone: { $ifNull: ["$customer.phone", null] }
              },
              partner: {
                _id: { $ifNull: ["$partner._id", null] },
                name: { $ifNull: ["$partner.name", null] },
                email: { $ifNull: ["$partner.email", null] },
                phone: { $ifNull: ["$partner.phone", null] }
              },
              createdAt: 1,
              updatedAt: 1
            }
          }
        ],
        count: [
          { $count: "total" }
        ]
      }
    }
  ]);

  // Format output
  const total = result[0].count[0]?.total || 0;

  let obj = {
    base_url: `${process.env.BASE_URL}/uploads/job-images/`,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    list: result[0].data
  };

  return obj;
}


export async function getJobsGroupedBySubscriptionPlan(query: any, payload: any) {
  const { limit, page } = payload;
  const skip = (page - 1) * limit;
  const result = await Job.aggregate([
    /** JOIN Job → Customer */
    {
      $lookup: {
        from: "customers",
        localField: "customerId",
        foreignField: "user",
        as: "customer"
      }
    },
    { $unwind: "$customer" },

    /** JOIN Customer → UserSubscriptions */
    {
      $lookup: {
        from: "usersubscriptions",
        localField: "customer.activeSubscriptionPlan",
        foreignField: "_id",
        as: "subscription"
      }
    },
    { $unwind: "$subscription" },

    /** JOIN UserSubscriptions → SubscriptionPlans */
    {
      $lookup: {
        from: "subscriptionplans",
        localField: "subscription.subscriptionPlans",
        foreignField: "_id",
        as: "plan"
      }
    },
    { $unwind: "$plan" },

    /**  */

    /** JOIN UserSubscriptions → SubscriptionPlans */
    {
      $lookup: {
        from: "users",
        localField: "customer.user",
        foreignField: "_id",
        as: "user"
      }
    },
    { $unwind: "$user" },

    /** If plan is null → group under "No Active Plan" */
    {
      $addFields: {
        planName: {
          $ifNull: ["$plan.name", "No Active Plan"]
        }
      }
    },

    /** GROUP BY subscription plan name */
    {
      $group: {
        _id: "$plan.name",
        totalJobs: { $sum: 1 },
        jobs: { $push: "$$ROOT" }
      }
    },

    /** Sort groups (optional) */
    { $sort: { _id: 1 } },

    /** Pagination on groups */
    { $skip: skip },
    { $limit: limit },

    /** For each group, return only last 10 jobs sorted by createdAt */
    {
      $project: {
        planName: "$_id",
        totalJobs: 1,
        list: {
          $slice: [
            {
              $map: {
                input: {
                  $sortArray: { input: "$jobs", sortBy: { createdAt: -1 } }
                },
                as: "job",
                in: {
                  _id: "$$job._id",
                  job_date: "$$job.job_date",
                  job_time: "$$job.job_time",
                  title: "$$job.title",
                  description: "$$job.description",
                  status: "$$job.status",
                  createdAt: "$$job.createdAt",
                  customer: {
                    _id: "$$job.customer._id",
                    name: "$$job.user.name",      // Corrected
                    email: "$$job.user.email",    // Corrected
                    phone: "$$job.user.phone"     // Corrected
                  },
                  planName: "$$job.planName"
                }
              }
            },
            10
          ]
        }
      }
    }
  ]);

  let total_subscipriton_job: any = 0;
  let filterResult: any = result.map((job: any) => {
    total_subscipriton_job += job.totalJobs || 0;
    return {
      base_url: `${process.env.BASE_URL}/uploads/job-images/`,
      planName: job?.planName,
      limit: 10,
      page: 1,
      total: job?.totalJobs,
      totalPages: Math.ceil(job?.totalJobs / limit),
      list: job?.list
    }
  })

  const totalJobCount = await Job.countDocuments();
  const no_activePlan_job = totalJobCount - total_subscipriton_job;
  filterResult.push(
    {
      base_url: `${process.env.BASE_URL}/uploads/job-images/`,
      planName: "No Active Plan",
      limit: 10,
      page: 1,
      total: no_activePlan_job,
      totalPages: Math.ceil(no_activePlan_job / limit),
      list: []
    }
  );

  filterResult.push(
    {
      base_url: `${process.env.BASE_URL}/uploads/job-images/`,
      planName: "All Jobs",
      limit: 10,
      page: 1,
      total: totalJobCount,
      totalPages: Math.ceil(totalJobCount / limit),
      list: []
    }
  );

  return filterResult;
};

export async function getAppReviewList(customerId: any, limit: any = 10, query: any = {}) {

  let reviewList = await Rating.aggregate([
    { $match: query },
    {
      $lookup: {
        from: "customers",
        localField: "customerId",
        foreignField: "user",
        as: "customer"
      }
    },
    { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "users",
        localField: "customerId",
        foreignField: "_id",
        as: "user"
      }
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    { $sort: { _id: -1 } },
    { $limit: (Number(limit)) },
    {
      $project: {
        _id: 1,
        customerId: 1,
        rating: 1,
        description: 1,
        "customer.profile": 1,
        "user.name": 1,
        "user.email": 1,
        "user.phone": 1,
        createdAt: 1,
        updatedAt: 1,
      }
    }
  ])

  const hasCompletedBooking = await Job.exists({
    customerId,
    status: "completed"
  });
  let isAppReview = false;
  if (hasCompletedBooking) {
    const alreadyReviewed = await Rating.exists({
      customerId,
      isAppReview: true
    });
    isAppReview = !alreadyReviewed;
  }


  let list = await Promise.all(
    reviewList.map(async (review: any) => {
      const reviewTimeAgo = await format(review?.createdAt.getTime());
      let profileImg = "";
      if (review?.customer?.profile) {
        profileImg = `${process.env.BASE_URL}/uploads/profile/${review?.customer?.profile}`;
      }
      const isMyReview = customerId.toString() === review?.customerId.toString() ? true : false;

      delete review?.customer;
      return {
        _id: review._id,
        name: review?.user?.name,
        profile: profileImg,
        reviewTimeAgo,
        rating: review?.rating,
        description: review?.description,
        isMyReview
      }
    })
  )

  const [totalReviews, totalRatingCount] = await Promise.all([
    Rating.countDocuments({ isAppReview: true, appReview: "customer" }),
    Rating.find({ isAppReview: true, appReview: "customer" }).select("rating")
  ])
  const totalRating = totalRatingCount.reduce((sum: number, r: any) => sum + (r.rating || 0), 0);
  const averageRating = totalRating / totalReviews;
  const lastId = reviewList.length > 0 ? reviewList[reviewList.length - 1]._id : null;
  return {
    isAppReview,
    review: totalReviews,
    averageRating: Number(averageRating.toFixed(1)),
    reviewList: list,
    lastId
  }
}

export async function setPartnerAsOnline(partnerId: any) {
  try {
    const result = await Partner.updateOne(
      { user: partnerId },
      { $set: { isOnline: true } }
    );

    // Check if update happened
    if (result.matchedCount === 0) {
      return { success: false, message: "Partner not found" };
    }

    if (result.modifiedCount === 0) {
      return { success: true, message: "Already online" };
    }

    return { success: true, message: "Status updated to online" };

  } catch (error: any) {
    console.error("Error updating partner:", error);
    return { success: false, error: error.message };
  }
}

export async function getTopTenServices(query: any, limit: any = 10, customerId: any, categoryId: any = null, latitude: any, longitude: any, page: any = 1): Promise<GenericResponseCode<any>> {

  const skip = (Number(page) - 1) * Number(limit);

  const customer = await Customer.findOne({ user: customerId }).select("latitude longitude");
  if (!customer)
    return createResponseStatus(400, null, "customer not found");

  const nearByMeDone = await Service.aggregate([
    {
      $lookup: {
        from: "jobs",
        let: { serviceId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$serviceId", "$$serviceId"] } } },
          { $count: "total" }
        ],
        as: "jobCount"
      }
    },
    {
      $addFields: {
        totalJobs: { $ifNull: [{ $arrayElemAt: ["$jobCount.total", 0] }, 0] }
      }
    },
    // Lookup category
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "category"
      }
    },
    { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
    { $match: query },
    { $sort: { totalJobs: -1 } },
    { $skip: skip },
    { $limit: Number(limit) },
    {
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        "category._id": 1,
        "category.name": 1,
        "category.description": 1,
        metaTitle: 1,
        metaDescripton: 1,
        metaKeyword: 1,
        image: 1,
        isCertificate: 1,
        status: 1,
        pricingTiers: 1,
        price: 1,
        bookmarkStatus: 1,
        isPrepaidService: 1,
        ratingDetails: 1,
        totalJobs: 1
      }
    }
  ]);

  const serviceIds = nearByMeDone.map((service: any) => {
    return service._id.toString();
  })


  const partnerServiceCount = await serviceWisePartnerCount(serviceIds, customerId);

  const bookmarkIds = (await Bookmark.find({ customerId }).distinct("serviceId"))
    .map(id => id.toString());

  let pricingTiersType = await customerSubscriptionPlanType(customerId);


  const serviceRatings = await serviceWiseRatingDetails(serviceIds)
  const increaseServicePartner = await increaseServicePartnerAvl();
  const allJobs = await Promise.all(
    nearByMeDone.map(async (job: any) => {

      if (job?.image) {
        job.image = job?.image
          ? `${process.env.BASE_URL}/uploads/servicesImage/${job?.image}`
          : null;
      }
      job.price = await checkCustomerType(job, customerId, pricingTiersType);

      job.totalRatings = serviceRatings[job?._id?.toString()] ? serviceRatings[job?._id?.toString()].totalRatings : 0;
      job.averageRating = serviceRatings[job?._id?.toString()] ? serviceRatings[job?._id?.toString()].averageRating : 0;

      delete job.pricingTiers;

      let bookmarkStatus: Boolean = false;
      if (bookmarkIds.includes(job?._id.toString())) {
        bookmarkStatus = true;
      }
      const partnerCount = partnerServiceCount[job?._id.toString()] ? partnerServiceCount[job?._id.toString()].totalPartners : 0;

      return {
        _id: job?._id,
        totalJobs: job?.totalJobs,
        serviceId: job?._id,
        serviceName: job?.name,
        image: job?.image,
        categoryId: job?.category?._id,
        categoryName: job?.category?.name,
        title: job?.name,
        description: job?.description,
        bookmarkStatus,
        totalRatings: job.totalRatings,
        price: job?.price,
        averageRating: job?.averageRating,
        workerAvl: (partnerCount + increaseServicePartner)
      };
    })
  )
  const total_service = await Service.countDocuments({ status: "active" });
  const lastId = Number(page) + 1 || 1;
  return createResponseStatus(200, { allJobs, lastId, total_service }, "job fetch successfully");

}




export async function fetchingCustomerSubscriptionPlans(partnerId: any) {
  await checkCustomerSubscriptionPlans(partnerId);
  const activePlane = await UserSubscription.findOne({ userId: partnerId, status: "active" }).select('startDate endDate status subscriptionPlans price discountAmount discountType payableAmount').populate('subscriptionPlans', 'name features price_type currency discription');

  if (activePlane) {
    activePlane.startDate = await dateFormate(activePlane.startDate);
    activePlane.endDate = await dateFormate(activePlane.endDate);
    activePlane.remainingDays = await planRemaingDays(activePlane.endDate);
    if (activePlane.remainingDays < 0) {
      const responseUpdate = await UserSubscription.updateMany(
        { _id: activePlane._id },
        { $set: { status: "expired" } }
      );
      const responseUpdatePartner = await Customer.updateMany(
        { user: partnerId },
        {
          $set: {
            isSubscriptionPlaneActive: false,
            activeSubscriptionPlan: null,
            subscriptionExpiresAt: null
          }
        }
      );
      await fetchingCustomerSubscriptionPlans(partnerId);
    }
  }

  let upcomingPlans = await UserSubscription.find({
    userId: partnerId,
    status: "in_queue",
  })
    .select('startDate endDate status subscriptionPlans price discountAmount discountType payableAmount')
    .populate('subscriptionPlans', 'name features price_type currency discription')
    .sort({ _id: 1 })
    .lean();

  if (upcomingPlans && upcomingPlans.length > 0) {
    upcomingPlans = await Promise.all(
      upcomingPlans.map(async (plan) => {
        return {
          ...plan,
          startDate: await dateFormate(plan.startDate),
          endDate: await dateFormate(plan.endDate),
        }
      })
    );
  }

  let userSubscriptionStatus = "active";
  if (activePlane == null) {
    userSubscriptionStatus = "no_active_plan";
    const checkUserOldPlan = await UserSubscription.countDocuments({ status: "expired", userId: partnerId });
    if (checkUserOldPlan > 0) {
      userSubscriptionStatus = "subscription_expired";
    }
  }

  return { activePlane, upcomingPlans, userSubscriptionStatus }
}

export async function convertAndAddOneHour(timeStr: string) {
  const [hours, minutes] = timeStr.split(":").map(Number);

  const date = new Date();
  date.setHours(hours, minutes);

  date.setHours(date.getHours() + 1);

  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}

export async function formatTime12Hr(timeStr: string) {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m);

  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}


export async function getDisplayJobTime(job_time: string) {
  const original = await formatTime12Hr(job_time);  // "01:00 PM"
  const afterAdd = await convertAndAddOneHour(job_time); // "02:00 PM"
  return `${original}-${afterAdd}`;
}


export async function getBookingPaymentDetails(transactionId: string) {
  let bookingDetail: any = await Booking.findOne({ _id: transactionId })
    .populate({
      path: "jobId",
      model: "Job",
      select: "title description full_address image"
    })
    .populate({
      path: "partnerId",
      model: "User",
      select: "name _id",
    })
    .populate({
      path: "customerId",
      model: "User",
      select: "name _id",
    })
    .populate({
      path: "serviceId",
      model: "Service",
      select: "name description image"
    })
    .populate({
      path: "extraWorkHistory",
      model: "ExtraWork",
      select: "amount workTitle timeTaken description cancellation_reason status",
      localField: "extraWorkHistory",
      foreignField: "_id"
    })
    .select("serviceId job_time customerId jobId booking_date extraWorkAmount extraWorkHistory location partner_availability_time paymentImage paymentMode paymentStatus totalAmount basePrice extraWorkAmount status")
    .lean();
  if (bookingDetail) {
    bookingDetail.booking_date = await displayJobDateTime(bookingDetail?.booking_date);
    bookingDetail.job_time = await formatTime12Hr(bookingDetail?.job_time);
    bookingDetail.partner_availability_time = await formatTime12Hr(bookingDetail?.partner_availability_time);
    bookingDetail.paymentImage = bookingDetail.paymentImage ? `${process.env.BASE_URL}/uploads/paymentImage/${bookingDetail.paymentImage}` : null;

    let jobImages = (bookingDetail?.jobId?.image || []).map((img: string) =>
      `${process.env.BASE_URL}/uploads/job-images/${img}`
    );

    bookingDetail.serviceId.image = bookingDetail.serviceId.image ? `${process.env.BASE_URL}/uploads/servicesImage/${bookingDetail.serviceId.image}` : null;

    bookingDetail.jobId = { ...bookingDetail.jobId, image: jobImages };
  }
  return {
    details: bookingDetail,
    detailsType: "booking"
  };
}

export async function getSubscriptionTransactionDetail(transaction: any) {
  let details: any = {};
  if (transaction?.paymentFor == "subscription") {
    let transRes: any = await Transaction.findOne({ _id: transaction?._id })
      .populate({
        path: "paymentforSubscription",
        select: "subscriptionPlans merchantOrderId price discountAmount discountType payableAmount startDate endDate status paymentGateway",
        populate: {
          path: "subscriptionPlans",    // nested field
          model: "SubscriptionPlans",     // your model name,
          select: "name features discription"
        }
      })
      .select("customerId paymentforSubscription paymentMethod transactionId paymentStatus invoiceNo merchantOrderId particular amount transactionDate")
      .lean();
    details = {
      name: transRes?.paymentforSubscription?.subscriptionPlans?.name,
      features: transRes?.paymentforSubscription?.subscriptionPlans?.features,
      discription: transRes?.paymentforSubscription?.subscriptionPlans?.discription,
      price: transRes?.paymentforSubscription?.price,
      discountType: transRes?.paymentforSubscription?.discountType,
      discountAmount: transRes?.paymentforSubscription?.discountAmount,
      payableAmount: transRes?.paymentforSubscription?.payableAmount,
      startDate: await dateFormate(transRes?.paymentforSubscription?.startDate),
      endDate: await dateFormate(transRes?.paymentforSubscription?.endDate),
      remainingDays: await planRemaingDays(transRes?.paymentforSubscription?.endDate),
      paymentMethod: transRes?.paymentMethod,
      transactionId: transRes?.transactionId,
      paymentStatus: transRes?.paymentStatus,
      invoiceNo: transRes?.invoiceNo,
      particular: transRes?.particular,
      amount: transRes?.amount,
      paymentGateway: transRes?.paymentforSubscription?.paymentGateway,
      merchantOrderId: transRes?.merchantOrderId,
      transactionDate: await getFormatedDateTime(transRes?.transactionDate),
    }
  }
  return {
    details: details,
    detailsType: "subscription"
  };
}

export async function getWalletTransactionDetails(transaction: any) {
  let transRes: any = await Transaction.findOne({ _id: transaction?._id }).populate("settlementAccountId");
  let details = {
    paymentGateway: transRes?.paymentGateway,
    paymentMethod: transRes.paymentMethod,
    transactionId: transRes.transactionId,
    paymentStatus: transRes.paymentStatus,
    invoiceNo: transRes.invoiceNo,
    merchantOrderId: transRes.merchantOrderId,
    particular: transRes.particular,
    amount: transRes.amount,
    settlementAccount: transRes?.settlementAccountId,
    transactionDate: await getFormatedDateTime(transRes?.transactionDate)
  }
  return {
    details: details,
    detailsType: transRes?.paymentFor
  };
}


export async function getSocialLink(service: any) {
  const result: any = await Service.aggregate([
    { $match: { slug: service } },
    {
      $lookup: {
        from: "categorytypes",
        localField: "categorytype",
        foreignField: "_id",
        as: "subcategory"
      }
    },
    { $unwind: { path: "$subcategory", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "category"
      }
    },
    { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        name: 1,
        metaTitle: 1,
        metaDescripton: 1,
        slug: 1,
        "subcategory.slug": 1,
        "category.slug": 1
      }
    }
  ])

  const serviceData = result[0];

  const baseUrl = `https://bharatworker.com/services/${serviceData?.category?.slug || ""
    }/${serviceData?.subcategory?.slug || ""}/${serviceData?.slug}`;

  // Encode message
  const message = encodeURIComponent(serviceData?.metaDescripton || "");

  const shareLinks = {
    whatsapp: `https://api.whatsapp.com/send?text=${message}%20${baseUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${baseUrl}`,
    twitter: `https://twitter.com/intent/tweet?text=${message}%20${baseUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${baseUrl}`,
  };
  return shareLinks;
}



export async function getPartnerAppReviewList(partnerId: any, limit: any = 10, query: any = {}) {

  let reviewList = await Rating.aggregate([
    { $match: query },
    {
      $lookup: {
        from: "partners",
        localField: "partnerId",
        foreignField: "user",
        as: "partner"
      }
    },
    { $unwind: { path: "$partner", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "users",
        localField: "partnerId",
        foreignField: "_id",
        as: "user"
      }
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    { $sort: { _id: -1 } },
    { $limit: (Number(limit)) },
    {
      $project: {
        _id: 1,
        partnerId: 1,
        rating: 1,
        description: 1,
        "partner.profile": 1,
        "user.name": 1,
        "user.email": 1,
        "user.phone": 1,
        createdAt: 1,
        updatedAt: 1,
      }
    }
  ])

  const hasCompletedBooking = await Booking.exists({
    partnerId,
    status: "completed"
  });
  let isAppReview = false;
  if (hasCompletedBooking) {
    const alreadyReviewed = await Rating.exists({
      partnerId,
      appReview: "partner",
      isAppReview: true
    });
    isAppReview = !alreadyReviewed;
  }

  let list = await Promise.all(
    reviewList.map(async (review: any) => {
      const reviewTimeAgo = await format(review?.createdAt.getTime());
      let profileImg = "";
      if (review?.partner?.profile) {
        profileImg = `${process.env.BASE_URL}/uploads/profile/${review?.partner?.profile}`;
      }
      const isMyReview = partnerId.toString() === review?.partnerId.toString() ? true : false;

      delete review?.partner;
      return {
        _id: review._id,
        name: review?.user?.name,
        profile: profileImg,
        reviewTimeAgo,
        rating: review?.rating,
        description: review?.description,
        isMyReview
      }
    })
  )

  const [totalReviews, totalRatingCount] = await Promise.all([
    Rating.countDocuments({ isAppReview: true, appReview: "partner" }),
    Rating.find({ isAppReview: true, appReview: "partner" }).select("rating")
  ])
  const totalRating = totalRatingCount.reduce((sum: number, r: any) => sum + (r.rating || 0), 0);
  const averageRating = totalRating / totalReviews;
  const lastId = reviewList.length > 0 ? reviewList[reviewList.length - 1]._id : null;
  return {
    isAppReview,
    review: totalReviews,
    averageRating: Number(averageRating.toFixed(1)),
    reviewList: list,
    lastId
  }
}

export async function getServiceBookings(serviceIds: any) {
  const result = await Service.aggregate([
    {
      $match: {
        _id: { $in: serviceIds.map((id: any) => new mongoose.Types.ObjectId(id)) }
      }
    },
    {
      $lookup: {
        from: "jobs",                // Jobs collection
        localField: "_id",           // Service._id
        foreignField: "serviceId",   // Jobs.serviceId
        as: "jobs"
      }
    },
    {
      $project: {
        name: 1,
        jobCount: { $size: "$jobs" } // count number of jobs
      }
    }
  ]);

  let filterResult = result?.reduce((acc, item) => {
    acc[item._id.toString()] = item.jobCount;
    return acc;
  }, {})

  return filterResult;
}



export async function serviceTotalpartner(services: any) {
  let serviceIds = services.map((id: any) => new mongoose.Types.ObjectId(id));
  // Convert to strings for Set uniqueness, then back to ObjectId
  serviceIds = [...new Set(serviceIds.map((id: any) => id.toString()))].map((id: any) => new mongoose.Types.ObjectId(id));


  const result = await Partner.aggregate([
    {
      $match: {
        services: { $in: serviceIds } // only partners having these services
      }
    },
    { $unwind: "$services" }, // split array into individual service entries
    {
      $match: {
        services: { $in: serviceIds } // filter again after unwind
      }
    },
    {
      $group: {
        _id: "$services",           // group by serviceId
        totalPartners: { $sum: 1 }  // count how many partners per service
      }
    },
    {
      $project: {
        _id: 0,
        serviceId: "$_id",
        totalPartners: 1
      }
    }
  ]);

  const reduceArray = result.reduce((acc, item) => {
    acc[item.serviceId] = { totalPartners: item.totalPartners }
    return acc;
  }, {})

  return reduceArray;
}


export async function checkAccountNumber(accountNumber: any) {
  const isValidAccountNumber = /^[0-9]{9,18}$/.test(accountNumber);
  return isValidAccountNumber;
}


export async function checkIFSCCode(ifsc: any) {
  const isValidIFSC = /^([A-Z]{4}0[A-Z0-9]{6})$/.test(ifsc);
  return isValidIFSC;
}



export async function getBankDetailsByIFSC(ifscCode: string) {
  try {
    const res = await axios.get(`https://ifsc.razorpay.com/${ifscCode}`);
    // Example response will include branch name, address, bank name, state, etc.
    return res.data;
  } catch (err) {
    console.error("Error fetching IFSC details:", err);
    return null;
  }
}

export const isValidUPIFormat = (upi: string) => {
  return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upi);
};

export async function getPaymentMethod(userId: any) {
  const result = await PaymentMethod.find({ user: userId }).lean();
  let primary: any = await PaymentMethod.findOne({ user: userId, isPrimary: true }).lean();
  let defaultLogo = `${process.env.BASE_URL}`;
  defaultLogo = primary?.method == "BANK" ? `${defaultLogo}/public/bank-logo/BANK.png` : `${defaultLogo}/public/bank-logo/UPI.png`;
  let logo = primary?.bankCode ? `${process.env.BASE_URL}/public/bank-logo/${primary?.bankCode}.png` : defaultLogo;

  let filterResult = result?.map((element: any) => {
    let defaultLogo = `${process.env.BASE_URL}`;
    defaultLogo = element?.method == "BANK" ? `${defaultLogo}/public/bank-logo/BANK.png` : `${defaultLogo}/public/bank-logo/UPI.png`;
    let logo = element?.bankCode ? `${process.env.BASE_URL}/public/bank-logo/${element?.bankCode}.png` : defaultLogo;
    return {
      ...element,
      logo
    }
  });

  return {
    primary: primary ? { ...primary, logo } : null,
    result: filterResult
  }
}

export async function activeGateway() {
  const checkGateway = await Setting.findOne({ type: "gateway", status: "active" }).select("paymentGateway");
  let gateway = "";
  if (checkGateway) {
    gateway = checkGateway?.paymentGateway;
  }
  // gateway = "PHONEPE";
  return gateway;
}


export async function activeGatewayId() {
  const checkGateway = await Setting.findOne({ type: "gateway", status: "active" }).select("_id");
  let gatewayId = null;
  if (checkGateway) {
    gatewayId = checkGateway?._id;
  }
  // gateway = "PHONEPE";
  return gatewayId;
}

export async function searchTransactionList(query: any, payload: any) {
  const page = Number(payload?.page) || 1;
  const limit = Number(payload?.limit) || 10;
  const skip = (page - 1) * limit;
  const result = await Transaction.aggregate([
    // 1️⃣ Sort latest first
    { $sort: { createdAt: -1 } },

    // 2️⃣ Select only required fields
    { $match: query },
    {
      $project: {
        _id: 1,
        paymentMethod: 1,
        transactionId: 1,
        paymentStatus: 1,
        paymentBy: 1,
        paymentFor: 1,
        invoiceNo: 1,
        merchantOrderId: 1,
        particular: 1,
        amount: 1,
        paymentGateway: 1,
        transactionType: 1,
        transactionDate: 1,
        createdAt: 1,
        updatedAt: 1
      }
    },
    // 3️⃣ Facet for pagination + total count
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limit }
        ],
        totalCount: [
          { $count: "count" }
        ]
      }
    }
  ]);

  const total = result[0]?.totalCount[0]?.count || 0;

  let obj = {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    list: result[0]?.data || []
  };

  return obj;

}

export async function getMasterPagination(query: any, payload: any) {
  const schemaObj = "";
  return schemaObj;
}

export async function getCouponCodeUses(query: any) {
   const result = await UserSubscription.aggregate([
  { $match: query }, // Your existing filters
  {
    $group: {
      _id: "$couponCodeId", // Group by couponCodeId
      totalUses: { $sum: 1 } // Count each group
    }
  },
  {
    $project: {
      couponCodeId: "$_id", // Rename _id to couponCodeId
      totalUses: 1,
      _id: 0 // Remove the _id field
    }
  },
  { $sort: { totalUses: -1 } } // Optional: sort by most used
]); 
  const filterData = result?.reduce((acc,item)=>{
    acc[item?.couponCodeId?.toString()] = item?.totalUses;
    return acc;
  },{}) 
  console.log(filterData,'result'); 
  return filterData
}


export function isValidCoupon(code:any) {
  const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
  return regex.test(code);
}
