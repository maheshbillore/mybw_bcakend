import SubscriptionPlansModel from "../models/subscriptionPlans.model.js";
import UserSubscription from "../models/user.subscription.model.js";
import { ISubscriptionPlanData } from "../shared/interface.js";
import { GenericResponse } from "../shared/type.js";
import { calculateFlatDiscount, calculatePercentageDiscount, createResponse } from "../utils/helper.js";


export class SubscriptionPlansService {
    static async createSubscriptionPlan(data: ISubscriptionPlanData): Promise<GenericResponse<any>> {

        try {
            const existingSubscriptionPlan = await SubscriptionPlansModel.findOne({ name: data.name });
            if (existingSubscriptionPlan) {
                return {
                    success: false,
                    data: null,
                    message: "Subscription plan with this name already exists",
                };
            }

            if (data?.price !== undefined && data?.mrp !== undefined && data.price <= data.mrp) {
                data.flat_discount = Number(calculateFlatDiscount(data.mrp, data.price));
                data.percentage_discount = Number(calculatePercentageDiscount(data.mrp, data.price));
            }

            if (data?.price !== undefined && data?.mrp !== undefined && data.price > data.mrp) {
                return {
                    success: false,
                    data: null,
                    message: "Price is greater than MRP please check the price and mrp",
                };
            }
            const subscriptionPlan = await SubscriptionPlansModel.create(data);
            return {
                success: true,
                data: subscriptionPlan,
                message: "Subscription plan created successfully",
            };
        } catch (error: any) {
            return {
                success: false,
                data: null,
                message: error.message || "Failed to create subscription plan",
            };
        }
    }

    static async getAllSubscriptionPlans(): Promise<GenericResponse<any>> {
        try {
            const subscriptionPlans = await SubscriptionPlansModel.find({ target: "partner" }).select("-target");
            return {
                success: true,
                data: subscriptionPlans,
                message: "Subscription plans fetched successfully",
            };
        } catch (error) {
            return {
                success: false,
                data: null,
                message: "Failed to fetch subscription plans",
            };
        }
    }

    static async updateSubscriptionPlan(id: string, data: ISubscriptionPlanData): Promise<GenericResponse<any>> {
        try {

            if (data?.price !== undefined && data?.mrp !== undefined && data.price <= data.mrp) {
                data.flat_discount = Number(calculateFlatDiscount(data.mrp, data.price));
                data.percentage_discount = Number(calculatePercentageDiscount(data.mrp, data.price));
            }

            if (data?.price !== undefined && data?.mrp !== undefined && data.price > data.mrp) {
                return {
                    success: false,
                    data: null,
                    message: "Price is greater than MRP please check the price and mrp",
                };
            }

            const subscriptionPlan = await SubscriptionPlansModel.findByIdAndUpdate(id, data, { new: true });

            if (!subscriptionPlan) {
                return {
                    success: false,
                    data: null,
                    message: "Subscription plan not found",
                };
            }
            return {
                success: true,
                data: subscriptionPlan,
                message: "Subscription plan updated successfully",
            };
        } catch (error) {
            return {
                success: false,
                data: null,
                message: "Failed to update subscription plan",
            };
        }
    }

    static async deleteSubscriptionPlan(id: string): Promise<GenericResponse<any>> {
        try {
            const checkSusbscrition = await UserSubscription.findOne({ subscriptionPlans: id });
            if (checkSusbscrition)
                return createResponse(false, null, "This Subscription Plan is currently in use and cannot be deleted.");


            const subscriptionPlan = await SubscriptionPlansModel.findByIdAndDelete(id);
            if (!subscriptionPlan) {
                return {
                    success: false,
                    data: null,
                    message: "Subscription plan not found",
                };
            }
            return {
                success: true,
                data: subscriptionPlan,
                message: "Subscription plan deleted successfully",
            };
        } catch (error) {
            return {
                success: false,
                data: null,
                message: "Failed to delete subscription plan",
            };
        }
    }

    static async createCustomerSubscriptionPlan(data: ISubscriptionPlanData): Promise<GenericResponse<any>> {

        try {
            const existingSubscriptionPlan = await SubscriptionPlansModel.findOne({ name: data.name });
            if (existingSubscriptionPlan) {
                return {
                    success: false,
                    data: null,
                    message: "Subscription plan with this name already exists",
                };
            }

            if (data?.price !== undefined && data?.mrp !== undefined && data.price <= data.mrp) {
                data.flat_discount = Number(calculateFlatDiscount(data.mrp, data.price));
                data.percentage_discount = Number(calculatePercentageDiscount(data.mrp, data.price));
            }
            data.target = "customer";

            if (data?.price !== undefined && data?.mrp !== undefined && data.price > data.mrp) {
                return {
                    success: false,
                    data: null,
                    message: "Price is greater than MRP please check the price and mrp",
                };
            }
            const subscriptionPlan = await SubscriptionPlansModel.create(data);
            return {
                success: true,
                data: subscriptionPlan,
                message: "Subscription plan created successfully",
            };
        } catch (error: any) {
            return {
                success: false,
                data: null,
                message: error.message || "Failed to create subscription plan",
            };
        }
    }

    static async getCustomerAllSubscriptionPlans(): Promise<GenericResponse<any>> {
        try {
            const subscriptionPlans = await SubscriptionPlansModel.find({ target: "customer" }).select("-target");
            return {
                success: true,
                data: subscriptionPlans,
                message: "Subscription plans fetched successfully",
            };
        } catch (error) {
            return {
                success: false,
                data: null,
                message: "Failed to fetch subscription plans",
            };
        }
    }

    static async updateCustomerSubscriptionPlan(id: string, data: ISubscriptionPlanData): Promise<GenericResponse<any>> {
        try {

            if (data?.price !== undefined && data?.mrp !== undefined && data.price <= data.mrp) {
                data.flat_discount = Number(calculateFlatDiscount(data.mrp, data.price));
                data.percentage_discount = Number(calculatePercentageDiscount(data.mrp, data.price));
            }

            if (data?.price !== undefined && data?.mrp !== undefined && data.price > data.mrp) {
                return {
                    success: false,
                    data: null,
                    message: "Price is greater than MRP please check the price and mrp",
                };
            }

            const subscriptionPlan = await SubscriptionPlansModel.findByIdAndUpdate(id, data, { new: true });

            if (!subscriptionPlan) {
                return {
                    success: false,
                    data: null,
                    message: "Subscription plan not found",
                };
            }
            return {
                success: true,
                data: subscriptionPlan,
                message: "Subscription plan updated successfully",
            };
        } catch (error) {
            return {
                success: false,
                data: null,
                message: "Failed to update subscription plan",
            };
        }
    }
}   