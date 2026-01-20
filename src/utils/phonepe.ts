import axios from "axios";
import crypto from "crypto";
import Setting from "../models/setting.model.js";

// SU2503201903365666164743   //healermeet
// ebea5492-36d0-4c0c-8640-234c71cd2354 //healermeet

const isProduction = true;
const clientId = isProduction ? "SU2510081710268549332193" : "SARAHUAT_2503181731558195757971";
const clientSecret = isProduction ? "1017d648-cc49-4a08-aa6a-789d08515cbd" : "MjkyNTJhMjUtMjU3Yy00ZDBjLTllODQtNzU2NDE2YzFiZmM3";// production
const merchantUserId = "8989165353";
const saltKey = clientSecret; // In testing, clientSecret = saltKey
const saltIndex = 1;

const BASE_URL = isProduction 
    ? "https://api.phonepe.com/apis/identity-manager/v1/oauth/token"
    : "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token"; 

export const getPhonePeAuth = async () => {
    const result = await Setting.findOne({ type: "gateway", paymentGateway: "PHONEPE",status:"active" });
    return result;
}

export const initiateTransaction = async (transactionId: string, amountInPaise: number, redirectUrl: string) => {
    const payload = {
        merchantId: clientId,
        merchantTransactionId: transactionId,
        merchantUserId: merchantUserId,
        amount: amountInPaise,
        redirectUrl,
        redirectMode: "POST",
        paymentInstrument: {
            type: "PAY_PAGE"
        }
    };
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64");
    const stringToHash = payloadBase64 + "/pg/v1/pay" + saltKey;
    const xVerify = crypto.createHash("sha256").update(stringToHash).digest("hex") + "###" + saltIndex;

    const headers = {
        "Content-Type": "application/json",
        "X-VERIFY": xVerify
    };

    try {
        const res = await axios.post(`${BASE_URL}/pg/v1/pay`, { request: payloadBase64 }, { headers });
        return res.data;
    } catch (error: any) {
        console.error("PhonePe Error:", error.response?.data || error.message);
        throw error;
    }
};


export const verifyTransaction = async (transactionId: string) => {
    const url = `/pg/v1/status/${clientId}/${transactionId}`;
    const stringToHash = url + saltKey;
    const xVerify = crypto.createHash("sha256").update(stringToHash).digest("hex") + "###" + saltIndex;

    try {
        const res = await axios.get(`${BASE_URL}${url}`, {
            headers: { "X-VERIFY": xVerify }
        });
        return res.data;
    } catch (err: any) {
        console.error("Verification failed", err.response?.data || err.message);
        throw err;
    }
};



export const getPhonePeAccessToken = async () => {
    try {

        const phonePeAuth = await getPhonePeAuth();
        if (!phonePeAuth) return "Not active any payment gateway";
        const splitUrl = phonePeAuth?.mode == "TEST" ? "/v1/oauth/token" : "/identity-manager/v1/oauth/token";
        const url = `${phonePeAuth?.base_url}${splitUrl}`;  
        //  const url = BASE_URL;
        const params = new URLSearchParams({
            client_id: phonePeAuth?.client_id,
            client_version: "1",
            client_secret: phonePeAuth?.client_secret,
            grant_type: "client_credentials"
        }); 

       
        const response = await axios.post(url, params.toString(), {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        });
        return response.data;
    } catch (error: any) {
        console.error("Error fetching token:", error.response?.data || error.message);
    }
}


export const generatePhonePePaymentLink = async (
    AccessToken: string,
    merchantOrderId: string,
    amount: number
) => {
    try {
        /*
        const url = isProduction
            ? "https://api.phonepe.com/apis/pg/checkout/v2/pay"
            : "https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/pay"; */

        const phonePeAuth = await getPhonePeAuth();
        if (!phonePeAuth) return "Not active any payment gateway";
        const splitUrl = phonePeAuth?.mode == "TEST" ? "/checkout/v2/pay" : "/pg/checkout/v2/pay";
        const url = `${phonePeAuth?.base_url}${splitUrl}`;


        amount = amount * 100;
        const payload = {
            merchantOrderId: merchantOrderId,
            amount: amount.toString(), // Convert to string as expected
            expireAfter: "1200",
            metaInfo: {
                udf1: "additional-information-1",
                udf2: "additional-information-2",
                udf3: "additional-information-3",
                udf4: "additional-information-4",
                udf5: "additional-information-5"
            },
            paymentFlow: {
                type: "PG_CHECKOUT",
                message: "Payment message used for collect requests",
                merchantUrls: {
                    redirectUrl: "https://bharatworker.com/payment-status", // frontend success/failure UI
                    callbackUrl: "https://bharatworker.com/phonepe-callback"   // your backend webhook handler
                }
            }
        };

        const response = await axios.post(url, payload, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `O-Bearer ${AccessToken}`
            }
        });


        return response.data.redirectUrl;

    } catch (error: any) {

        return error?.response?.data || error.message;
    }
};



export const generateWebPhonePePaymentLink = async (
    AccessToken: string,
    merchantOrderId: string,
    amount: number
) => {
    try {

        const url = isProduction
            ? "https://api.phonepe.com/apis/identity-manager/checkout/v2/pay"
            : "https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/pay";

        amount = amount * 100;
        const payload = {
            merchantOrderId: merchantOrderId,
            amount: amount.toString(), // Convert to string as expected
            expireAfter: "1200",
            metaInfo: {
                udf1: "additional-information-1",
                udf2: "additional-information-2",
                udf3: "additional-information-3",
                udf4: "additional-information-4",
                udf5: "additional-information-5"
            },
            paymentFlow: {
                type: "PG_CHECKOUT",
                message: "Payment message used for collect requests",
                merchantUrls: {
                    redirectUrl: `https://bharatworker.com/payment-status?merchantOrderId=${merchantOrderId}`, // frontend success/failure UI
                    callbackUrl: `https://bharatworker.com/phonepe-callback?merchantOrderId=${merchantOrderId}`   // your backend webhook handler
                }
            }
        };

        const response = await axios.post(url, payload, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `O-Bearer ${AccessToken}`
            }
        });

       
        return response.data.redirectUrl;

    } catch (error: any) {
        console.error("PhonePe Error:", error?.response?.data || error.message);
        return error?.response?.data || error.message;
    }
};


export const fetchPaymentStatus = async (AccessToken: string,
    merchantOrderId: string) => {
    /*
    const url = isProduction ?
        `https://api.phonepe.com/apis/pg/checkout/v2/order/${merchantOrderId}/status`
        : `https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/order/${merchantOrderId}/status`; // production
    */

      const phonePeAuth = await getPhonePeAuth();
    if (!phonePeAuth) return "Not active any payment gateway";
    const splitUrl = phonePeAuth?.mode == "TEST" ? `/checkout/v2/order/${merchantOrderId}/status` : `/pg/checkout/v2/order/${merchantOrderId}/status`;
    const url = `${phonePeAuth?.base_url}${splitUrl}`;
      
    try {
        const response = await axios.get(url, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `O-Bearer ${AccessToken}`
            }
        });
       
        return response.data;
    } catch (error: any) {
        // console.error("Error fetching order status:", error.response?.data || error.message);
        return error.response?.data || error.message;
    }
}


