import fs, { access } from "fs";
import path from "path";
import Partner from "../models/partner.model.js";
import User from "../models/user.model.js";
import mongoose, { isObjectIdOrHexString } from "mongoose";
import { getDefaultAutoSelectFamily } from "net";
import { AnyAuthClientConstructor } from "google-auth-library";
import Customer from "../models/customer.model.js";
import ReferralCode from "../models/referral.code.model.js";
import subscriptionPlansModel from "../models/subscriptionPlans.model.js";
import dayjs from 'dayjs';
import _, { forEach, isNull } from "lodash";
import UserSubscription from "../models/user.subscription.model.js";
import Transaction from "../models/transaction.model.js";
import { IReferralCode } from "../shared/interface.js";
import { GenericResponse, GenericResponseCode } from "../shared/type.js";
import Job from "../models/job.model.js";
import Wallet from "../models/wallet.model.js";
import Bid from "../models/bids.model.js";
import fetch from "node-fetch";
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import Booking from "../models/booking.model.js";
import { getPhonePeAccessToken } from "./phonepe.js";
import { format } from "timeago.js";
import geolib from "geolib";
import ExtraWork from "../models/extrawork.model.js";
import moment from "moment-timezone";
import BookingStatus from "../models/booking.status.model.js";
import Bookmark from "../models/bookmark.model.js";
import { sendMultiplePushNotification, sendPushNotification } from "./firebase.js";
import Notification from "../models/notification.model.js";
import Roles from "../models/roles.model.js";
import BidCharges from "../models/bidCharges.model.js";
import Service from "../models/service.model.js";
import Rating from "../models/rating.model.js";
import { checkCustomerSubscriptionPlans, customerSubscriptionPlanType, customerTotalService, customerTotalWithdraw, formatTime12Hr, getDisplayJobTime } from "./comman.js";
import { increaseServicePartnerAvl } from "./seo_helper.js";

// import Job from "../models/job.model.js";

export function isWithinSurgeHours(surgeHours: string[]) {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = `${String(currentHour).padStart(2, "0")}:${String(
    currentMinute
  ).padStart(2, "0")}`;

  return surgeHours.some((range) => {
    const [start, end] = range.split("-");
    return currentTime >= start && currentTime <= end;
  });
}

export function removeOldFile(fileWithFolderPath: string) {
  const oldfilePath = path.join(fileWithFolderPath);
  if (fs.existsSync(oldfilePath)) {
    fs.unlinkSync(oldfilePath);
    return true;
  }
  return false;
}


// Verhoeff algorithm implementation (for Aadhaar checksum)
const d = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
];

const p = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];

const inv = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

function validateVerhoeff(num: string) {
  let c = 0;
  const numArr = num.split('').reverse().map(Number);
  for (let i = 0; i < numArr.length; i++) {
    c = d[c][p[i % 8][numArr[i]]];
  }
  return c === 0;
}

// Main Aadhaar validator
export function isValidAadhaar(aadhaar: string) {
  const regex = /^[2-9]{1}[0-9]{11}$/; // 12 digits, not starting with 0 or 1
  if (!regex.test(aadhaar)) return false;
  return validateVerhoeff(aadhaar);
}

export function isValidPan(pan: string) {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(pan);
}

const profileFields = [
  'skills',
  'dob',
  'profile',
  'serviceAreaDistance',
  'category',
  'services',
  'categoryType',
  'address',
  'city',
  'country',
  'latitude',
  'longitude',
  'pincode',
  'state',
  'aadharNo',
  //'panNo',
  'aadharBack',
  'aadharFront',
  //'panBack',
  //'panFront',
  'name',
  'email',
  'role',
  'phone'
];

async function calculateProfileCompletion(user: any, profileFields: string[], userfield: any): Promise<number> {
  const totalFields = profileFields.length;
  let filledFields = 0;
  profileFields.forEach((field) => {
    let value = user[field];

    // If not found in partner schema, try from user schema
    if (value === undefined && userfield) {
      value = userfield[field];
    }

    // Check value type and count it if it's filled
    if (Array.isArray(value)) {
      if (value.length > 0) filledFields++;
    } else if (typeof value === 'object' && value !== null) {
      if (Object.keys(value).length > 0) filledFields++;
    } else if (value !== undefined && value !== null && value !== '') {
      filledFields++;
    }
  });


  // Calculate completion percentage
  const percentage = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
  return percentage;
}


export async function updateProfileCompletion(partnerId: any) {
  const partner = await Partner.findById(partnerId);
  // Fetch the associated user document
  const userfield = await User.findById(partner?.user); // lean() makes it faster if you just need plain object

  if (!partner) {
    return 0;
  }
  partner.profileCompletion = await calculateProfileCompletion(partner, profileFields, userfield);
  await partner.save();
  return partner.profileCompletion;
}

export function calculateFlatDiscount(mrp: number, price: number) {
  const discount = mrp - price;
  return discount;
}

export function calculatePercentageDiscount(mrp: number, price: number) {
  const discount = ((mrp - price) / mrp) * 100;
  return discount.toFixed(2);
}

export async function checkReferralCode(referralCode: string) {
  const partner = await Partner.findOne({ referralCode: referralCode });
  if (partner) {
    return true;
  }
  return false;
}

export async function generateReferralCode(partnerId: string) {
  const prefix = partnerId.slice(-4); // Last 4 characters of userId (ObjectId)
  const random = Math.random().toString(36).substring(2, 6).toUpperCase(); // 4-char random string
  const referralCode = `${prefix}${random}`; // e.g., "3E9A7XKQ"
  const isReferralCodeAvailable = await checkReferralCode(referralCode);
  if (isReferralCodeAvailable) {
    return generateReferralCode(partnerId);
  }
  return referralCode;
}

export function getYearsExperience(start = 1, end = 12, step = 2) {
  const ranges = [];

  for (let i = start; i < end; i += step) {
    const from = i;
    const to = i + step;
    ranges.push({ value: to, name: `${from} Years - ${to} Years` });
  }

  ranges.push({ value: end + 1, name: `${end} Years - Above ${end} Years` });

  return ranges;
}

export function getDobFormate(dobString: string): string {
  const date = new Date(dobString);

  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  };

  const formattedDate = date.toLocaleDateString('en-GB', options);
  return formattedDate;
}

export function displayJobDateTime(inputDate: string) {
  const output = moment(inputDate, "DD/MM/YYYY").tz("Asia/Kolkata").format("DD MMM YYYY");
  return output;
}

export function calculateAge(dobString: string): number {
  const birthDate = new Date(dobString);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();

  // Adjust if birthday hasn't occurred yet this year
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--;
  }

  return age;
}


export async function getProfile(partnerId: string) {
  try {
    const checkplane = await checkSubscriptionPlans(partnerId);
    const user = await User.findOne({ _id: partnerId }).select("-password");
    let partner = await Partner.findOne({ user: partnerId })
      .populate('category', '_id name image')
      .populate('categoryType', '_id name')
      .populate('services', '_id name')
      .populate('referredBy', '_id name');

    if (partner?.profile) {
      partner.profile = `${process.env.BASE_URL}/uploads/profile/${partner.profile}`;
    }

    if (partner?.category) {
      partner.category.forEach((cat: any) => {
        cat.image = cat.image ? `${process.env.BASE_URL}/uploads/categories/${cat.image}` : null;
      });
    }

    if (partner?.aadharBack) {
      partner.aadharBack = `${process.env.BASE_URL}/uploads/partner-docs/${partner.aadharBack}`;
    }
    if (partner?.aadharFront) {
      partner.aadharFront = `${process.env.BASE_URL}/uploads/partner-docs/${partner.aadharFront}`;
    }
    if (partner?.panBack) {
      partner.panBack = `${process.env.BASE_URL}/uploads/partner-docs/${partner.panBack}`;
    }
    if (partner?.panFront) {
      partner.panFront = `${process.env.BASE_URL}/uploads/partner-docs/${partner.panFront}`;
    }
    if (partner?.experienceCertificates && partner.experienceCertificates.length > 0 && partner.experienceCertificates[0] !== "undefined" && partner.experienceCertificates[0] !== null) {
      partner.experienceCertificates = partner.experienceCertificates.map((certificate: string) => `${process.env.BASE_URL}/uploads/partner-docs/${certificate}`);
    }

    if (partner?.skills) {
      partner?.skills.forEach((element: any) => {
        return element.experienceCertificates = (element?.experienceCertificates != "") && (element?.experienceCertificates != undefined) ? `${process.env.BASE_URL}/uploads/partner-docs/${element?.experienceCertificates}` : '';
      })
    }

    if (partner?.dob) {
      partner.dob = await getDobFormate(partner.dob);
    }

    if (partner?.subscriptionExpiresAt) {
      partner.subscriptionExpiresAt = await dateFormate(partner.subscriptionExpiresAt);
    }

    if (partner?.referralPoints) {
      let referralPoinsts = await referralPointDetails(partnerId);
      partner.referralPoints = referralPoinsts?.avilable;
    }

    return {
      status: true,
      user: user,
      partner: partner,
    }
  } catch (error: any) {
    return {
      status: false,
      user: null,
      partner: null,
    }
  }

}

export async function dateFormate(isoDate: any) {
  const date = new Date(isoDate);
  const formatted = date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return formatted;
}


export async function getCustomer(customerId: any) {

  const [totalServices, subscription] = await Promise.all([
    updateWalletAmount(customerId),
    checkCustomerSubscriptionPlans(customerId),
  ]);

  const customer: any = await Customer.findOne({ user: customerId }).populate("user");
  if (customer) {
    customer.profile = customer.profile
      ? `${process.env.BASE_URL}/uploads/profile/${customer.profile}`
      : "";

    if (customer?.dob) {
      customer.dob = await getDobFormate(customer.dob);
    }


  }
  return customer;
}

export async function removeCountryCode(phone: any) {
  return phone.replace(/^\+91/, '');
}

export async function calculateCouponWithSubscriptionPlanDiscount(coupon: any, subscriptionPlans: any) {

  const { price } = subscriptionPlans;
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
    "planPrice": price.toFixed(2),
    "discount": totalDiscount.toFixed(2),
    "totalPayable": afterDiscountPrice.toFixed(2),
    "discountType": discountType,
    "discountAmount": discountAmount.toFixed(2),
    "couponCodeId": coupon?._id,
    "codeType": "coupon code",
    "referralOrCoupon": couponCode
  };
}

export async function checkReferralDetails(subscriptionPlans: any, referalCodeDetails: any) {
  return {
    "planPrice": subscriptionPlans.mrp.toFixed(2),
    "discount": subscriptionPlans.flat_discount.toFixed(2),
    "totalPayable": subscriptionPlans.price.toFixed(2),
    "discountType": "flat",
    "discountAmount": subscriptionPlans.flat_discount.toFixed(2),
    "referalPoints": referalCodeDetails?.referraltoPoint.toFixed(0),
    "codeType": "referral code",
    "referralOrCoupon": ""
  };
}

export async function createResponse(success: boolean, data: any, message: string) {
  return {
    success, data, message
  }
};

export async function validateFields(data: any, requiredFields: any) {
  const missing = requiredFields.filter((field: any) => {
    return !data[field];
  });
  return missing;
}

export async function getPlansDuration(subscription: any, userId: any) {

  let currentDate = dayjs();
  let activePlanRemainingDays = 0;
  const checkPlans = await UserSubscription.findOne({
    userId: userId,
    status: { $in: ["active", "in_queue"] }
  }).sort({ _id: -1 });

  if (checkPlans?.endDate) {
    activePlanRemainingDays = dayjs(checkPlans.endDate).diff(currentDate, "day") + 1;
  }

  let planDuration = 0;
  if (subscription?.price_type == "monthly") {
    planDuration = 30;
  } else if (subscription?.price_type == "yearly") {
    planDuration = 365;
  }

  planDuration = planDuration + activePlanRemainingDays;

  const startDate = currentDate.add(activePlanRemainingDays, 'day');

  const dateAfter30Days = currentDate.add(planDuration, 'day');

  return {
    "startDate": startDate.toISOString(),
    "endDate": dateAfter30Days.toISOString()
  };
}

export async function fileNameBindWithObject(files: any, extraData: any) {
  _.forEach(files, (file: any) => {
    if (file.fieldname == "aadharFront") {
      extraData.aadharFront = file.filename;
    }
    if (file.fieldname == "aadharBack") {
      extraData.aadharBack = file.filename;
    }
    if (file.fieldname == "panFront") {
      extraData.panFront = file.filename;
    }
    if (file.fieldname == "panBack") {
      extraData.panBack = file.filename;
    }
    if (file.fieldname == "picture") {
      extraData.picture = file.filename;
    }
  });
  return extraData;
}

export async function partnerSubscriptionPaymentCompleted(merchantOrderId: any, response: any) {

  const session = await mongoose.startSession();
  try {
    await session.startTransaction();
    const userSubscription = await UserSubscription.findOne({ merchantOrderId }).session(session);
    if (!userSubscription) {
      await session.abortTransaction();
      return createResponse(false, null, 'User subscription not found');
    }

    let userId = userSubscription.userId;

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

      const partnerTransaction = await Transaction.findOne({ merchantOrderId, transactionType: "debited" }).session(session);

      if (partnerTransaction) {
        partnerTransaction.transactionId = response?.paymentDetails[0].transactionId;
        partnerTransaction.paymentMethod = response?.paymentDetails[0].paymentMode;
        partnerTransaction.paymentStatus = response?.state;
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
        paymentMethod: response?.paymentDetails[0].paymentMode,
        transactionId: response?.paymentDetails[0].transactionId,
        paymentStatus: response?.state,
        paymentBy: "partner",
        paymentFor: "subscription",
        particular: "Received! Subscription amount",
        transactionType: "credited",
      };
      await Transaction.create([adminTransactionPayload], { session });

    }

    await session.commitTransaction();
    // update partner and referer referal point 

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
    const checkplane = await checkSubscriptionPlans(userId);
    return createResponse(true, null, "Payment done successfully");

  } catch (error: any) {
    await session.abortTransaction();
    return createResponse(false, null, error?.message || "Failed to update subscription payment status");
  } finally {
    session.endSession();
  }


}



export async function addSubscriptionPaymentPending(merchantOrderId: any, userSubscription: any) {
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

    const partnerTransactionPayload = {
      partnerId: new mongoose.Types.ObjectId(userSubscription.userId),
      // adminId: admin._id,
      paymentforSubscription: userSubscription._id,
      gatewayId: userSubscription?.gatewayId,
      paymentStatus: "PENDING",
      paymentBy: "partner",
      paymentFor: "subscription",
      paymentGateway: "PHONEPE",
      paymentMethod: "unknown",
      invoiceNo,
      merchantOrderId,
      particular: "Payment! Subscription amount",
      amount,
      transactionType: "debited",
    };

    // Ensure model uses the session
    const partnerTransaction = await Transaction.create([partnerTransactionPayload], { session });

    // Commit the transaction
    await session.commitTransaction();

    return partnerTransaction[0]; // Return the created document, not an array
  } catch (error: any) {
    await session.abortTransaction();
    console.error("Transaction failed:", error);
    throw new Error("Failed to add subscription payment: " + error.message);
  } finally {
    await session.endSession();
  }
}

export async function displayDate(date: any) {
  const formattedDate = date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  return formattedDate;
}

export async function partnerSubscriptionPaymentFaild(merchantOrderId: any, response: any) {

  const session = await mongoose.startSession();

  try {
    await session.startTransaction();
    const userSubscription = await UserSubscription.findOne({ merchantOrderId }).session(session);
    if (!userSubscription) {
      await session.abortTransaction();
      return createResponse(false, null, 'User subscription not found');
    }
    if ((response?.state == "FAILED") || (response?.state == "PENDING")) {
      const partnerTransaction = await Transaction.findOne({ merchantOrderId, transactionType: "debited" }).session(session);
      if (partnerTransaction) {
        partnerTransaction.transactionId = response?.paymentDetails[0].transactionId;
        partnerTransaction.paymentMethod = response?.paymentDetails[0].paymentMode;
        partnerTransaction.paymentStatus = response?.state;
        partnerTransaction.particular = `${response?.state}! Subscription amount`;
        await partnerTransaction.save();
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
          // partnerId: partnerTransaction?.partnerId,
          amount: partnerTransaction?.amount,
          invoiceNo: partnerTransaction?.invoiceNo,
          merchantOrderId: partnerTransaction?.merchantOrderId,
          paymentMethod: response?.paymentDetails[0].paymentMode,
          transactionId: response?.paymentDetails[0].transactionId,
          paymentStatus: response?.state,
          paymentBy: "partner",
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



export async function getReferralHistory(partnerId: any): Promise<GenericResponse<any>> {
  type ReferralData = {
    _id: any;
    userId: { _id: any; name: string } | null; // could be null if not populated
    referralcodeId: { _id: any; referralFromPoint: number } | null; // could be null if not populated
  };

  const data: ReferralData[] = await UserSubscription.find(
    { referrerBy: partnerId, status: { $in: ["active", "in_queue", "expired"] } },
    "userId referralcodeId" // projection
  )
    .populate([
      { path: "userId", select: "name" },
      { path: "referralcodeId", select: "referralFromPoint" }
    ]).sort({ _id: -1 })
    .lean<ReferralData[]>();

  let result = data.map(item => ({
    name: item.userId?.name ?? "Unknown", // safe access with default
    referralFromPoint: item.referralcodeId?.referralFromPoint ?? 0,
    type: "other"
  }));


  const statusFilter = { $in: ["active", "in_queue", "expired"] };
  const baseSelect = "userId subscriptionPlans referrerBy";

  // User earned referral points (someone referred this user)
  const registrationPoint: any = await UserSubscription.findOne({
    userId: partnerId,
    status: statusFilter,
    referrerBy: { $ne: null }
  })
    .select(baseSelect)
    .populate("referralcodeId", "referraltoPoint")
    .populate("userId", "name")
    .lean();

  result.push({
    name: registrationPoint?.userId?.name ?? "Unknown", // safe access with default
    referralFromPoint: registrationPoint?.referralcodeId?.referraltoPoint ?? 0,
    type: "self"
  })



  return {
    success: true,
    data: {
      "referralHistory": result
    },
    message: "fetch successfully"
  };
}

export async function checkSubscriptionPlans(partnerId: any) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const now = new Date();
    const activePlan = await Partner.findOne({
      user: partnerId,
      subscriptionExpiresAt: { $lt: new Date() },
    });
    if (activePlan)
      return true;
    // 1. Expire old subscriptions 

    const response = await UserSubscription.updateMany(
      { userId: partnerId, endDate: { $gte: new Date() }, status: "active" },
      { $set: { status: "expired" } },
      { session }
    );
    // 2. Find latest valid subscription
    let subscriptionPlan = await UserSubscription.findOne(
      {
        userId: partnerId,
        status: { $in: ["active", "in_queue"] },
        endDate: { $lt: new Date() },
      }
    ).sort({ endDate: 1 });
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
    const updatedPartner = await Partner.findOneAndUpdate(
      { user: partnerId },
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

export async function fetchingSubscriptionPlans(partnerId: any) {
  await checkSubscriptionPlans(partnerId);
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
      const responseUpdatePartner = await Partner.updateMany(
        { user: partnerId },
        {
          $set: {
            isSubscriptionPlaneActive: false,
            activeSubscriptionPlan: null,
            subscriptionExpiresAt: null
          }
        }
      );
      await fetchingSubscriptionPlans(partnerId);
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


export async function planRemaingDays(endDate: any) {
  let currentDate = dayjs();
  let activePlanRemainingDays = 0;
  activePlanRemainingDays = dayjs(endDate).diff(currentDate, "day");
  return activePlanRemainingDays;
}

export async function checkCustomerType(service: any, customerId: any = null, pricingTiersType: any = null) {
  let price = 0;
  if (pricingTiersType == "Premium") {
    price = service?.pricingTiers?.[2]?.price;
  } else if (pricingTiersType == "Standard") {
    price = service?.pricingTiers?.[1]?.price;
  } else {
    price = service?.pricingTiers?.[0]?.price;
  }

  return price;
}


export async function getJobDetails(Jobid: any) {
  let updateJob: any = await Job.findById(Jobid)
    .populate({
      path: "serviceId",
      select: "name image categorytype partnerCommissionRate",
      populate: {
        path: "categorytype",
        select: "name"
      }
    }).populate("serviceId.categorytype", "name") // populate only needed fields 
    .lean(); // returns plain JS object  
  if (!updateJob)
    return createResponse(false, null, "Job not found");

  if (!updateJob?.serviceId)
    return createResponse(false, null, "Service not found");

  updateJob.applicants = (await Bid.find({ jobId: Jobid })).length;

  let jobImages = (updateJob?.image || []).map((img: string) =>
    `${process.env.BASE_URL}/uploads/job-images/${img}`
  );
  if (jobImages?.length > 0) {
    updateJob.image = jobImages;
  }

  updateJob.status_name = await getStatusDisplayName(updateJob?.status);

  return updateJob;
}

export async function addCustomerWalletAmountSuccess(merchantOrderId: string, res: any) {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const walletObj = await Wallet.findOne({ merchantOrderId }).session(session);
    if (!walletObj) {
      throw new Error("Wallet detail not found");
    }

    // Update wallet details
    Object.assign(walletObj, {
      transactionId: res?.paymentDetails?.[0]?.transactionId,
      paymentStatus: res?.state,
      orderId: res?.orderId,
      paymentMethod: res?.paymentDetails?.[0]?.paymentMode || "unknown",
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
      paymentGateway: "PHONEPE",
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
      paymentGateway: "PHONEPE",
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
      await addBookingStatus(walletObj?.bookingId, walletObj.jobId, "confirmed");
    }

    return createResponse(true, null, "Wallet payment added successfully");
  } catch (error: any) {
    await session.abortTransaction();
    return createResponse(false, null, error.message || "Error when adding wallet amount");
  } finally {
    session.endSession();
  }

}

export async function getAdminId() {
  // Get admin
  const admin = await User.findOne({ role: "admin" });
  if (!admin) {
    throw new Error("Admin not found");
  }
  return admin?._id;
}

export async function addCustomerWalletPendingTrasncation(merchantOrderId: string): Promise<GenericResponse<any>> {
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
      // customerId: walletObj.customerId,
      bookingId: walletObj?.bookingId,
      amount: walletObj.amount,
      invoiceNo: walletObj.invoiceNo,
      merchantOrderId: walletObj.merchantOrderId,
      transactionId: walletObj.transactionId,
      gatewayId: walletObj?.gatewayId,
      paymentMethod: "unknown",
      paymentGateway: "PHONEPE",
      paymentStatus: "PENDING",
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
      bookingId: walletObj?.bookingId,
      amount: walletObj.amount,
      invoiceNo: walletObj.invoiceNo,
      merchantOrderId: walletObj.merchantOrderId,
      transactionId: walletObj.transactionId,
      paymentMethod: "unknown",
      paymentStatus: "PENDING",
      gatewayId: walletObj?.gatewayId,
      paymentGateway: "PHONEPE",
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

export async function updateWalletAmount(customerId: string): Promise<GenericResponse<any>> {
  const session = await mongoose.startSession();
  try {
    await session.startTransaction();
    const walletSummary = await Wallet.aggregate([
      {
        $match: {
          customerId: new mongoose.Types.ObjectId(customerId),
          paymentStatus: { $in: ["COMPLETED", "REFUNDED"] }
        }
      },
      {
        $group: {
          _id: "$customerId",
          totalAdded: {
            $sum: {
              $cond: [{ $eq: ["$walletType", "added"] }, "$amount", 0]
            }
          },
          totalDeducted: {
            $sum: {
              $cond: [{ $eq: ["$walletType", "deducted"] }, "$amount", 0]
            }
          }
        }
      }
    ]);

    const { totalAdded = 0, totalDeducted = 0 } = walletSummary[0] || {};

    const withdrawRequestAmount = await Wallet.aggregate([
      { $match: { paymentMethod: "withdraw_request", paymentStatus: "PENDING", customerId } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" }
        }
      }
    ])

    const withdrawAmount = await Wallet.aggregate([
      { $match: { paymentMethod: "withdraw_request", paymentStatus: "COMPLETED", customerId } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" }
        }
      }
    ])

    const totalwithdrawReqAmount = withdrawRequestAmount.length > 0 ? withdrawRequestAmount[0].totalAmount : 0;
    const totalWithDrawAmount = withdrawAmount.length > 0 ? withdrawAmount[0].totalAmount : 0;
    const currentWalletAmount = totalAdded - (totalDeducted + totalwithdrawReqAmount + totalWithDrawAmount);
    const customerServices = await customerTotalService(customerId);

    const update = await Customer.findOneAndUpdate({ user: customerId }, {
      $set: {
        wallet_amount: currentWalletAmount,
        totalWithdrawRequests: totalwithdrawReqAmount,
        totalServiceAmount: customerServices,
        totalWithdrawAmount: totalWithDrawAmount
      }
    }, { new: true })

    await session.commitTransaction();
    return createResponse(true, null, "wallet amount update successfully!");
  } catch (error: any) {
    await session.abortTransaction();
    return createResponse(false, null, error?.message || "wallet amount update successfully!");
  } finally {
    await session.endSession();
  }
}

export async function addCustomerWalletAmountFailed(merchantOrderId: string, res: any) {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const walletObj = await Wallet.findOne({ merchantOrderId }).session(session);
    if (!walletObj) {
      throw new Error("Wallet detail not found");
    }

    // Update wallet details
    Object.assign(walletObj, {
      transactionId: res?.paymentDetails?.[0]?.transactionId,
      paymentStatus: res?.state == "FAILED" ? res?.state : "PENDING",
      orderId: res?.orderId,
      paymentMethod: res?.paymentDetails?.[0]?.paymentMode || "unknown",
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
      bookingId: walletObj.bookingId,
      amount: walletObj.amount,
      invoiceNo: walletObj.invoiceNo,
      merchantOrderId: walletObj.merchantOrderId,
      transactionId: walletObj.transactionId,
      paymentMethod: walletObj.paymentMethod,
      gatewayId: walletObj?.gatewayId,
      paymentGateway: "PHONEPE",
      paymentStatus: res?.state == "FAILED" ? res?.state : "PENDING",
      paymentBy: "customer",
      paymentFor: "wallet",
      particular: `${walletObj.paymentStatus} ! wallet amount`,
      transactionType: "credited",
    };

    await Transaction.create([adminTransactionPayload], { session });

    // Prepare transaction payload
    const customerTransactionPayload = {
      // adminId: adminId,
      walletPayment: walletObj._id,
      customerId: walletObj.customerId,
      bookingId: walletObj.bookingId,
      amount: walletObj.amount,
      invoiceNo: walletObj.invoiceNo,
      merchantOrderId: walletObj.merchantOrderId,
      transactionId: walletObj.transactionId,
      paymentMethod: walletObj.paymentMethod,
      paymentStatus: res?.state == "FAILED" ? res?.state : "PENDING",
      paymentGateway: "PHONEPE",
      gatewayId: walletObj?.gatewayId,
      paymentBy: "customer",
      paymentFor: "wallet",
      particular: `${walletObj.paymentStatus}! wallet amount`,
      transactionType: "debited",
    };
    await Transaction.create([customerTransactionPayload], { session });

    await session.commitTransaction();
    return createResponse(true, null, `Your transaction is ${customerTransactionPayload?.paymentStatus}`);
  } catch (error: any) {
    await session.abortTransaction();
    return createResponse(false, null, error.message || `Error when updating your payment transaction`);
  } finally {
    session.endSession();
  }
}

export async function holdWalletAmount4Job(job: any, customerId: any) {
  const session = await mongoose.startSession();
  try {
    await session.startTransaction();
    const adminId = await getAdminId();
    const merchantOrderId = "BW_JOBORD" + Date.now();
    const walletObj = await Wallet.create({
      customerId: customerId,
      adminId,
      jobId: job?._id,
      paymentStatus: "HOLD",
      merchantOrderId,
      invoiceNo: `INV${Date.now()}`,
      amount: job?.price,
      walletType: "deducted"
    });

    const adminTransactions = await Transaction.deleteMany(
      { merchantOrderId }
    ).session(session);
    // Prepare transaction payload
    const adminTransactionPayload = {
      adminId: adminId,
      walletPayment: walletObj._id,
      // customerId: walletObj.customerId,
      amount: walletObj.amount,
      invoiceNo: walletObj.invoiceNo,
      merchantOrderId: walletObj.merchantOrderId,
      transactionId: walletObj.transactionId,
      paymentMethod: "wallet",
      paymentStatus: "HOLD",
      paymentBy: "customer",
      paymentFor: "job",
      particular: `Wallet payment from customer ${walletObj.paymentStatus}`,
      transactionType: "credited",
    };

    await Transaction.create([adminTransactionPayload], { session });

    // Prepare transaction payload
    const customerTransactionPayload = {
      // adminId: adminId,
      walletPayment: walletObj._id,
      customerId: walletObj.customerId,
      amount: walletObj.amount,
      invoiceNo: walletObj.invoiceNo,
      merchantOrderId: walletObj.merchantOrderId,
      transactionId: walletObj.transactionId,
      paymentMethod: "wallet",
      paymentStatus: "HOLD",
      paymentBy: "customer",
      paymentFor: "job",
      particular: `Customer payment to Admin is ${walletObj.paymentStatus}`,
      transactionType: "debited",
    };
    await Transaction.create([customerTransactionPayload], { session });

    await session.commitTransaction();
    return createResponse(true, null, "Your Job Amount is hold successfully !");
  } catch (error: any) {
    await session.abortTransaction();
    return createResponse(false, null, error?.message || "Error when holding job amount");
  } finally {
    await session.endSession();
  }
}

export async function updateActiveJobs(partnerId: any) {
  const today = new Date();
  // Format as YYYY-MM-DD
  const todayStr = today.toISOString().split("T")[0];

  try {

    const openJobs = await Job.updateMany(
      { job_date: { $gt: todayStr } }, // compare as string
      { $set: { status: "expired" } }
    );
  } catch (error) {
    console.error("Error updating jobs:", error);
  }
}
export async function getApplicateDetails(jobId: any) {
  const applicantsList: any = await Bid.find({ jobId, status: { $in: ["pending", "accepted"] } }).select("message price availableTime partnerId createdAt status").populate("partnerId", "name phone email").lean();
  const applicantsIds = applicantsList.map((element: any) => {
    return element?.partnerId?._id.toString()
  });
  const applicantsRating: any = await applicantsRatingDetails(applicantsIds);

  const kycDetails = await Partner.find({ user: { $in: applicantsIds } }).select("kycStatus profile user");
  const reductKyc = kycDetails.reduce((acc: any, item: any) => {
    let partner_profile: string = "";
    if (item?.profile) {
      partner_profile = `${process.env.BASE_URL}/uploads/profile/${item?.profile}`;
    }
    acc[item.user] = {
      kycStatus: item?.kycStatus,
      profile: partner_profile
    }
    return acc;
  }, {})

  const formattedApplicants = await Promise.all(
    applicantsList.map(async (applicant: any) => {
      const partner = applicant.partnerId || {};
      const partnerId = applicant.partnerId?._id?.toString();
      const getKycStatus: any = reductKyc[partnerId] ? reductKyc[partnerId]?.kycStatus : 0;
      const getprofile: any = reductKyc[partnerId] ? reductKyc[partnerId]?.profile : null;
      const createAtDate = await createdAtDateFormate(applicant.createdAt);
      const averageRating = applicantsRating[applicant.partnerId?._id?.toString()] ? applicantsRating[applicant.partnerId?._id?.toString()].rating : 0;

      return {
        ...partner,
        message: applicant.message,
        price: applicant.price,
        createdAt: createAtDate,
        profile: getprofile,
        status: applicant.status,
        rating: averageRating,
        topRated: averageRating >= 4 ? true : false,
        availableTime: applicant.availableTime,
        kycStatus: getKycStatus,
      };
    })
  );
  return { applicantsCount: formattedApplicants?.length, applicantsList: formattedApplicants }
}

export async function partnerToJobDistance(lat1: any, lon1: any, lat2: any, lon2: any) {
  /*
   const url = `http://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`;
 
   const response = await fetch(url);
   const res: any = await response.json();
 
   if (res?.code === "Ok") {
     const distanceMeters = res?.routes[0].distance;
     const distanceKm = distanceMeters / 1000;
     return distanceKm.toFixed(0);
   } else {
     return 0;
   }
     */


  const distance = geolib.getDistance(
    { latitude: lat1, longitude: lon1 },
    { latitude: lat2, longitude: lon2 }
  );

  return (distance / 1000).toFixed(0);

  /*
   const R = 6371; // Radius of Earth in km
 
   const toRad = (value: any) => (value * Math.PI) / 180;
 
   const dLat = toRad(lat2 - lat1);
   const dLon = toRad(lon2 - lon1);
   const a =
     Math.sin(dLat / 2) * Math.sin(dLat / 2) +
     Math.cos(toRad(lat1)) *
     Math.cos(toRad(lat2)) *
     Math.sin(dLon / 2) *
     Math.sin(dLon / 2);
 
   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
 
   return (R * c).toFixed(0); // Distance in km
   */

}

export async function createdAtDateFormate(createDate: any) {
  const createdAt = new Date(createDate); // assuming doc is your mongoose document
  const formattedDate = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(createdAt);
  return formattedDate;
}

export async function checkIsValidPhoneNumber(phone: any) {
  const number = parsePhoneNumberFromString(phone, "IN");
  return number ? `+91${number.isValid()}` : false;
}

export async function getRatingDetails(serviceId: string, partnerId: string) {
  let ratingDetails = await serviceRatingDetails(serviceId, partnerId);
  ratingDetails.reviewList = ratingDetails?.reviewList.map((element: any) => {
    return {
      customerName: element?.name,
      rating: element?.rating,
      review: element?.description,
      date: element?.timeago,
      profile: element?.profile
    }
  });
  return ratingDetails;
}

export async function getJobBidingPartnerDetails(jobId: any, partnerId: any) {
  let getpartner: any = await Partner.findOne({ user: partnerId })
    .select("address category services categoryType totalExperience skills profile")
    .populate("user", "name email phone")
    .populate('category', '_id name image')
    .populate('categoryType', '_id name')
    .populate('services', '_id name pricingTiers').lean();
  const biddetails: any = await Bid.findOne({ jobId, partnerId })
    .select("price jobId customerId")
    .populate("jobId", "serviceId");

  getpartner.baseServiceCharge = biddetails?.price;
  getpartner.language = "Hindi,English,Panjabi";
  getpartner.professionalSummary = `${getpartner?.user?.name} is a certified professional with ${getpartner?.totalExperience} years of experience in the field`;
  const ratingDetails = await getRatingDetails('', partnerId);
  const completedJobs = await Booking.countDocuments({ status: "completed", partnerId });
  getpartner.rating = ratingDetails?.averageRating?.toString();
  getpartner.ratingDetails = ratingDetails?.reviewList;
  getpartner.total_review = ratingDetails?.review;
  getpartner.topRated = ratingDetails?.averageRating! >= 4 ? true : false;
  getpartner.jobs_completed = completedJobs;
  getpartner.profile = getpartner?.profile ? `${process.env.BASE_URL}/uploads/profile/${getpartner?.profile}` : null;

  let pricingTiersType = await customerSubscriptionPlanType(biddetails?.customerId);

  if (getpartner?.services?.length) {
    getpartner.services = await Promise.all(
      getpartner.services.map(async (element: any) => {
        const price = await checkCustomerType(element, biddetails?.customerId, pricingTiersType);
        delete element.pricingTiers;
        return {
          _id: element._id,
          name: element.name,
          price
        };
      })
    );
  }

  return getpartner;
}

export async function getBookingDetails(bookingId: any) {
  let booking: any = await Booking.findOne({ _id: bookingId })
    .select("job_time booking_date basePrice location partner_availability_time partner_current_latitude partner_current_longitude paymentStatus status totalAmount job_endAt job_startAt partnerId")
    .populate("serviceId", "name description category categorytype image")
    .populate("jobId", "job_date title applicants contact_email contact_name contact_number description full_address image latitude longitude status");

  const partnerProfileImg = await Partner.findOne({ user: booking?.partnerId }).select('profile');

  if (booking?.jobId?.image && Array.isArray(booking.jobId.image)) {
    booking.jobId.image = booking.jobId.image.map(
      (img: string) => `${process.env.BASE_URL}/uploads/job-images/${img}`
    );
  }
  if (booking?.serviceId?.image) {
    booking.serviceId.image = `${process.env.BASE_URL}/uploads/servicesImage/${booking?.serviceId?.image}`;
  }

  booking.partnerProfile = `${process.env.BASE_URL}/uploads/profile/${partnerProfileImg?.profile}`;


  return booking;
}


export async function jobBookingPaymentPending(bookingId: any) {
  const session = await mongoose.startSession();
  try {
    await session.startTransaction();
    const booking = await Booking.findOne({ _id: bookingId });
    const bookingPaymentDetail = await bookingPaymentDetails(bookingId, booking?.customerId);
    if (!booking)
      return createResponse(false, null, "Booking details not found");

    const adminId = await getAdminId();
    const merchantOrderId = "BW_BOKORD" + Date.now();
    const walletObj = await Wallet.create({
      customerId: booking?.customerId,
      adminId,
      bookingId,
      jobId: booking?.jobId,
      paymentMethod: "unknown",
      paymentStatus: "PENDING",
      merchantOrderId,
      invoiceNo: `INV${Date.now()}`,
      amount: bookingPaymentDetail?.payableAmount,
      walletType: "added"
    });

    const adminTransactions = await Transaction.deleteMany(
      { merchantOrderId }
    ).session(session);
    // Prepare transaction payload
    const adminTransactionPayload = {
      adminId: adminId,
      walletPayment: walletObj._id,
      // customerId: walletObj.customerId,
      bookingId,
      amount: walletObj.amount,
      invoiceNo: walletObj.invoiceNo,
      merchantOrderId: walletObj.merchantOrderId,
      transactionId: walletObj.transactionId,
      paymentMethod: "unknown",
      paymentStatus: "PENDING",
      paymentBy: "customer",
      paymentFor: "wallet",
      particular: `PENDING ! wallet amount`,
      transactionType: "credited",
    };

    await Transaction.create([adminTransactionPayload], { session });

    // Prepare transaction payload
    const customerTransactionPayload = {
      // adminId: adminId,
      walletPayment: walletObj._id,
      customerId: walletObj.customerId,
      bookingId,
      amount: walletObj.amount,
      invoiceNo: walletObj.invoiceNo,
      merchantOrderId: walletObj.merchantOrderId,
      transactionId: walletObj.transactionId,
      paymentMethod: "unknown",
      paymentStatus: "PENDING",
      paymentBy: "customer",
      paymentFor: "wallet",
      particular: `Pending ! wallet amount`,
      transactionType: "debited",
    };
    await Transaction.create([customerTransactionPayload], { session });

    const token = await getPhonePeAccessToken();
    if (!token?.access_token) {
      await session.abortTransaction();
      return createResponse(false, null, "Failed to fetch PhonePe access token. Please try again later");
    }
    await session.commitTransaction();
    return createResponse(true, { merchantOrderId, amount: bookingPaymentDetail?.payableAmount, access_token: token?.access_token }, "Your Booking Amount is pending successfully !");
  } catch (error: any) {
    await session.abortTransaction();
    return createResponse(false, null, error?.message || "Error when add pending amount");
  } finally {
    await session.endSession();
  }
}

export async function jobPartnerBookedByWallet(bookingId: any) {
  const session = await mongoose.startSession();
  try {
    await session.startTransaction();
    const booking = await Booking.findOne({ _id: bookingId });
    const partnerWallet = await Customer.findOne({ user: booking?.customerId }).select('wallet_amount');
    if (!booking || !partnerWallet)
      return createResponse(false, null, "Booking details or Partner Wallet not found");


    if (partnerWallet?.wallet_amount < booking.totalAmount)
      return createResponse(false, null, "Please add money to your wallet to complete this transaction");

    const adminId = await getAdminId();
    const merchantOrderId = "BW_BOKORD" + Date.now();
    const walletObj = await Wallet.create({
      customerId: booking?.customerId,
      adminId,
      bookingId,
      jobId: booking?.jobId,
      paymentMethod: "wallet",
      paymentStatus: "COMPLETED",
      merchantOrderId,
      invoiceNo: `INV${Date.now()}`,
      amount: booking?.totalAmount,
      walletType: "deducted"
    });

    const adminTransactions = await Transaction.deleteMany(
      { merchantOrderId }
    ).session(session);
    // Prepare transaction payload
    const adminTransactionPayload = {
      adminId: adminId,
      walletPayment: walletObj._id,
      // customerId: walletObj.customerId,
      bookingId,
      amount: walletObj.amount,
      invoiceNo: walletObj.invoiceNo,
      merchantOrderId: walletObj.merchantOrderId,
      transactionId: walletObj.transactionId,
      paymentMethod: walletObj.paymentMethod,
      paymentStatus: walletObj.paymentStatus,
      paymentBy: "customer",
      paymentFor: "booking",
      particular: `Received ! booking amount`,
      transactionType: "credited",
    };

    await Transaction.create([adminTransactionPayload], { session });

    // Prepare transaction payload
    const customerTransactionPayload = {
      // adminId: adminId,
      walletPayment: walletObj._id,
      customerId: walletObj.customerId,
      bookingId,
      amount: walletObj.amount,
      invoiceNo: walletObj.invoiceNo,
      merchantOrderId: walletObj.merchantOrderId,
      transactionId: walletObj.transactionId,
      paymentMethod: walletObj.paymentMethod,
      paymentStatus: walletObj.paymentStatus,
      paymentBy: "customer",
      paymentFor: "booking",
      particular: `Payment ! Booking amount`,
      transactionType: "debited",
    };
    await Transaction.create([customerTransactionPayload], { session });


    await Job.updateOne({ _id: booking?.jobId }, { $set: { status: "confirmed" } }).session(session);
    booking.status = "confirmed";
    booking.totalPaid = walletObj.amount;
    booking.paymentStatus = "COMPLETED";
    await booking.save({ session });
    await updateWalletAmount(customerTransactionPayload?.customerId.toString());
    await session.commitTransaction();
    return createResponse(true, null, "Your booking is confirmed");
  } catch (error: any) {
    await session.abortTransaction();
    return createResponse(false, null, error?.message || "Error when booking by wallet amount");
  } finally {
    await session.endSession();
  }
}

export async function bookingPaymentDetails(bookingId: any, customerId: any) {
  await updateWalletAmount(customerId);
  const [walletAmountDetails, bookingDetails] = await Promise.all([
    Customer.findOne({ user: customerId }).select("wallet_amount"),
    Booking.findOne({ _id: bookingId }).select("totalAmount")
  ]);
  if (!walletAmountDetails || !bookingDetails)
    return { bookingAmount: 0, walletAmount: 0, payableAmount: 0, paymentMethod: "unknown", paymentBy: "unkonwn" };

  let paymentMethod;
  let walletAmount;
  let payableAmount;
  let paymentBy;
  if (walletAmountDetails?.wallet_amount >= bookingDetails?.totalAmount) {
    payableAmount = bookingDetails?.totalAmount;
    walletAmount = bookingDetails?.totalAmount;
    paymentMethod = "wallet";
    paymentBy = "wallet";
  } else if (walletAmountDetails?.wallet_amount == 0) {
    payableAmount = bookingDetails?.totalAmount;
    paymentMethod = "upi"
    paymentBy = "upi";
    walletAmount = 0;
  } else {
    payableAmount = bookingDetails?.totalAmount - walletAmountDetails?.wallet_amount;
    walletAmount = walletAmountDetails?.wallet_amount;
    paymentMethod = "partial_payment";
    paymentBy = "upi";
  }

  return { bookingAmount: bookingDetails?.totalAmount, walletAmount, payableAmount, paymentMethod, paymentBy };
}

export async function jobAndBidCancel(jobId: any): Promise<GenericResponseCode<any>> {
  const session = await mongoose.startSession();
  try {
    await session.startTransaction();
    const response = await Job.updateMany(
      { _id: jobId },
      { $set: { status: "cancelled", cancellation_reason: "job cancel by customer" } },
      { session }
    );

    const responsebid = await Bid.updateMany(
      { jobId: jobId },
      { $set: { status: "cancelled", reson_for_cancel: "job and bid cancel by customer" } },
      { session }
    );

    await session.commitTransaction();
    return { status: 200, data: null, message: "The job has been cancelled successfully." };
  } catch (error: any) {
    await session.abortTransaction();
    return { status: 500, data: null, message: error?.message || "Something went wrong while cancelling the job." };
  } finally {
    await session.endSession();
  }
}


export async function createResponseStatus(status: number, data: any, message: string) {
  return {
    status, data, message
  }
};

export async function jobBookingCancel(bookingId: any): Promise<GenericResponseCode<any>> {
  const session = await mongoose.startSession();
  try {
    await session.startTransaction();
    const booking = await Booking.findOne({ _id: bookingId }).session(session);

    if ((booking?.status == "confirmed") && (booking?.paymentStatus == "COMPLETED")) {
      const adminId = await getAdminId();
      const merchantOrderId = "BW_BOKORD" + Date.now();
      const walletObj = await Wallet.create({
        customerId: booking?.customerId,
        adminId,
        bookingId,
        jobId: booking?.jobId,
        paymentMethod: "wallet",
        paymentStatus: "REFUNDED",
        particular: `Refunded ! booking amount`,
        merchantOrderId,
        invoiceNo: `INV${Date.now()}`,
        amount: booking?.totalAmount,
        walletType: "added"
      });

      const adminTransactions = await Transaction.deleteMany(
        { merchantOrderId }
      ).session(session);
      // Prepare transaction payload
      const adminTransactionPayload = {
        adminId: adminId,
        walletPayment: walletObj._id,
        // customerId: walletObj.customerId,
        bookingId,
        amount: walletObj.amount,
        invoiceNo: walletObj.invoiceNo,
        merchantOrderId: walletObj.merchantOrderId,
        transactionId: walletObj.transactionId,
        paymentMethod: walletObj.paymentMethod,
        paymentStatus: walletObj.paymentStatus,
        paymentBy: "admin",
        paymentFor: "booking_Amount_Refund",
        particular: `Payment! Refund amount`,
        transactionType: "debited",
      };

      await Transaction.create([adminTransactionPayload], { session });

      // Prepare transaction payload
      const customerTransactionPayload = {
        // adminId: adminId,
        walletPayment: walletObj._id,
        customerId: walletObj.customerId,
        bookingId,
        amount: walletObj.amount,
        invoiceNo: walletObj.invoiceNo,
        merchantOrderId: walletObj.merchantOrderId,
        transactionId: walletObj.transactionId,
        paymentMethod: walletObj.paymentMethod,
        paymentStatus: walletObj.paymentStatus,
        paymentBy: "admin",
        paymentFor: "booking_Amount_Refund",
        particular: `Received ! Booking amount`,
        transactionType: "credited",
      };
      await Transaction.create([customerTransactionPayload], { session });

      booking.status = "cancelled";
      booking.paymentStatus = "REFUND_TO_WALLET";
      await booking.save({ session });
    }
    await session.commitTransaction();
    await jobAndBidCancel(booking?.jobId);
    return createResponseStatus(200, null, "Booking cancel successfully");
  } catch (error: any) {
    await session.abortTransaction();
    return createResponseStatus(500, null, error?.message || "Something went wrong while cancelling the Booking.");
  } finally {
    await session.endSession();
  }
}

export async function checkBookingCancelRequest(jobObj: any) {

  const job = {
    job_date: jobObj?.job_date,// "05/09/2025", // DD/MM/YYYY
    job_time: jobObj?.job_time,// "13:00"       // HH:mm
  };
  const [day, month, year] = job.job_date.split("/");
  const isoString = `${year}-${month}-${day}T${job.job_time}:00`;
  const target: any = new Date(isoString);
  const now: any = new Date();
  const diffMs = target - now;

  // Convert to hours
  const diffHours = diffMs / (1000 * 60 * 60);
  const remainingHours = diffHours;
  let jobCancelStatus: boolean = false;
  jobCancelStatus = remainingHours > 2 ? true : false;
  return jobCancelStatus
}


export async function getPartnerJobDetailsList(query: any, limit: string, partnerId: any, searchText: string) {
  searchText = typeof searchText === "string" ? searchText.trim() : "";
  const searchRegex = searchText ? new RegExp(searchText, "i") : /.*/; // match all if empty

  const partner = await Partner.findOne({ user: partnerId.toString() }).select("latitude longitude services serviceAreaDistance");
  if (!partner) return { allJobs: [], lastId: null };

  const serviceAreaInMeter = (partner.serviceAreaDistance || 40) * 1000;

  query.serviceId = { $in: partner.services };

  const [bookmarkIdsresult, declinedIdsResult] = await Promise.all([
    Bookmark.find({ partnerId }).distinct("jobId"),
    Bid.find({ partnerId, status: "declined" }).distinct("jobId")
  ]);

  const bookmarkIds = bookmarkIdsresult.map((element) => {
    return element?.toString()
  })
  const declinedIds = declinedIdsResult.map((element) => {
    return element?.toString()
  })
  const activeJobsData = await Job.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [Number(partner.longitude), Number(partner.latitude)] },
        distanceField: "distance",
        maxDistance: serviceAreaInMeter || 40000,
        spherical: true,
        distanceMultiplier: 0.001
      }
    },

    // 🔍 Lookup service details
    {
      $lookup: {
        from: "services",
        let: { serviceId: "$serviceId" },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$serviceId"] } } },
          { $project: { _id: 1, name: 1, description: 1, image: 1 } }
        ],
        as: "service"
      }
    },
    { $unwind: "$service" },

    // 👤 Lookup customer details
    {
      $lookup: {
        from: "users",
        let: { customerId: "$customerId" },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$customerId"] } } },
          { $project: { _id: 1, name: 1, email: 1, phone: 1 } }
        ],
        as: "customer"
      }
    },
    { $unwind: "$customer" },

    // 📦 Lookup booking details
    {
      $lookup: {
        from: "bookings",
        let: { bookingId: "$bookingId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$_id", "$$bookingId"] },
                  { $ne: ["$$bookingId", null] }
                ]
              }
            }
          },
          { $project: { _id: 1, totalAmount: 1, basePrice: 1, extraWorkAmount: 1 } }
        ],
        as: "booking"
      }
    },
    { $unwind: { path: "$booking", preserveNullAndEmptyArrays: true } },

    // 🧠 Global Search + Job Filter
    {
      $match: {
        $and: [
          {
            $or: [
              { title: { $regex: searchText, $options: "i" } },
              { description: { $regex: searchText, $options: "i" } },
              { full_address: { $regex: searchText, $options: "i" } },
              { "service.name": { $regex: searchText, $options: "i" } },
              { "service.description": { $regex: searchText, $options: "i" } }
            ]
          },
          {
            $or: [
              { status: "open" },
              {
                $and: [
                  { status: { $ne: "open" } },
                  { bidPartnerIds: { $in: [partnerId] } } // ✅ FIXED: use $in, not array equality
                ]
              }
            ]
          },
          query // ✅ merge your query conditions safely
        ]
      }
    },

    { $sort: { createdAt: -1 } },
    { $limit: parseInt(limit, 10) }
  ]);


  const allJobs = await Promise.all(
    activeJobsData.map(async (job: any) => {
      let bookmarStatus: boolean = false;
      if (job.serviceId && job.image) {
        job.image = job.image.map((img: any) =>
          img ? `${process.env.BASE_URL}/uploads/job-images/${img}` : ""
        );
      }

      if (job?.service?.image) {
        job.service.image = job?.service?.image
          ? `${process.env.BASE_URL}/uploads/servicesImage/${job?.service?.image}`
          : null;
      }

      if (job) {
        job.serviceId = job.service;
      }

      if (job) {
        job.customerId = job.customer;
      }

      delete job.customer;
      delete job.service;
      if (declinedIds.includes(job?._id.toString())) {
        job.status = "declined";
      }
      job.status_name = await getStatusDisplayName(job?.status);
      const servicetimeAgo = await format(job?.createdAt.getTime());
      //const jobDistance = await partnerToJobDistance(partner?.latitude, partner?.longitude, job?.latitude, job?.longitude);

      if (bookmarkIds.includes(job?._id.toString())) {
        bookmarStatus = true;
      }

      let job_date = await displayJobDateTime(job?.job_date);
      let job_time = await formatTime12Hr(job?.job_time);

      return {
        ...job,
        price: job?.booking ? job?.booking?.basePrice : job.price,
        extraWorkAmount: job?.booking ? job?.booking?.extraWorkAmount : 0,
        jobCreatedAt: servicetimeAgo,
        job_distance: job?.distance.toFixed(0), //jobDistance,
        isBookmark: bookmarStatus,
        job_date,
        job_time
      };
    })
  )

  return {
    allJobs,
    lastId: allJobs.length > 0 ? allJobs[allJobs.length - 1]._id : null,
  }
}


export async function getCustomerJobDetailsList(querydata: any, limit: string, searchtext: string = "") {

  let query: any = {};

  // Add text search filters if provided
  if (searchtext && searchtext.trim() !== "") {
    query.$or = [
      { title: { $regex: searchtext, $options: "i" } },
      { description: { $regex: searchtext, $options: "i" } }
    ];
  }

  query = {
    ...query,
    ...querydata
  }

  const bookmarkIds = (await Bookmark.find({ customerId: querydata?.customerId }).distinct("serviceId"))
    .map(id => id.toString());


  let upcommingJobsData: any = await Job.find(query, { location: 0, bidPartnerIds: 0 })
    .populate({
      path: "serviceId",
      select: "name description image",
    })
    .populate({
      path: "customerId",
      select: "name email phone",
    })
    .populate({
      path: "ratingId",
      select: "jobId description rating",
    })
    .populate({
      path: "bookingId",
      select: "partnerId basePrice extraWorkAmount totalAmount",
      populate: {
        path: "partnerId",
        select: "name email phone",
      },
    })
    .sort({ createdAt: -1 })
    .limit(Number(limit) || 10)
    .lean();

  const partnerIds = upcommingJobsData
    .map((job: any) => job?.bookingId?.partnerId?._id?.toString())
    .filter(Boolean);

  const partnerProfiles = await Partner.find({ user: { $in: partnerIds } })
    .select("user profile")
    .lean();

  const profileMap = partnerProfiles.reduce((acc: any, p: any) => {
    acc[p.user.toString()] = p.profile;
    return acc;
  }, {} as Record<string, string>);


  const allJobs = await Promise.all(
    upcommingJobsData.map(async (job: any) => {

      if (job.serviceId && job.image) {
        job.image = job.image.map((img: any) =>
          img ? `${process.env.BASE_URL}/uploads/job-images/${img}` : ""
        );
      }

      if (job?.serviceId?.image) {
        const image = job.serviceId.image;
        // ✅ Only prepend BASE_URL if it's NOT already a full URL
        job.serviceId.image = image.startsWith('http')
          ? image
          : `${process.env.BASE_URL}/uploads/servicesImage/${image}`;
      } else {
        job.serviceId.image = null;
      }
      const servicetimeAgo = await format(job?.createdAt.getTime());
      let partnerDetails: any = "";

      const jobPrice = job?.bookingId?.basePrice ? job?.bookingId?.basePrice : job.price;
      const extraWorkAmount = job?.bookingId?.extraWorkAmount ? job?.bookingId?.extraWorkAmount : 0;
      const totalAmount = job?.bookingId?.totalAmount ? job?.bookingId?.totalAmount : 0;

      if (job?.bookingId) {
        partnerDetails = job?.bookingId?.partnerId
        job.bookingId = job?.bookingId?._id;
        const profile = profileMap[partnerDetails._id.toString()];
        partnerDetails.profile = profile
          ? `${process.env.BASE_URL}/uploads/profile/${profile}`
          : null;
      }


      let bookmarkStatus: Boolean = false;
      if (bookmarkIds.includes(job?.serviceId?._id.toString())) {
        bookmarkStatus = true;
      }

      let status_name = await getStatusDisplayName(job?.status);
      let job_date = await displayJobDateTime(job?.job_date);
      let job_time = await getDisplayJobTime(job?.job_time);
      return {
        ...job,
        price: jobPrice,
        extraWorkAmount: extraWorkAmount,
        totalAmount: totalAmount,
        jobCreatedAt: servicetimeAgo,
        partnerDetails,
        bookmarkStatus,
        status_name,
        job_date,
        job_time
      };
    })
  )





  return {
    allJobs,
    lastId: allJobs.length > 0 ? allJobs[allJobs.length - 1]._id : null,
  }
}

export async function checkBookingPaymentStatus(bookingId: any) {
  const bookingDetails = await Booking.findOne({ _id: bookingId });
  if (!bookingDetails)
    return 0;
  const amounts = await ExtraWork.aggregate([
    {
      $match: { bookingId: new mongoose.Types.ObjectId(bookingId), status: { $in: ["pending", "confirmed", "cancelled"] } }
    },
    {
      $group: {
        _id: null,
        totalPending: {
          $sum: { $cond: [{ $in: ["$paymentStatus", ["PENDING", "PAYMENT_IN_PROCESS"]] }, "$amount", 0] }
        },
        totalPaid: {
          $sum: { $cond: [{ $eq: ["$paymentStatus", "COMPLETED"] }, "$amount", 0] }
        },
        totalRefund: {
          $sum: { $cond: [{ $eq: ["$paymentStatus", "REFUND_TO_WALLET"] }, "$amount", 0] }
        }
      }
    }
  ]);

  const { totalPending = 0, totalPaid = 0, totalRefund = 0 } = amounts[0] || {};
  bookingDetails.extraWorkAmount = totalPending + totalPaid;
  bookingDetails.totalRefund = totalRefund;
  bookingDetails.totalPaid = bookingDetails.basePrice + totalPaid;
  bookingDetails.totalDueAmount = totalPending;
  bookingDetails.totalAmount = bookingDetails.basePrice + bookingDetails.extraWorkAmount;
  const jobStatus = await Job.findOne({ bookingId: bookingDetails?._id });
  if (!jobStatus)
    return true;
  if (bookingDetails.totalAmount == bookingDetails.totalPaid) {
    // bookingDetails.paymentStatus = "COMPLETED";
    jobStatus.status = "in_progress";
    bookingDetails.status = "in_progress";
  } else {
    jobStatus.status = "in_progress";
    bookingDetails.status = "in_progress";
    // jobStatus.status = "awaiting_payment";
    // bookingDetails.paymentStatus = "PENDING";
    // bookingDetails.status = "awaiting_payment";
  }
  await jobStatus.save();
  await bookingDetails.save();

  return bookingDetails;
}

export async function refundWorkPayment(workId: any): Promise<GenericResponse<any>> {
  const session = await mongoose.startSession();
  try {
    await session.startTransaction();
    const workDetails = await ExtraWork.findOne({ _id: workId }).session(session);
    const bookingDetails = await Booking.findOne({ _id: workDetails?.bookingId }).session(session);

    if ((workDetails?.status == "confirmed") && (workDetails?.paymentStatus == "COMPLETED")) {
      const adminId = await getAdminId();
      const merchantOrderId = "BW_BOKORD" + Date.now();
      const walletObj = await Wallet.create({
        customerId: bookingDetails?.customerId,
        adminId,
        bookingId: workDetails?.bookingId,
        extraWorkId: workDetails?._id,
        jobId: bookingDetails?.jobId,
        paymentMethod: "wallet",
        paymentStatus: "REFUNDED",
        particular: `Received ! Refund amount`,
        merchantOrderId,
        invoiceNo: `INV${Date.now()}`,
        amount: workDetails?.amount,
        walletType: "added"
      });

      const adminTransactions = await Transaction.deleteMany(
        { merchantOrderId }
      ).session(session);
      // Prepare transaction payload
      const adminTransactionPayload = {
        adminId: adminId,
        walletPayment: walletObj._id,
        // customerId: walletObj.customerId,
        bookingId: workDetails?.bookingId,
        extraWorkId: workDetails?._id,
        amount: walletObj.amount,
        invoiceNo: walletObj.invoiceNo,
        merchantOrderId: walletObj.merchantOrderId,
        transactionId: walletObj.transactionId,
        paymentMethod: walletObj.paymentMethod,
        paymentStatus: walletObj.paymentStatus,
        paymentBy: "admin",
        paymentFor: "extra_work_amount_refund",
        particular: `Payment! Extra work amount`,
        transactionType: "debited",
      };

      await Transaction.create([adminTransactionPayload], { session });

      // Prepare transaction payload
      const customerTransactionPayload = {
        // adminId: adminId,
        walletPayment: walletObj._id,
        customerId: walletObj.customerId,
        bookingId: workDetails?.bookingId,
        extraWorkId: workDetails?._id,
        amount: walletObj.amount,
        invoiceNo: walletObj.invoiceNo,
        merchantOrderId: walletObj.merchantOrderId,
        transactionId: walletObj.transactionId,
        paymentMethod: walletObj.paymentMethod,
        paymentStatus: walletObj.paymentStatus,
        paymentBy: "admin",
        paymentFor: "extra_work_amount_refund",
        particular: `Refund has been successfully transferred to your wallet`,
        transactionType: "credited",
      };
      await Transaction.create([customerTransactionPayload], { session });
      workDetails.status = "cancelled";
      workDetails.paymentStatus = "REFUND_TO_WALLET";
      await workDetails.save({ session });
    }
    await session.commitTransaction();
    return createResponse(true, null, "Extra work detail cancel successfully");
  } catch (error: any) {
    await session.abortTransaction();
    return createResponse(false, null, error?.message || "Something went wrong while cancelling the Booking.");
  } finally {
    await session.endSession();
  }
}

export async function getFormatedDateTime(date: any) {
  const formatedDateTime = moment(date)
    .tz("Asia/Kolkata")
    .format("DD MMM YYYY HH:mm:ss");
  return formatedDateTime;
}

export async function languagesList() {
  const data = [{ code: "en_US", name: "English" },
  { code: "hi_IN", name: "Hindi" },
  { code: "marathi_IN", name: "Marathi" },
  { code: "gujarati_IN", name: "Gujarati" },
  { code: "panjabi_IN", name: "Panjabi" },
  { code: "bengali_IN", name: "Bengali" },
  { code: "malayalam_IN", name: "Malayalam" },
  { code: "tamil_IN", name: "Tamil" },
  { code: "telugu_IN", name: "Telugu" },
  { code: "urdu_IN", name: "Urdu" }
  ];
  return data;
}

export async function bookingStatusList(jobList: string, filterStatus: string = "") {

  let statuslist: any = [];
  if (jobList == "upcomming") {
    statuslist = [
      { key: "confirmed", name: "Confirmed" },
      { key: "on_the_Way", name: "On the way" },
      { key: "cancelled", name: "Cancelled" }
    ];
  } else if (jobList == "ongoing") {
    statuslist = [
      { key: "on_the_Way", name: "On the way" },
      { key: "arrived", name: "Arrived" },
      { key: "awaiting_material", name: "Awaiting material" },
      // { key: "awaiting_payment", name: "Awaiting Payment" },
      { key: "in_progress", name: "Start work" },
      { key: "paused", name: "Paused" },
      { key: "in_progress", name: "Start work" },
      { key: "completed", name: "Completed" },
      // { key: "cancelled", name: "Cancelled" }
    ];
  } else if (jobList == "all") {
    statuslist = [
      { key: "confirmed", name: "Confirmed" },
      { key: "on_the_Way", name: "On the way" },
      { key: "arrived", name: "Arrived" },
      { key: "awaiting_material", name: "Awaiting material" },
      // { key: "awaiting_payment", name: "Awaiting Payment" },
      { key: "in_progress", name: "Start work" },
      { key: "paused", name: "Paused" },
      { key: "completed", name: "Completed" },
      { key: "cancelled", name: "Cancelled" }
    ];
  }
  if (filterStatus != "") {
    let filterstatusValue = await getStatusesBetween(statuslist, filterStatus, 3);
    statuslist = filterstatusValue;
  }

  const uniqueStatusList = [
    ...new Map(statuslist.map((item: any) => [item.key, item])).values()
  ];


  return uniqueStatusList;
}

export async function addBookingStatus(
  bookingId: any,
  jobId: any,
  status: string,
  latitude: string = "",
  longitude: string = ""
) {
  const response = await BookingStatus.create({
    bookingId,
    jobId,
    status,
    latitude,
    longitude,
    location: {
      type: "Point",
      coordinates: [longitude, latitude],
    }
  });
  return response;
}


export async function getJobCurrentTab(status: string) {
  const ongoingStatus: any[] = ["on_the_Way", "arrived", "paused", "awaiting_material", "awaiting_payment", "in_progress"];
  const previousStatus: any[] = ["completed", "cancelled"];

  let tabName: string = "";
  let bookingStatusArr: string[] = [];
  let tabStatusName: string = status;
  if (status == "confirmed") {
    tabName = "upcomming";
    bookingStatusArr = await bookingStatusList("upcomming", tabStatusName) as string[];
  } else if (ongoingStatus.includes(status)) {
    tabName = "ongoing";
    bookingStatusArr = await bookingStatusList("ongoing", tabStatusName) as string[];
  } else if (previousStatus.includes(status)) {
    tabName = "previous";
  } else {
    tabName = "bid";
  }
  return { tabName, bookingStatusArr };
}

export async function createKmRanges(start: number, end: number, step: number, rangeType: string) {
  const ranges = [{ key: end, value: `All` }];
  for (let i = start; i < end; i += step) {
    ranges.push({ key: i + step, value: `${i} - ${i + step} ${rangeType}` });
  }
  return ranges;
}




export async function getPartnerJobMinMaxRange(query: any, partnerId: any) {
  const partner = await Partner.findOne({ user: partnerId })
    .select("latitude longitude services serviceAreaDistance");

  if (!partner) {
    return { minAmount: 0, maxAmount: 0 };
  }

  const serviceAreaInMeter =
    (partner?.serviceAreaDistance ? partner.serviceAreaDistance : 0) * 1000;

  // Build filter (without geo condition — geo goes into $geoNear)
  const matchQuery: any = {
    ...query,
    serviceId: { $in: partner.services },
    status: { $ne: "expired" }
  };
  const result = await Job.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [Number(partner.longitude), Number(partner.latitude)] // [lng, lat]
        },
        distanceField: "distance",
        maxDistance: serviceAreaInMeter || 40000, // fallback 40km
        spherical: true,
        query: matchQuery // 👈 other filters go here
      }
    },
    {
      $group: {
        _id: null,
        minAmount: { $min: "$price" },
        maxAmount: { $max: "$price" }
      }
    }
  ]);
  const minAmount = result[0]?.minAmount || 0;
  const maxAmount = result[0]?.maxAmount || 0;
  const priceRangeArra = await createKmRanges(minAmount, maxAmount, 200, "Rs");
  return { priceRangeArra };
}


export async function getPartnerJobDetailsListWithFilters(query: any, limit: string, partnerId: any, searchText: string, distanceRange: string, timeSlot: string, priceRange: string) {
  const partner = await Partner.findOne({ user: partnerId }).select("latitude longitude services serviceAreaDistance");
  if (searchText == undefined) {
    searchText = "";
  }
  if ((!partner) || (partner == undefined))
    return { allJobs: [], lastId: null }
  const serviceAreaInMeter =
    (partner?.serviceAreaDistance ? partner?.serviceAreaDistance : 0) * 1000;
  query = {
    ...query,
    serviceId: { $in: partner.services },
  };
  if (priceRange) {
    query.price = {
      $gte: parseInt(priceRange) - 200,
      $lte: parseInt(priceRange)
    };
  }

  if (timeSlot) {
    // Split "HH:mm" format
    let [hour, minute] = timeSlot.split(":").map(Number);

    // Subtract 6 hours
    let startHour = hour - 6;
    if (startHour < 0) startHour += 24; // wrap around midnight

    // Format back to HH:mm (24hr format)
    const pad = (n: any) => n.toString().padStart(2, "0");
    const startTime = `${pad(startHour)}:${pad(minute)}`;

    query.job_time = {
      $gte: startTime,
      $lte: timeSlot
    };
  }


  const bookmarkIds = (await Bookmark.find({ partnerId }).distinct("jobId"))
    .map(id => id.toString());

  const declinedIds = (await Bid.find({ partnerId, status: "declined" }).distinct("jobId"))
    .map(id => id.toString());

  const activeJobsData = await Job.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [Number(partner.longitude), Number(partner.latitude)] // [lng, lat]
        },
        distanceField: "distance",
        maxDistance: parseInt(distanceRange) * 1000 || 40000,
        spherical: true,
        distanceMultiplier: 0.001
      }
    },

    {
      $lookup: {
        from: "services",
        let: { serviceId: "$serviceId" },
        pipeline: [
          {
            $match: { $expr: { $eq: ["$_id", "$$serviceId"] } }
          },
          {
            $project: {
              _id: 1,
              name: 1,
              description: 1,
              image: 1
            }
          }
        ],
        as: "service"
      }
    },
    { $unwind: "$service" },

    // Lookup Customer
    {
      $lookup: {
        from: "users",
        let: { customerId: "$customerId" },
        pipeline: [
          {
            $match: { $expr: { $eq: ["$_id", "$$customerId"] } }
          },
          {
            $project: {
              _id: 1,
              name: 1,
              email: 1,
              phone: 1
            }
          }
        ],
        as: "customer"
      }
    },
    { $unwind: "$customer" },


    // Lookup Booking
    {
      $lookup: {
        from: "bookings",
        let: { bookingId: "$bookingId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$_id", "$$bookingId"] },
                  { $ne: ["$$bookingId", null] } // bookingId exist check
                ]
              }
            }
          },
          {
            $project: {
              _id: 1,
              totalAmount: 1,
              basePrice: 1,
              extraWorkAmount: 1
            }
          }
        ],
        as: "booking"
      }
    },
    {
      $unwind: {
        path: "$booking",
        preserveNullAndEmptyArrays: true // bookingId न होने पर भी document आए
      }
    },

    // 🔑 Apply global search across Job + Service
    {
      $match: {
        ...query,
        status: { $ne: "expired" },
        $and: [
          {
            $or: [
              { title: { $regex: searchText, $options: "i" } },
              { description: { $regex: searchText, $options: "i" } },
              { full_address: { $regex: searchText, $options: "i" } },
              { "service.name": { $regex: searchText, $options: "i" } },
              { "service.description": { $regex: searchText, $options: "i" } }
            ]
          },
          {
            $or: [
              { status: "open" },
              {
                $and: [
                  { status: { $ne: "open" } },
                  { bidPartnerIds: partnerId }
                ]
              }
            ]
          }
        ]
      }
    },

    { $sort: { createdAt: -1 } },
    { $limit: parseInt(limit) }
  ]);

  const allJobs = await Promise.all(
    activeJobsData.map(async (job: any) => {
      let bookmarStatus: boolean = false;
      if (job.serviceId && job.image) {
        job.image = job.image.map((img: any) =>
          img ? `${process.env.BASE_URL}/uploads/job-images/${img}` : ""
        );
      }

      if (job?.service?.image) {
        job.service.image = job?.service?.image
          ? `${process.env.BASE_URL}/uploads/servicesImage/${job?.service?.image}`
          : null;
      }

      if (job) {
        job.serviceId = job.service;
      }

      if (job) {
        job.customerId = job.customer;
      }

      delete job.customer;
      delete job.service;

      if (declinedIds.includes(job?._id.toString())) {
        job.status = "declined";
      }

      job.status_name = await getStatusDisplayName(job?.status);

      const servicetimeAgo = await format(job?.createdAt.getTime());
      //const jobDistance = await partnerToJobDistance(partner?.latitude, partner?.longitude, job?.latitude, job?.longitude);

      if (bookmarkIds.includes(job?._id.toString())) {
        bookmarStatus = true;
      }
      let job_date = await displayJobDateTime(job?.job_date);
      let job_time = await formatTime12Hr(job?.job_time);
      return {
        ...job,
        price: job?.booking ? job?.booking?.basePrice : job.price,
        extraWorkAmount: job?.booking ? job?.booking?.extraWorkAmount : 0,
        jobCreatedAt: servicetimeAgo,
        job_distance: job?.distance.toFixed(0), //jobDistance,
        isBookmark: bookmarStatus,
        job_date,
        job_time
      };
    })
  )

  return {
    allJobs,
    lastId: allJobs.length > 0 ? allJobs[allJobs.length - 1]._id : null,
  }
}

export async function getMinAndMaxPrice(price: number) {
  const minPrice = price - (price * 0.10); // 10% less
  const maxPrice = price + (price * 0.10); // 10% more

  return {
    min: Math.round(minPrice),  // round if needed
    max: Math.round(maxPrice)
  };
}

export async function addBookingAmountWallet(partnerId: any, bookingId: any, status: string) {
  const session = await mongoose.startSession();
  try {
    await session.startTransaction();
    const booking = await Booking.findOne({ _id: bookingId });

    const checkWalletJobAmount = await Wallet.findOne({ partnerId, bookingId, paymentStatus: "COMPLETED" });
    if (checkWalletJobAmount)
      return createResponse(true, null, "Your job amount is already transfered in your accound")

    const adminId = await getAdminId();
    const merchantOrderId = "BW_JOBORD" + Date.now();
    const walletObj = await Wallet.create({
      partnerId: booking?.partnerId,
      adminId,
      bookingId,
      jobId: booking?.jobId,
      paymentMethod: "wallet",
      paymentStatus: "COMPLETED",
      merchantOrderId,
      invoiceNo: `INV${Date.now()}`,
      amount: booking?.getNetAmount,
      walletType: "added"
    });

    const adminTransactions = await Transaction.deleteMany(
      { merchantOrderId }
    ).session(session);
    // Prepare transaction payload
    const adminTransactionPayload = {
      adminId: adminId,
      walletPayment: walletObj._id,
      // partnerId: walletObj.partnerId,
      bookingId,
      amount: walletObj.amount,
      invoiceNo: walletObj.invoiceNo,
      merchantOrderId: walletObj.merchantOrderId,
      transactionId: walletObj.transactionId,
      paymentMethod: walletObj.paymentMethod,
      paymentStatus: walletObj.paymentStatus,
      paymentBy: "admin",
      paymentFor: "job",
      particular: `Payment successfully transferred to Partner wallet`,
      transactionType: "debited",
    };

    await Transaction.create([adminTransactionPayload], { session });

    // Prepare transaction payload
    const customerTransactionPayload = {
      // adminId: adminId,
      walletPayment: walletObj._id,
      partnerId: walletObj.partnerId,
      bookingId,
      amount: walletObj.amount,
      invoiceNo: walletObj.invoiceNo,
      merchantOrderId: walletObj.merchantOrderId,
      transactionId: walletObj.transactionId,
      paymentMethod: walletObj.paymentMethod,
      paymentStatus: walletObj.paymentStatus,
      paymentBy: "admin",
      paymentFor: "job",
      particular: `Payment successfully added to Your wallet`,
      transactionType: "credited",
    };
    await Transaction.create([customerTransactionPayload], { session });
    await session.commitTransaction();
    await updatePartnerWalletAmount(partnerId);
    return createResponse(true, null, "Your job amount is transfered in your accound");
  } catch (error: any) {
    await session.abortTransaction();
    return createResponse(false, null, error?.message || "Error when booking by wallet amount");
  } finally {
    await session.endSession();
  }
}


export async function updatePartnerWalletAmount(partnerId: string): Promise<GenericResponse<any>> {
  const session = await mongoose.startSession();
  try {
    await session.startTransaction();
    const walletSummary = await Wallet.aggregate([
      {
        $match: {
          partnerId: new mongoose.Types.ObjectId(partnerId),
          paymentStatus: { $in: ["COMPLETED", "REFUNDED"] }
        }
      },
      {
        $group: {
          _id: null, // 👈 required
          totalAdded: {
            $sum: {
              $cond: [{ $eq: ["$walletType", "added"] }, "$amount", 0]
            }
          },
          totalDeducted: {
            $sum: {
              $cond: [{ $eq: ["$walletType", "deducted"] }, "$amount", 0]
            }
          }
        }
      }
    ]);

    const { totalAdded = 0, totalDeducted = 0 } = walletSummary[0] || {};
    const holdAmount = await Wallet.aggregate([
      { $match: { partnerId, paymentMethod: "withdraw_request", paymentStatus: "PENDING", walletType: "deducted" } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" }
        }
      }
    ])

    const totalHoldAmount = holdAmount.length > 0 ? holdAmount[0].totalAmount : 0;
    const currentWalletAmount = (totalAdded - totalDeducted) - totalHoldAmount;


    const gettotalIncome = await Booking.aggregate([
      { $match: { partnerId, status: "completed", paymentStatus: "COMPLETED" } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$totalAmount" }
        }
      }
    ])

    const totalIncome = gettotalIncome.length > 0 ? gettotalIncome[0].totalAmount : 0;


    const withdrawRequestAmount = await Wallet.aggregate([
      { $match: { paymentMethod: "withdraw_request", paymentStatus: "PENDING", partnerId } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" }
        }
      }
    ])

    const withdrawAmount = await Wallet.aggregate([
      { $match: { paymentMethod: "withdraw_request", paymentStatus: "COMPLETED", partnerId } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" }
        }
      }
    ])

    const totalwithdrawReqAmount = withdrawRequestAmount.length > 0 ? withdrawRequestAmount[0].totalAmount : 0;
    const totalWithDrawAmount = withdrawAmount.length > 0 ? withdrawAmount[0].totalAmount : 0;



    const update = await Partner.findOneAndUpdate({ user: partnerId }, {
      $set: {
        wallet_amount: currentWalletAmount,
        wallet_hold_amount: totalHoldAmount,
        total_income: totalIncome,
        totalWithdrawRequests: totalwithdrawReqAmount,
        totalWithdrawAmount: totalWithDrawAmount
      }
    },
      { new: true })

    await session.commitTransaction();

    return createResponse(true, {
      wallet_amount: update?.wallet_amount,
      total_income: totalIncome,
      total_withdrawn: totalHoldAmount,
      totalWithdrawRequests: totalwithdrawReqAmount,
      totalWithdrawAmount: totalWithDrawAmount
    }, "wallet amount update successfully!");
  } catch (error: any) {
    await session.abortTransaction();
    return createResponse(false, null, error?.message || "wallet amount update successfully!");
  } finally {
    await session.endSession();
  }
}

export async function calculatePortalCharge(portalCommition: number, job_price: number) {
  const decreasedValue = job_price - (job_price * portalCommition) / 100;
  return { job_price, portalFee: job_price - decreasedValue, getNetAmount: decreasedValue };
}

export async function withdrawRequest(partnerId: any, request_amount: number, settlementAccountId: any) {
  const session = await mongoose.startSession();
  try {
    await session.startTransaction();

    const adminId = await getAdminId();
    const merchantOrderId = "BW_JOBORD" + Date.now();
    const walletObj = await Wallet.create({
      partnerId: partnerId,
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
      walletPayment: walletObj._id,
      settlementAccountId,
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
      walletPayment: walletObj._id,
      partnerId: walletObj.partnerId,
      settlementAccountId,
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
    await updatePartnerWalletAmount(partnerId);
    return createResponse(true, { withdraw: walletObj }, `Your withdraw request added successfully`);
  } catch (error: any) {
    await session.abortTransaction();
    return createResponse(false, null, error?.message || "Error when add transaction");
  } finally {
    await session.endSession();
  }

}


function format12Hour(date: any) {
  let h = date.getHours();
  const m = date.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12; // Convert to 12-hour
  return `${h}:${m} ${ampm}`;
}

export async function timeRange(timeStr: string) {
  const [hours, minutes] = timeStr.split(":").map(Number);

  const start = new Date();
  start.setHours(hours, minutes);

  const end = new Date(start);
  end.setHours(end.getHours() + 1);

  return `${format12Hour(start)} - ${format12Hour(end)}`;
}


export async function formatDateOrDay(dateStr: any) {
  // Parse "DD/MM/YYYY"
  const [day, month, year] = dateStr.split("/").map(Number);
  const inputDate = new Date(year, month - 1, day);

  // Today & tomorrow
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  // Normalize (ignore time part)
  const sameDay = (d1: any, d2: any) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  if (sameDay(inputDate, today)) return "Today";
  if (sameDay(inputDate, tomorrow)) return "Tomorrow";

  // Otherwise format as "26 Sep 2025"
  return inputDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}



export async function getStatusDisplayName(status: string) {
  const statuslist = [
    { key: "pending", name: "Pending" },
    { key: "open", name: "Open" },
    { key: "confirmation_Pending", name: "Confirmation Pending" },
    { key: "confirmed", name: "Confirmed" },
    { key: "on_the_Way", name: "On the way" },
    { key: "arrived", name: "Arrived" },
    { key: "awaiting_material", name: "Awaiting material" },
    { key: "awaiting_payment", name: "Awaiting Payment" },
    { key: "in_progress", name: "In Progress" },
    { key: "paused", name: "Paused" },
    { key: "completed", name: "Completed" },
    { key: "cancelled", name: "Cancelled" },
    { key: "expired", name: "Expired" },
    { key: "declined", name: "Declined" }
  ];

  let statusName = statuslist.find(c => c.key === status)?.name || null;

  return statusName;
}

export async function preparePushNotification(key: string, userId: string, jobId: string) {

  if (userId == "RELATED_PARTNERS") {
    const jobDetails: any = await Job.findById(jobId).select("serviceId latitude longitude").lean();
    const userFCM = await Partner.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [jobDetails.longitude, jobDetails.latitude] // [lng, lat]
          },
          distanceField: "distance",
          maxDistance: 40000,// 20 km
          spherical: true,
          distanceMultiplier: 0.001
        }
      },
      {
        $match: { services: jobDetails?.serviceId } // If you store serviceId in Partner
      },
      {
        $lookup: {
          from: "users",            // users collection
          localField: "user",       // field in Partner referencing User
          foreignField: "_id",
          as: "userDetails"
        }
      },
      { $unwind: "$userDetails" },  // flatten array
      {
        $project: {
          fcm_token: "$userDetails.fcm_token",
          _id: "$userDetails._id"
        }
      }
    ]);
    const fcmArr = userFCM
      .map(uFcm => uFcm.fcm_token)  // get all fcm_token
      .filter(token => token !== undefined);


    let notification = await getNotificationDetails(key);

    const userIds = [...new Set(
      userFCM
        .map(uFcm => uFcm._id)      // extract _id
        .filter(_id => _id !== undefined)  // remove undefined
    )];

    createNotifications(userIds, notification, jobId);

    if (fcmArr.length > 0) {
      const response = await sendMultiplePushNotification(fcmArr, notification?.title, notification?.description, jobId, notification.redirect_page);
    }
  } else if (userId == "JOB_REACTED_PARTNERS") {
    const bidingPartners = await Bid.find({ jobId, status: key })
      .populate("partnerId", "fcm_token")
      .lean(); // ⚡ faster and returns plain JS objects

    const fcmArr = bidingPartners
      .map((p: any) => p.partnerId?.fcm_token)
      .filter(Boolean);

    const userIds = [...new Set(
      bidingPartners
        .map(p => p.partnerId?._id)      // extract _id
        .filter(_id => _id !== undefined)  // remove undefined
    )];
    let notification = await getNotificationDetails(key);
    createNotifications(userIds, notification, jobId);

    if (fcmArr.length > 0) {
      const response = await sendMultiplePushNotification(fcmArr, notification?.title, notification?.description, jobId, notification.redirect_page);
    }

  } else {
    const userFcm = await User.findOne({ _id: userId }).select("fcm_token");
    if (!userFcm)
      return true;

    let notification = await getNotificationDetails(key);

    createNotifications([userId], notification, jobId);
    const result = await sendPushNotification(userFcm?.fcm_token, notification?.title, notification?.description, jobId, notification?.redirect_page);
  }
}

export async function createNotifications(userIds: any, notification: any, jobId: any) {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    console.warn("No user IDs provided");
    return;
  }

  // Prepare bulk data efficiently using .map()
  const notifications = userIds.map(id => ({
    title: notification?.title ?? "No Title",
    description: notification?.description ?? "No Description",
    userId: id,
    jobId
  }));

  try {
    const result = await Notification.insertMany(notifications, { ordered: false });
    return result;
  } catch (error: any) {
    console.error("❌ Error inserting notifications:", error.message);
  }
}

export async function getNotificationDetails(key: string) {
  let notification_title: string = "";
  let notification_description: string = "";
  let redirect_page: string = "";

  if (key === "CUSTOMER_JOB_POST") {
    notification_title = "Job Alert";
    notification_description = "You have received a new job opportunity.";
    redirect_page = "OPEN_JOB_DETAILS_PAGE";
  } else if (key === "PARTNER_ADD_BID") {
    notification_title = "Bid Alert";
    notification_description = "Your job post received interest from a partner.";
    redirect_page = "OPEN_CUSTOMER_JOB_DETAILS_PAGE";
  } else if (key === "on_the_Way") {
    notification_title = "Partner on the way";
    notification_description = "Your service provider is on the way to your location.";
    redirect_page = "OPEN_CUSTOMER_JOB_DETAILS_PAGE";
  } else if (key === "arrived") {
    notification_title = "Partner is Arrived";
    notification_description = "Your service provider has arrived at the job location.";
    redirect_page = "OPEN_CUSTOMER_JOB_DETAILS_PAGE";
  } else if (key === "awaiting_material") {
    notification_title = "waiting material";
    notification_description = "Your service provider is waiting for required materials.";
    redirect_page = "OPEN_CUSTOMER_JOB_DETAILS_PAGE";
  } else if (key === "awaiting_payment") {
    notification_title = "waiting payment";
    notification_description = "Work is almost done — your provider is waiting for payment";
    redirect_page = "OPEN_CUSTOMER_JOB_DETAILS_PAGE";
  } else if (key === "in_progress") {
    notification_title = "Job Started";
    notification_description = "Your service provider has started working on your job.";
    redirect_page = "OPEN_CUSTOMER_JOB_DETAILS_PAGE";
  } else if (key === "paused") {
    notification_title = "Job Paused";
    notification_description = "Your service provider has paused the work temporarily.";
    redirect_page = "OPEN_CUSTOMER_JOB_DETAILS_PAGE";
  } else if (key === "completed") {
    notification_title = "Job Completed";
    notification_description = "Your job has been completed successfully.";
    redirect_page = "OPEN_CUSTOMER_JOB_DETAILS_PAGE";
  } else if (key === "accepted") {
    notification_title = "Job accepted!";
    notification_description = "The customer has accepted your bid";
    redirect_page = "OPEN_JOB_DETAILS_PAGE";
  } else if (key === "declined") {
    notification_title = "Job declined!";
    notification_description = "Bid amount refunded to your wallet";
    redirect_page = "OPEN_JOB_DETAILS_PAGE";
  } else if (key === "cancelled") {
    notification_title = "Job cancelled!";
    notification_description = "Bid amount refunded to your wallet";
    redirect_page = "OPEN_JOB_DETAILS_PAGE";
  } else if (key === "bid_added") {
    notification_title = "Job biding!";
    notification_description = "partner added bid you job";
    redirect_page = "OPEN_CUSTOMER_JOB_DETAILS_PAGE";
  } else if (key === "bid_cancelled") {
    notification_title = "bid cancelled!";
    notification_description = "Your job bid has been cancelled by the partner";
    redirect_page = "OPEN_CUSTOMER_JOB_DETAILS_PAGE";
  } else {
    notification_title = "Job Status Update";
    notification_description = "Your service provider updated the job status.";
    redirect_page = "OPEN_CUSTOMER_JOB_DETAILS_PAGE";
  }
  return { title: notification_title, description: notification_description, redirect_page }
}

export async function getRoleId(name: string) {
  const role = await Roles.findOne({ name }).select('_id');
  return role?._id ? role?._id : "";
}


export async function addPartnerWalletPendingTrasncation(merchantOrderId: string): Promise<GenericResponse<any>> {
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
      // customerId: walletObj.customerId,
      gatewayId: walletObj?.gatewayId,
      bookingId: walletObj?.bookingId,
      amount: walletObj.amount,
      invoiceNo: walletObj.invoiceNo,
      merchantOrderId: walletObj.merchantOrderId,
      transactionId: walletObj.transactionId,
      paymentMethod: "unknown",
      paymentStatus: "PENDING",
      paymentGateway: "PHONEPE",
      paymentBy: "partner",
      paymentFor: "wallet",
      particular: "Wallet payment from the partner is currently pending",
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
      paymentGateway: "PHONEPE",
      gatewayId: walletObj?.gatewayId,
      paymentMethod: "unknown",
      paymentStatus: "PENDING",
      paymentBy: "partner",
      paymentFor: "wallet",
      particular: "Partner payment to Admin is currently pending",
      transactionType: "debited",
    };
    await Transaction.create([partnerTransactionPayload], { session });

    await session.commitTransaction();
    return createResponse(true, null, `Your transaction is currently ${partnerTransactionPayload?.paymentStatus}`);
  } catch (error: any) {
    await session.abortTransaction();
    return createResponse(false, null, error?.message || "Error when add transaction");
  } finally {
    await session.endSession();
  }
}


export async function addPartnerWalletAmountSuccess(merchantOrderId: string, res: any) {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const walletObj = await Wallet.findOne({ merchantOrderId }).session(session);
    if (!walletObj) {
      throw new Error("Wallet detail not found");
    }

    // Update wallet details
    Object.assign(walletObj, {
      transactionId: res?.paymentDetails?.[0]?.transactionId,
      paymentStatus: res?.state,
      orderId: res?.orderId,
      paymentMethod: res?.paymentDetails?.[0]?.paymentMode || "unknown",
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
      paymentGateway: "PHONEPE",
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
      gatewayId: walletObj?.gatewayId,
      paymentGateway: "PHONEPE",
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

export async function addPartnerWalletAmountFailed(merchantOrderId: string, res: any) {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const walletObj = await Wallet.findOne({ merchantOrderId }).session(session);
    if (!walletObj) {
      throw new Error("Wallet detail not found");
    }

    // Update wallet details
    Object.assign(walletObj, {
      transactionId: res?.paymentDetails?.[0]?.transactionId,
      paymentStatus: res?.state == "FAILED" ? res?.state : "PENDING",
      orderId: res?.orderId,
      paymentMethod: res?.paymentDetails?.[0]?.paymentMode || "unknown",
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
      bookingId: walletObj.bookingId,
      amount: walletObj.amount,
      invoiceNo: walletObj.invoiceNo,
      merchantOrderId: walletObj.merchantOrderId,
      transactionId: walletObj.transactionId,
      paymentMethod: walletObj.paymentMethod,
      paymentStatus: res?.state == "FAILED" ? res?.state : "PENDING",
      paymentBy: "partner",
      gatewayId: walletObj?.gatewayId,
      paymentGateway: "PHONEPE",
      paymentFor: "wallet",
      particular: `Wallet payment from partner ${walletObj.paymentStatus}`,
      transactionType: "credited",
    };

    await Transaction.create([adminTransactionPayload], { session });

    // Prepare transaction payload
    const partnerTransactionPayload = {
      // adminId: adminId,
      walletPayment: walletObj._id,
      partnerId: walletObj.partnerId,
      bookingId: walletObj.bookingId,
      amount: walletObj.amount,
      invoiceNo: walletObj.invoiceNo,
      merchantOrderId: walletObj.merchantOrderId,
      transactionId: walletObj.transactionId,
      paymentMethod: walletObj.paymentMethod,
      paymentStatus: res?.state == "FAILED" ? res?.state : "PENDING",
      paymentBy: "partner",
      paymentFor: "wallet",
      gatewayId: walletObj?.gatewayId,
      paymentGateway: "PHONEPE",
      particular: `partner payment to Admin is ${walletObj.paymentStatus}`,
      transactionType: "debited",
    };
    await Transaction.create([partnerTransactionPayload], { session });

    await session.commitTransaction();
    return createResponse(true, null, `Your transaction is ${partnerTransactionPayload?.paymentStatus}`);
  } catch (error: any) {
    await session.abortTransaction();
    return createResponse(false, null, error.message || `Error when updating your payment transaction`);
  } finally {
    session.endSession();
  }
}

export async function payBidingPayment(biddetails: any) {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const adminId = await getAdminId();
    if (!adminId) {
      throw new Error("Admin not found");
    }

    const bidChargeDetails = await getBidingCharge(biddetails?.price);
    const merchantOrderId = "BW_WALORD" + Date.now();
    const walletObj = await Wallet.create({
      partnerId: biddetails.partnerId,
      jobId: biddetails?.jobId,
      bidId: biddetails?._id,
      adminId,
      paymentMethod: "wallet",
      paymentStatus: "COMPLETED",
      particular: "Payment! biding amount",
      merchantOrderId,
      invoiceNo: `INV${Date.now()}`,
      amount: bidChargeDetails?.bidChargeFixed,
      walletType: "deducted"
    });


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
      paymentBy: "partner",
      paymentFor: "wallet",
      particular: "Received! biding amount",
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
      paymentBy: "partner",
      paymentFor: "wallet",
      particular: "Payment! biding amount",
      transactionType: "debited",
    };
    await Transaction.create([partnerTransactionPayload], { session });

    await session.commitTransaction();

    if (walletObj) {
      let partnerId: string = walletObj?.partnerId.toString();
      await updatePartnerWalletAmount(partnerId);
      // await addBookingStatus(walletObj?.partnerId, walletObj.jobId, "confirmed");
    }

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    console.error("Transaction failed:", error);
  } finally {
    session.endSession();
  }

}

export async function getBidingCharge(jobPrice: number) {
  const bid_charge_details = await BidCharges.findOne({ status: true }).lean(); // use .lean() for performance
  const bidCharge = Number(bid_charge_details?.bid_charge) || 0;
  const bidChargeAmount = (jobPrice * bidCharge) / 100;
  const bidChargeFixed = parseFloat(bidChargeAmount.toFixed(2));
  return { bidChargeFixed }
}

export async function bidingPaymentInWallet(biddetails: any) {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const adminId = await getAdminId();
    if (!adminId) {
      throw new Error("Admin not found");
    }

    const merchantOrderId = "BW_WALORD" + Date.now();
    const walletObj = await Wallet.create({
      partnerId: biddetails.partnerId,
      jobId: biddetails?.jobId,
      bidId: biddetails?._id,
      adminId,
      paymentMethod: "wallet",
      paymentStatus: "COMPLETED",
      merchantOrderId,
      invoiceNo: `INV${Date.now()}`,
      amount: biddetails?.bidCharge,
      walletType: "added"
    });


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
      paymentBy: "partner",
      paymentFor: "wallet",
      particular: "Payment! bid cancel amount",
      transactionType: "debited",
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
      paymentBy: "partner",
      paymentFor: "wallet",
      particular: "Received! bid cancel amount",
      transactionType: "credited",
    };
    await Transaction.create([partnerTransactionPayload], { session });

    await session.commitTransaction();

    if (walletObj) {
      let partnerId: string = walletObj?.partnerId.toString();
      await updatePartnerWalletAmount(partnerId);
      // await addBookingStatus(walletObj?.partnerId, walletObj.jobId, "confirmed");
    }

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    console.error("Transaction failed:", error);
  } finally {
    session.endSession();
  }
}


export async function bulkBidingPaymentReturn(jobId: any, status: any, message: string) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const adminId = await getAdminId();
    if (!adminId) throw new Error("Admin not found");

    // Fetch all bids for the given job
    const bids = await Bid.find(
      {
        jobId,
        status: { $in: Array.isArray(status) ? status : [status] }, // handles both single or multiple statuses
        bidPaymentStatus: "COMPLETED",
      },
      "_id partnerId bidCharge status" // optional: projection for performance
    ).lean();



    if (!bids.length) return console.log("No bids found for this job");

    const now = Date.now();

    // Prepare wallet documents
    const walletsData = bids.map((bid) => ({
      partnerId: bid.partnerId,
      jobId: bid.jobId,
      bidId: bid._id,
      adminId,
      paymentMethod: "wallet",
      paymentStatus: "COMPLETED",
      merchantOrderId: "BW_WALORD" + now + Math.floor(Math.random() * 1000),
      invoiceNo: `INV${now + Math.floor(Math.random() * 1000)}`,
      amount: bid.bidCharge,
      particular: `Received! ${message}`,
      walletType: "added",
    }));

    // Bulk create wallets
    const wallets = await Wallet.insertMany(walletsData, { session });

    // Prepare all transactions
    const transactions: any[] = [];
    for (const wallet of wallets) {
      // Admin transaction (debit)
      transactions.push({
        adminId,
        walletPayment: wallet._id,
        bookingId: wallet?.bookingId,
        amount: wallet.amount,
        invoiceNo: wallet.invoiceNo,
        merchantOrderId: wallet.merchantOrderId,
        transactionId: wallet.transactionId,
        paymentMethod: wallet.paymentMethod,
        paymentStatus: wallet.paymentStatus,
        paymentBy: "partner",
        paymentFor: "wallet",
        particular: `Payment! ${message}`,
        transactionType: "debited",
      });

      // Partner transaction (credit)
      transactions.push({
        walletPayment: wallet._id,
        partnerId: wallet.partnerId,
        bookingId: wallet?.bookingId,
        amount: wallet.amount,
        invoiceNo: wallet.invoiceNo,
        merchantOrderId: wallet.merchantOrderId,
        transactionId: wallet.transactionId,
        paymentMethod: wallet.paymentMethod,
        paymentStatus: wallet.paymentStatus,
        paymentBy: "partner",
        paymentFor: "wallet",
        particular: `Received! ${message}`,
        transactionType: "credited",
      });
    }

    // Bulk insert all transactions
    await Transaction.insertMany(transactions, { session });

    // Update partner wallet balances in parallel
    const uniquePartnerIds = [...new Set(wallets.map(w => w.partnerId.toString()))];
    await Promise.all(uniquePartnerIds.map(id => updatePartnerWalletAmount(id)));

    await session.commitTransaction();

  } catch (error) {
    await session.abortTransaction();
    console.error("Transaction failed:", error);
  } finally {
    session.endSession();
  }
}


function getStatusesBetween(list: any, key: string, count: number) {
  const index = list.findIndex((item: any) => item.key === key);
  if (index === -1) return []; // key not found
  return list.slice(index, index + count + 1);
}

export async function getNearMeDoneJobs(query: any, limit: any = 10, customerId: any, categoryId: any = null, latitude: any, longitude: any): Promise<GenericResponseCode<any>> {

  const customer = await Customer.findOne({ user: customerId }).select("latitude longitude");
  if (!customer)
    return createResponseStatus(400, null, "customer not found");
  const maxDistance = 200 * 1000; // 200 km in meters 

  const matchStage = categoryId
    ? { "service.category": new mongoose.Types.ObjectId(categoryId) }
    : {}; // empty match => include all  

  const nearByMeDone = await Job.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [customer?.longitude as number, customer?.latitude as number]
        },
        distanceField: "distance",
        maxDistance: maxDistance, // meters
        spherical: true
      }
    },
    { $match: query },

    // Lookup service details
    {
      $lookup: {
        from: "services",
        localField: "serviceId",
        foreignField: "_id",
        as: "service"
      }
    },
    { $unwind: "$service" },

    ...(Object.keys(matchStage).length ? [{ $match: matchStage }] : []),

    // Lookup category
    {
      $lookup: {
        from: "categories",
        localField: "service.category",
        foreignField: "_id",
        as: "category"
      }
    },
    { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },

    // Lookup booking
    {
      $lookup: {
        from: "bookings",
        localField: "bookingId",
        foreignField: "_id",
        as: "booking"
      }
    },
    { $unwind: { path: "$booking", preserveNullAndEmptyArrays: true } },

    // 🟢 Group by serviceId — count total jobs per service
    {
      $group: {
        _id: "$serviceId",
        totalJobs: { $sum: 1 },
        service: { $first: "$service" },
        category: { $first: "$category" },
        sampleJob: { $first: "$$ROOT" } // keep one job sample for preview
      }
    },

    // 🟢 Project final output
    {
      $project: {
        _id: 1,
        serviceId: "$_id",
        serviceName: "$service.name",
        image: "$service.image",
        pricingTiers: "$service.pricingTiers",
        categoryId: "$service.category",
        categoryName: "$category.name",
        totalJobs: 1,
        jobDistance: { $divide: ["$sampleJob.distance", 1000] }, // km
        job_date: "$sampleJob.booking.booking_date",
        job_time: "$sampleJob.booking.partner_availability_time",
        title: "$sampleJob.title",
        description: "$sampleJob.description"
      }
    },

    // 🟢 Sort and limit
    { $sort: { totalJobs: -1 } },
    { $limit: parseInt(limit) }
  ]);

  const serviceIds = nearByMeDone.map((job: any) => {
    return job.serviceId.toString();
  })

  const partnerServiceCount = await serviceWisePartnerCount(serviceIds, customerId);

  const bookmarkIds = (await Bookmark.find({ customerId }).distinct("serviceId"))
    .map(id => id.toString());
  let pricingTiersType = await customerSubscriptionPlanType(customerId);

  const serviceRatings = await serviceWiseRatingDetails(serviceIds)
  let increaseServicePartner = await increaseServicePartnerAvl();
  const allJobs = await Promise.all(
    nearByMeDone.map(async (job: any) => {
      if (job?.image) {
        job.image = job?.image
          ? `${process.env.BASE_URL}/uploads/servicesImage/${job?.image}`
          : null;
      }

      job.price = await checkCustomerType(job, customerId, pricingTiersType);
      job.totalRatings = serviceRatings[job?.serviceId?.toString()] ? serviceRatings[job?.serviceId?.toString()].totalRatings : 0;
      job.averageRating = serviceRatings[job?.serviceId?.toString()] ? serviceRatings[job?.serviceId?.toString()].averageRating : 0;
      const [day, month, year] = job.job_date.split("/");
      job.job_date = await dateFormate(`${year}-${month}-${day}`);
      delete job.pricingTiers;

      let bookmarkStatus: Boolean = false;
      if (bookmarkIds.includes(job?.serviceId.toString())) {
        bookmarkStatus = true;
      }
      const partnerCount = partnerServiceCount[job?.serviceId.toString()] ? partnerServiceCount[job?.serviceId.toString()].totalPartners : 0;

      return {
        ...job,
        bookmarkStatus,
        jobDistance: job?.jobDistance.toFixed(0), //jobDistance,
        workerAvl: (partnerCount + increaseServicePartner)
      };
    })
  )

  const total_service = await Service.countDocuments({ status: "active" });
  const lastId = allJobs.length > 0 ? allJobs[allJobs.length - 1]._id : null;
  return createResponseStatus(200, { allJobs, lastId, total_service }, "job fetch successfully");
}

export async function filterServices(query: any, limit: string, searchtext: string, categoryIds: any, customerId: any) {

  const match = { ...query };

  if (Array.isArray(categoryIds) && categoryIds.length > 0) {
    match["category._id"] = { $in: categoryIds.map(id => new mongoose.Types.ObjectId(id)) };
  }

  if (searchtext && searchtext.trim() !== "") {
    match.$or = [
      { name: { $regex: searchtext, $options: "i" } },
      { description: { $regex: searchtext, $options: "i" } },
      { metaTitle: { $regex: searchtext, $options: "i" } },
      { metaDescripton: { $regex: searchtext, $options: "i" } },
      { metaKeyword: { $regex: searchtext, $options: "i" } },
      { "category.name": { $regex: searchtext, $options: "i" } },
      { "category.description": { $regex: searchtext, $options: "i" } },
      { "categorytype.name": { $regex: searchtext, $options: "i" } },
      { "categorytype.description": { $regex: searchtext, $options: "i" } },
    ];
  }

  const result = await Service.aggregate([
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "category",
      },
    },
    { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "categorytypes",
        localField: "categorytype",
        foreignField: "_id",
        as: "categorytype",
      },
    },
    { $unwind: { path: "$categorytype", preserveNullAndEmptyArrays: true } },
    { $match: match },
    {
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        image: 1,
        pricingTiers: 1,
        "category.name": 1,
        "categorytype.name": 1,
      },
    },
    { $sort: { _id: -1 } },
    { $limit: Number(limit) || 10 },
  ]);

  const serviceIds = result?.map((element) => {
    return element?._id?.toString()
  })

  const servicesRating = await serviceWiseRatingDetails(serviceIds);
  const partnerServiceCount = await serviceWisePartnerCount(serviceIds, customerId);

  const bookmarkIds = (await Bookmark.find({ customerId }).distinct("serviceId"))
    .map(id => id.toString());

  let pricingTiersType = await customerSubscriptionPlanType(customerId);
  let increaseServicePartner = await increaseServicePartnerAvl();
  const allJobs = await Promise.all(
    result.map(async (jobs) => {
      if (jobs?.image) {
        jobs.image = jobs?.image
          ? `${process.env.BASE_URL}/uploads/servicesImage/${jobs?.image}`
          : null;
      }

      jobs.price = await checkCustomerType(jobs, customerId, pricingTiersType);
      jobs.bookmarkStatus = false;
      if (bookmarkIds.includes(jobs?._id.toString())) {
        jobs.bookmarkStatus = true;
      }


      if (jobs?.pricingTiers?.[0]) {
        delete jobs.pricingTiers;
      }
      const rating = servicesRating[jobs?._id.toString()] ? servicesRating[jobs?._id.toString()]?.averageRating : 0;
      const partnerCount = partnerServiceCount[jobs?._id.toString()] ? partnerServiceCount[jobs?._id.toString()].totalPartners : 0;

      return {
        ...jobs,
        rating,
        workerAvl: (partnerCount + increaseServicePartner)
      }
    })
  )
  return {
    allJobs,
    lastId: allJobs.length > 0 ? allJobs[(allJobs.length) - 1]._id : null
  };

}

export async function serviceRatingDetails(serviceId: any = null, partnerId: any = null) {
  const query: any = {};
  if (partnerId) {
    query.partnerId = partnerId;
  }
  if (serviceId) {
    query.serviceId = serviceId;
  }
  const result = await Rating.find(query)
    .select("description rating serviceId jobId createdAt customerId")
    .populate("customerId", "name")
    .sort({ _id: -1 })
    .lean();
  if (!result.length) {
    return {
      review: 0,
      reviewPercentage: 0,
      reviewList: []
    };
  }

  // Extract all unique customerIds from Rating
  const customerIds = result
    .map(r => r.customerId?._id?.toString())
    .filter(Boolean);

  // Fetch Customer profiles by _id (not user)
  const profiles = await Customer.find({ user: { $in: customerIds } })
    .select("user profile")
    .lean();

  const profileMap = profiles.reduce((acc: any, p: any) => {
    acc[p.user.toString()] = p.profile ? `${process.env.BASE_URL}/uploads/profile/${p.profile}` : null;
    return acc;
  }, {} as Record<string, string>);

  // Build final review list 
  const reviewList = await Promise.all(
    result.map(async (review: any) => {
      review.timeago = await format(review?.createdAt?.getTime());
      review.name = review.customerId?.name || "Unknown";
      review.customerId = review?.customerId?._id;
      review.profile = profileMap[review.customerId?.toString()] || null;
      delete review.createdAt;
      return review;
    })
  );

  const totalReviews = result.length;
  const totalRating = result.reduce((sum: number, r: any) => sum + (r.rating || 0), 0);
  const averageRating = totalRating / totalReviews;
  return {
    review: totalReviews,
    averageRating: Number(averageRating.toFixed(1)),
    reviewList: reviewList
  }
}

export async function getBookingTransaction(query: any, limit: string) {
  const result = await Booking.find(query)
    .select("customerId paymentMode paymentImage serviceId paymentStatus totalAmount status createdAt updatedAt")
    .populate("jobId", "title")
    .limit(Number(limit) || 10)
    .sort({ _id: -1 }) // latest first
    .lean();

  // map and clean job data
  const resHistory = await Promise.all(
    result.map(async (transaction: any) => {
      const particular = transaction?.jobId?.title || null;
      const { jobId, ...rest } = transaction;
      let createdAt = await moment(transaction?.updatedAt).tz("Asia/Kolkata").format('DD MMM, YYYY HH:mm:ss');
      return { ...rest, particular, amount: transaction?.totalAmount, createdAt, paymentIcon: "job" };
    })
  )

  const newLastId = resHistory.length > 0 ? resHistory[resHistory.length - 1]._id : null;
  return { allTransaction: resHistory, lastId: newLastId }
}

export async function checkOTPDisplay(status: string) {
  let flag = false;
  if (["arrived", "paused", "awaiting_material", "awaiting_payment", "in_progress"].includes(status)) {
    flag = true;
  }
  return flag;
}

export async function serviceWiseRatingDetails(serviceIds: any) {
  const uniqueIds = [...new Set(serviceIds)];
  const result = await Rating.aggregate([
    {
      $match: {
        serviceId: { $in: uniqueIds.map((id: any) => new mongoose.Types.ObjectId(id)) }
      }
    },
    {
      $group: {
        _id: "$serviceId",
        averageRating: { $avg: "$rating" },
        totalRatings: { $sum: 1 },
      }
    },
    {
      $project: {
        _id: 0,
        serviceId: "$_id",
        averageRating: { $round: ["$averageRating", 1] }, // round to 1 decimal
        totalRatings: 1
      }
    }
  ]);

  const reduceResult = result.reduce((acc, item) => {
    acc[item.serviceId.toString()] = {
      totalRatings: item.totalRatings,
      averageRating: item.averageRating
    }
    return acc;
  }, {})
  return reduceResult;
}

export async function serviceWisePartnerCount(services: any, customerId: any) {
  let serviceIds = services.map((id: any) => new mongoose.Types.ObjectId(id));
  // Convert to strings for Set uniqueness, then back to ObjectId
  serviceIds = [...new Set(serviceIds.map((id: any) => id.toString()))].map((id: any) => new mongoose.Types.ObjectId(id));

  const customer = await Customer.findOne({ user: customerId }).select("longitude latitude");
  if (!customer)
    return [];

  const result = await Partner.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [customer?.longitude as number, customer?.latitude as number] // [lng, lat]
        },
        distanceField: "distance",
        maxDistance: 40000,// 40 km
        spherical: true,
        distanceMultiplier: 0.001
      }
    },
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

export async function applicantsRatingDetails(partnerIds: any) {
  const query: any = {};
  if (partnerIds) {
    query.partnerId = { $in: partnerIds.map((id: any) => new mongoose.Types.ObjectId(id)) };
  }
  const result = await Rating.aggregate([
    { $match: query }, // your dynamic filter
    {
      $group: {
        _id: "$partnerId",
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
        reviews: {
          $push: {
            rating: "$rating",
            description: "$description",
            serviceId: "$serviceId",
            jobId: "$jobId",
            createdAt: "$createdAt"
          }
        }
      },
    },
    {
      $lookup: {
        from: "users", // collection name (check your model)
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $project: {
        _id: 0,
        partnerId: "$_id",
        partnerName: "$user.name",
        rating: { $round: ["$averageRating", 1] }, // round to 1 decimal
        totalReviews: 1,
        reviews: 1,
      },
    },
  ])

  if (!result.length) {
    return {
      review: 0,
      reviewPercentage: 0,
      reviewList: []
    };
  }
  // Extract all unique customerIds from Rating
  const partnerIdIds = result
    .map(r => r.partnerId?._id?.toString())
    .filter(Boolean);

  // Fetch Customer profiles by _id (not user)
  const profiles = await Partner.find({ user: { $in: partnerIdIds } })
    .select("user profile")
    .lean();

  const profileMap = profiles.reduce((acc: any, p: any) => {
    acc[p.user.toString()] = p.profile ? `${process.env.BASE_URL}/uploads/profile/${p.profile}` : null;
    return acc;
  }, {} as Record<string, string>);

  // Build final review list 
  const reviewList = await Promise.all(
    result.map(async (review: any) => {
      // review.timeago = await format(review?.createdAt?.getTime()); 
      review.partnerId = review?.partnerId?._id;
      review.profile = profileMap[review.partnerId?.toString()] || null;
      delete review.createdAt;
      return review;
    })
  );

  const reduceArray = result.reduce((acc, item) => {
    acc[item.partnerId.toString()] = {
      totalReviews: item?.totalReviews,
      reviews: item?.reviews,
      rating: item?.rating?.toString()
    }
    return acc;
  }, {})
  return reduceArray
}


export async function customerReferralPointDetails(userId: any) {
  const statusFilter = { $in: ["active", "in_queue", "expired"] };
  const baseSelect = "userId referralcodeId subscriptionPlans referrerBy";
  // User earned referral points (someone referred this user)
  const registrationPoint: any = await UserSubscription.findOne({
    userId,
    status: statusFilter,
    referrerBy: { $ne: null }
  })
    .select(baseSelect)
    .populate("referralcodeId", "referraltoPoint")
    .lean();
  // User gave referral points (this user referred others)
  const referralPoints: any = await UserSubscription.find({
    referrerBy: userId,
    status: statusFilter
  })
    .select(baseSelect)
    .populate("referralcodeId", "referralFromPoint")
    .lean();

  let totalPoints = registrationPoint?.referralcodeId ? registrationPoint?.referralcodeId?.referraltoPoint : 0;

  let referralPoint = referralPoints.reduce((acc: number, item: any) => {
    acc = acc + (parseInt(item?.referralcodeId?.referralFromPoint))
    return acc;
  }, 0)

  let totalRedeemPoints = await getCustomerRedeemPoints(userId);
  let totalReferralPoint = totalPoints + referralPoint;
  return {
    totalPoints: totalReferralPoint,
    avilable: (totalReferralPoint - totalRedeemPoints),
    redeem: totalRedeemPoints
  }
}


export async function getCustomerRedeemPoints(userId: any) {
  const result = await Wallet.aggregate([
    {
      $match: {
        customerId: new mongoose.Types.ObjectId(userId),
        paymentStatus: "COMPLETED",
        paymentMethod: "redeem_points",
      }
    },
    {
      $group: {
        _id: null,
        totalPoints: { $sum: { $ifNull: ["$referral_points_redeemed", 0] } }
      }
    }
  ]);

  const totalPoints = result.length ? result[0].totalPoints : 0;

  return totalPoints;
}

export async function referralPointDetails(userId: any) {
  const statusFilter = { $in: ["active", "in_queue", "expired"] };
  const baseSelect = "userId subscriptionPlans referrerBy";
  // User earned referral points (someone referred this user)
  const registrationPoint: any = await UserSubscription.findOne({
    userId,
    status: statusFilter,
    referrerBy: { $ne: null }
  })
    .select(baseSelect)
    .populate("referralcodeId", "referraltoPoint")
    .lean();
  // User gave referral points (this user referred others)
  const referralPoints: any = await UserSubscription.find({
    referrerBy: userId,
    status: statusFilter
  })
    .select(baseSelect)
    .populate("referralcodeId", "referralFromPoint")
    .lean();
  let totalPoints = registrationPoint?.referralcodeId ? registrationPoint?.referralcodeId?.referraltoPoint : 0;

  let referralPoint = referralPoints.reduce((acc: number, item: any) => {
    acc = acc + parseInt(item?.referralcodeId?.referralFromPoint)
    return acc;
  }, 0)

  let totalRedeemPoints = await getRedeemPoints(userId);
  let totalReferralPoint = totalPoints + referralPoint;
  return {
    totalPoints: totalReferralPoint,
    avilable: (totalReferralPoint - totalRedeemPoints),
    redeem: totalRedeemPoints
  }
}


export async function getRedeemPoints(userId: any) {
  const checkUser: any = await User.findById(userId).select("role");
  let matchQuery: any = {
    paymentStatus: "COMPLETED",
    paymentMethod: "redeem_points"
  };
  if (checkUser?.role === "customer") {
    matchQuery.customerId = userId;
  } else {
    matchQuery.partnerId = userId;
  } 
  const result = await Wallet.aggregate([
    {
      $match: matchQuery
    },
    {
      $group: {
        _id: null,
        totalPoints: { $sum: { $ifNull: ["$referral_points_redeemed", 0] } }
      }
    }
  ]);

  const totalPoints = result.length ? result[0].totalPoints : 0;
  console.log(result, 'result');
  return totalPoints;
}


export async function convertReferralPoints(points: number, redeemRate: number) {
  // convert rate to integer scale (₹0.10 → 10 paise)
  const rateInPaise = Math.round(redeemRate * 100); // 10

  // total amount in paise
  const totalPaise = points * rateInPaise;

  // redeemable amount (full rupees only)
  const redeemableRupees = Math.floor(totalPaise / 100);

  // used points
  const usedPoints = Math.floor((redeemableRupees * 100) / rateInPaise);

  // remaining points
  const remainingPoints = points - usedPoints;

  return {
    redeemableAmount: redeemableRupees, // ₹
    usedPoints,
    remainingPoints
  };
}

