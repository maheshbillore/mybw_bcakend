import CouponCode from "../models/coupon.code.model.js";
import Partner from "../models/partner.model.js";
import ReferralCode from "../models/referral.code.model.js";
import subscriptionPlansModel from "../models/subscriptionPlans.model.js";
import UserSubscription from "../models/user.subscription.model.js";
import { GenericResponse, GenericResponseCode } from "../shared/type.js";
import { getCouponCodeUses, isValidCoupon } from "../utils/comman.js";
import { calculateCouponWithSubscriptionPlanDiscount, checkReferralDetails, createResponse, createResponseStatus } from "../utils/helper.js";

export default class CouponCodeService {
    static async add(data: any): Promise<GenericResponseCode<any>> {
        try {
            const { couponCode, discountAmount, discountType } = data;
            if (!couponCode || !discountAmount || !discountType) {
                return {
                    status: 409,
                    data: null,
                    message: "All field are required"
                }
            }
            if (!isValidCoupon(couponCode)) {
                return {
                    status: 409,
                    data: null,
                    message: "Coupon Code must we mix of string"
                }
            }

            const checkCoupon = await CouponCode.findOne({ couponCode: couponCode });
            if (checkCoupon) {
                return {
                    status: 409,
                    data: null,
                    message: "This coupon code already exists. Please try another one."
                }
            }

            if ((discountType === "%") && (discountAmount > 100)) {
                return {
                    status: 400,
                    data: null,
                    message: "Discount percentage must be between 1 and 100",
                }
            }

            data.status = "inactive";
            data.couponCode = data?.couponCode.trim().toUpperCase();
            const result = await CouponCode.create(data);

            return {
                status: 200,
                data: result,
                message: "Coupon Code added successfully !"
            }
        } catch (error: any) {
            return {
                status: 500,
                data: null,
                message: error?.errorResponse?.errmsg ?? "Oops! Something went wrong. Please try again"
            }

        }
    }

    static async get(): Promise<GenericResponse<any>> {
        try {
            // { target: "partner" }
            const result = await CouponCode.find({ target: "partner" }).sort({ _id: -1 }).lean();
            const couponIds = result?.map((element) => element?._id);
            const query = { couponCodeId: { $in: couponIds } };
            const totalUses = await getCouponCodeUses(query);
            const res = result?.map((element: any) => {
                let usageCount = totalUses[element?._id?.toString()] || 0;
                return {
                    ...element,
                    usageCount
                }
            })
            return {
                success: true,
                data: res,
                message: "Coupon code get successfully"
            }
        } catch (error: any) {
            return {
                success: false,
                data: null,
                message: error?.message ?? "Oops! Something went wrong. Please try again"
            }
        }
    }

    static async update(couponId: any, data: any): Promise<GenericResponse<any>> {
        try {
            const { couponCode, discountAmount, discountType } = data;
            if (!couponCode || !discountAmount || !discountType) {
                return {
                    success: false,
                    data: null,
                    message: "All field are required"
                }
            }
            const result = await CouponCode.findByIdAndUpdate(
                couponId,
                { couponCode: couponCode, discountAmount: discountAmount, discountType: discountType },
                { new: true }
            )
            return {
                success: true,
                data: result,
                message: "Coupon code update successfuly !"
            }
        } catch (error: any) {
            return {
                success: false,
                data: null,
                message: error?.message ?? "Oops! Something went wrong. Please try again"
            }
        }
    }

    static async delete(couponId: any): Promise<GenericResponseCode<any>> {
        try {
            if (!couponId) {
                return {
                    status: 409,
                    data: null,
                    message: "Coupon Code is not found"
                }
            }

            const checkCoupon = await UserSubscription.findOne({ couponCodeId: couponId });
            if (checkCoupon)
                return createResponseStatus(409, null, "This Coupon Code is currently in use and cannot be deleted.");

            const result = await CouponCode.findByIdAndDelete(couponId);

            if (result == null) {
                return {
                    status: 400,
                    data: null,
                    message: "Coupon Code is not found"
                }
            }

            return {
                status: 200,
                data: null,
                message: "Coupon Code delete successfully!"
            }
        } catch (error: any) {
            return {
                status: 500,
                data: null,
                message: error?.message ?? "Oops! Something went wrong. Please try again"
            }
        }
    }

    static async checkCouponReferral(data: any, partnerId: any): Promise<GenericResponse<any>> {
        try {
            let codeType = "coupon";
            const { referralOrCoupon, subscriptionplans } = data;

            // Helper function to create response
            const createResponse = (success: boolean, data: any, message: string) => ({
                success,
                data,
                message
            });

            // Validate required fields
            if (!referralOrCoupon || !subscriptionplans) {
                return createResponse(false, null, "All fields are required");
            }

            // Detect referral code if it's a number
            if (!isNaN(referralOrCoupon)) {
                codeType = "referral";
            }

            // Find subscription plan
            const subscriptionDetails = await subscriptionPlansModel.findById(subscriptionplans);
            if (!subscriptionDetails) {
                return createResponse(false, null, "Subscription Plan not found");
            }

            // Handle Coupon Code
            if (codeType === "coupon") {
                const coupon = await CouponCode.findOne({ couponCode: referralOrCoupon, status: "active", target: "partner" });
                if (!coupon) {
                    return createResponse(false, null, "Coupon code is invalid");
                }

                const result = await calculateCouponWithSubscriptionPlanDiscount(coupon, subscriptionDetails);

                return createResponse(true, result, `Congrats! ${codeType} code applied: Rs. ${result?.discount} OFF`);
            }

            // Handle Referral Code
            const referralPartner = await Partner.findOne({ referralCode: referralOrCoupon, user: { $ne: partnerId } });
            if (!referralPartner)
                return createResponse(false, null, "Invalid Referral Code");


            const checkPartnterSubscriptionStatus: any = await UserSubscription.findOne({
                userId: referralPartner?.user?.toString(),
                status: { $in: ["active", "in_queue", "expired"] }
            });
            if (!checkPartnterSubscriptionStatus)
                return createResponse(false, null, "The referral code you entered is not active at the moment.");


            if (!referralPartner?.isSubscriptionPlaneActive)
                return createResponse(false, null, "The referral code you entered is not active at the moment.");

            const referralCodeDetails = await ReferralCode.findOne({ subscriptionPlans: subscriptionplans });
            if (!referralCodeDetails) {
                return createResponse(false, null, "No referral code details are available for this subscription plan");
            }

            const referralResult = await checkReferralDetails(subscriptionDetails, referralCodeDetails);

            if (referralResult?.codeType == "referral code") {
                referralResult.referralOrCoupon = referralOrCoupon;
                const checkReferralUsed = await Partner.findOne({ user: partnerId, referredBy: null });
                if (!checkReferralUsed)
                    return createResponse(false, null, "Referral code can be applied only once per user.");
            }

            return createResponse(
                true,
                referralResult,
                `Referral code applied successfully. You have received ${referralResult.referalPoints} reward points`
            );

        } catch (error: any) {
            return {
                success: false,
                data: null,
                message: error?.message ?? "Oops! Something went wrong. Please try again"
            };
        }

    }

    static async addCustomerCouponCode(payload: any): Promise<GenericResponseCode<any>> {
        try {
            const { couponCode, discountAmount, discountType } = payload;
            if (!couponCode || !discountAmount || !discountType) {
                return {
                    status: 409,
                    data: null,
                    message: "All field are required"
                }
            }

            if (!isValidCoupon(couponCode)) {
                return {
                    status: 409,
                    data: null,
                    message: "Coupon Code must we mix of string"
                }
            }

            if ((discountType === "%") && (discountAmount > 100)) {
                return {
                    status: 400,
                    data: null,
                    message: "Discount percentage must be between 1 and 100",
                }
            }

            const checkCoupon = await CouponCode.findOne({ couponCode: couponCode });
            if (checkCoupon) {
                return {
                    status: 409,
                    data: null,
                    message: "This coupon code already exists. Please try another one."
                }
            }

            const result = await CouponCode.create({
                status: payload?.status,
                target: "customer",
                couponCode: payload?.couponCode?.trim().toUpperCase(),
                discountAmount: payload?.discountAmount,
                discountType: payload?.discountType
            });

            return {
                status: 200,
                data: result,
                message: "Coupon Code added successfully !"
            }
        } catch (error: any) {
            return {
                status: 500,
                data: null,
                message: error?.errorResponse?.errmsg ?? "Oops! Something went wrong. Please try again"
            }

        }
    }

    static async getCustomerCouponCode(): Promise<GenericResponse<any>> {
        try {
            const result = await CouponCode.find({ target: "customer" }).sort({ _id: -1 }).lean();
            const couponIds = result?.map((element) => element?._id);
            const query = { couponCodeId: { $in: couponIds } };
            const totalUses = await getCouponCodeUses(query);
            const res = result?.map((element: any) => {
                let usageCount = totalUses[element?._id?.toString()] || 0;
                return {
                    ...element,
                    usageCount
                }
            })

            return {
                success: true,
                data: res,
                message: "Coupon code get successfully"
            }
        } catch (error: any) {
            return {
                success: false,
                data: null,
                message: error?.message ?? "Oops! Something went wrong. Please try again"
            }
        }
    }

    static async changeStatus(couponCodeId: any, payload: any): Promise<GenericResponse<any>> {
        try {
            console.log(payload.status, 'payload.status');
            const updatedCoupon = await CouponCode.findByIdAndUpdate(
                couponCodeId,
                { status: payload.status === "active" ? "inactive" : "active" },
                { new: true }
            );
            console.log(updatedCoupon?.status, 'after update status');
            return createResponse(true, { result: updatedCoupon }, "Coupon Code status update successfully");
        } catch (error: any) {
            return createResponse(false, null, error?.data?.message || error?.response?.data?.message || "Error when updating status");
        }
    }
}