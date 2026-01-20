import ReferralCode from "../models/referral.code.model.js";
import UserSubscription from "../models/user.subscription.model.js";
import { GenericResponse } from "../shared/type.js";
import { createResponse } from "../utils/helper.js";

export class ReferralCodeService {
    static async add(data: any): Promise<GenericResponse<any>> {
        try {
            const { referralFromPoint, referraltoPoint, pointToRupee, subscriptionPlans } = data;
            if (!referralFromPoint || !referraltoPoint || !pointToRupee || !subscriptionPlans) {
                return {
                    success: false,
                    data: null,
                    message: "All field are required"
                }
            }
            const result = await ReferralCode.create(data);
            return {
                success: true,
                data: result,
                message: "Successfully added referral code"
            }
        } catch (error: any) {
            return {
                success: false,
                data: null,
                message: "Oops! Something went wrong. Please try again"
            }
        }
    }
    static async get(): Promise<GenericResponse<any>> {
        try {
            const result = await ReferralCode.find({ status: "active" });
            return {
                success: true,
                data: result,
                message: "Referral Code Fetch successfully !"
            }

        } catch (error: any) {
            return {
                success: false,
                data: null,
                message: error?.message ?? "Oops! Something went wrong. Please try again"
            }
        }
    }

    static async update(referralId: any, data: any): Promise<GenericResponse<any>> {
        try {
            if (!referralId) {
                return {
                    success: false,
                    data: null,
                    message: "referral code is not found"
                }
            }

            const { referralFromPoint, referraltoPoint, pointToRupee, subscriptionPlans } = data;
            if (!referralFromPoint || !referraltoPoint || !pointToRupee || !subscriptionPlans) {
                return {
                    success: false,
                    data: null,
                    message: "All field are required"
                }
            }

            const update = await ReferralCode.findByIdAndUpdate(
                referralId,
                { referralFromPoint, referraltoPoint, pointToRupee, subscriptionPlans },
                { new: true }
            );

            return {
                success: true,
                data: update,
                message: "Referral Code Update successfully"
            }

        } catch (error: any) {
            return {
                success: false,
                data: null,
                message: error?.message ?? "Oops! Something went wrong. Please try again"
            }
        }
    }

    static async delete(referralId: any): Promise<GenericResponse<any>> {
        try {
            if (!referralId) {
                return {
                    success: false,
                    data: null,
                    message: "referral code is not found"
                }
            } 
            const checkReferralCode = await UserSubscription.findOne({referralcodeId:referralId});
            if(checkReferralCode)
                return createResponse(false,null,"This referral code is currently in use and cannot be deleted.");

            const result = await ReferralCode.findByIdAndDelete(referralId); 
            if(result==null){
                return {
                    success:true,
                    data:null,
                    message: "referral code is not found"
                }
            }
            return {
                success: true,
                data: result,
                message: "Referral Code delete successfully"
            }
        } catch (error: any) {
            return {
                success: false,
                data: null,
                message: error?.message ?? "Oops! Something went wrong. Please try again"
            }
        }
    }
}