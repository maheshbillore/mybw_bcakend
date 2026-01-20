import { create } from "lodash";
import UserSubscription from "../models/user.subscription.model.js";
import { GenericResponse } from "../shared/type.js";
import { createResponse } from "../utils/helper.js";
import { generatePhonePePaymentLink, getPhonePeAccessToken, initiateTransaction, verifyTransaction } from "../utils/phonepe.js";

export class PhonepeService {
    static async initiatePayment(data: any): Promise<GenericResponse<any>> {
        try {
            const { amount } = data;
            const txnId = "TID_" + Date.now();
            const redirectUrl = "https://bharatworker.com/payment-success";
            const response = await initiateTransaction(txnId, amount * 100, redirectUrl); // Convert to paise

            return {
                success: true,
                data: { paymentLink: response.data.instrumentResponse.redirectInfo.url },
                message: "Payment done"
            }
        } catch (error: any) {
            return {
                success: false,
                data: null,
                message: error
            }
        }
    }
    static async verifyTransaction(transactionId: string): Promise<GenericResponse<any>> {
        try {

            if (!transactionId) {
                return {
                    success: false,
                    data: null,
                    message: "transactionId is required"
                }
            }

            const result = await verifyTransaction(transactionId);
            return {
                success: true,
                data: result,
                message: "Transaction done"
            }

        } catch (error: any) {
            return {
                success: false,
                data: null,
                message: error?.message
            }
        }
    }

    static async partnerSubscriptionPayNow(data: any, partnerId: any): Promise<GenericResponse<any>> {
        try {

            const { amount, merchantOrderId,phonepeToken } = data;
            const checkRequest = await UserSubscription.findOne({merchantOrderId:merchantOrderId,status:"pending",userId:partnerId,payableAmount:amount});
            if(!checkRequest)
                return createResponse(false,null,"Request is not valid");
            const createPayment =await generatePhonePePaymentLink(phonepeToken,merchantOrderId,amount);
            return {
                success: true,
                data:{
                    "redirectLink":createPayment
                },
                message: "Payment link is generate successfuly !"
            }
        } catch (error: any) {
            return {
                success: false,
                data: null,
                message: error
            }
        }
    }
}