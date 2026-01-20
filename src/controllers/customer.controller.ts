import { Request, Response } from "express";
import { CustomerService } from "../services/customer.service.js";
import { createResponseStatus } from "../utils/helper.js";
import { Types } from "mongoose";

export class CustomerController {
    static async getAllCustomers(req: Request, res: Response) {
        const { currentPage = 1, pageSize = 10 } = req.query;

        const result = await CustomerService.getAllCustomers(
            Number(currentPage),
            Number(pageSize)
        );
        res.status(result.success ? 200 : 404).json(result);
    }

    static async getCustomerInfo(req: Request, res: Response) {
        const id = req.params.id as string;
        const result = await CustomerService.getACustomer(id);
        res.status(result.success ? 200 : 404).json(result);
    }

    static async signUp(req: Request, res: Response) {
        const result = await CustomerService.signUp(req.body);
        res.status(result.success ? 200 : 404).json(result);
    }

    static async login(req: Request, res: Response) {
        const result = await CustomerService.login(req.body);
        res.status(result.success ? 200 : 404).json(result);
    }

    static async profileUpdate(req: Request, res: Response) {
        const file = req.file;
        const customerId = req?.user?._id;
        if (!customerId) {
            return {
                success: false,
                data: null,
                message: "User not found"
            }
        }
        const result = await CustomerService.profileUpdate(req.body, file, customerId);
        res.status(result.success ? 200 : 404).json(result);
    }

    static async addressUpdate(req: Request, res: Response) {
        const customerId = req?.user?._id;
        if (!customerId) {
            return {
                success: false,
                data: null,
                message: "User not found"
            }
        }
        const file = req.file;
        const result = await CustomerService.addressUpdate(req.body, file, customerId);
        res.status(result.success ? 200 : 404).json(result);
    }

    static async bookedPartners(req: Request, res: Response) {
        const customerId = req?.user?._id;
        const result = await CustomerService.bookedPartners(customerId);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async getCategorys(req: Request, res: Response) {
        const customerId = req?.user?._id;
        const result = await CustomerService.getCategorys(customerId);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async categoryServices(req: Request, res: Response) {
        const customerId = req?.user?._id;
        const categoryId = req?.params?.categoryId;
        const result = await CustomerService.categoryServices(customerId, categoryId);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async getSubCategory(req: Request, res: Response) {
        const categoryId = req?.params?.categoryId;
        const result = await CustomerService.getSubCategory(categoryId);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async getServices(req: Request, res: Response) {
        const subcategoryId = req?.params?.subcategoryId;
        const customerId = req?.user?._id;
        const result = await CustomerService.getServices(subcategoryId, customerId);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async getSericeDetail(req: Request, res: Response) {
        const serviceId = req?.params?.serviceId;
        const customerId = req?.user?._id;
        const result = await CustomerService.getServiceDetail(serviceId, customerId);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async addJobBasicDetail(req: Request, res: Response) {
        const customerId = req?.user?._id;
        const data = req?.body;
        const files = req.files as {
            [fieldname: string]: Express.Multer.File[];
        };
        const result = await CustomerService.addJobBasicDetails(data, customerId, files);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async jobContactDetail(req: Request, res: Response) {
        const data = req?.body;
        const customerId = req?.user?._id;
        const result = await CustomerService.jobContactDetail(data, customerId);
        if (result?.success == true) {
            if (result?.data?.job?.serviceId?.image) {
                result.data.job.serviceId.image = `${process.env.BASE_URL}/uploads/servicesImage/${result?.data?.job?.serviceId?.image}`;
            } else {
                result.data.job.serviceId.image = null;
            }
        }
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async jobConfirmation(req: Request, res: Response) {
        const data = req?.body;
        const customerId = req?.user?._id;
        const result = await CustomerService.jobConfirmation(data, customerId);
        if (result?.success == true) {
            if (result?.data?.job?.serviceId?.image) {
                result.data.job.serviceId.image = `${process.env.BASE_URL}/uploads/servicesImage/${result?.data?.job?.serviceId?.image}`;
            } else {
                result.data.job.serviceId.image = null;
            }
        }
        res.status(result?.success ? 200 : 404).json(result);
    }


    static async addWalletAmount(req: Request, res: Response) {
        const data = req?.body;
        const customerId = req?.user?._id;
        const result = await CustomerService.addWalletAmount(data, customerId);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async addWalletConfirm(req: Request, res: Response) {
        const data = req?.body;
        const customerId = req?.user?._id;
        const result = await CustomerService.addWalletConfirm(data, customerId);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async walletAmountStatus(req: Request, res: Response) {
        const data = req?.body;
        const customerId = req?.user?._id;
        const result = await CustomerService.walletAmountStatus(data, customerId);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async getProfile(req: Request, res: Response) {
        const customerId = req?.user?._id;
        const result = await CustomerService.getProfile(customerId);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async upcommingJobs(req: Request, res: Response) {
        const customerId = req?.user?._id;

        const lastId = req?.query?.lastId || null;
        const limit = await (req?.query?.limit || 10) as string;
        const searchtext = req?.query?.searchtext as string;
        const result = await CustomerService.upcommingJobs(customerId, lastId, limit, searchtext);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async getJobAndBidDetails(req: Request, res: Response) {
        const customerId = req?.user?._id;
        const jobId = req?.params?.jobId;
        const result = await CustomerService.getJobAndBidDetails(customerId, jobId);

        if (result?.success == true) {
            if (result?.data?.jobDetails?.serviceId?.image) {
                result.data.jobDetails.serviceId.image = `${process.env.BASE_URL}/uploads/servicesImage/${result?.data?.jobDetails?.serviceId?.image}`;
            } else {
                result.data.jobDetails.serviceId.image = null;
            }
        }

        res.status(result?.success ? 200 : 404).json(result);
    }
    static async getJobBidPartnerDetails(req: Request, res: Response) {
        const jobId = req?.params?.jobId;
        const partnerId = req?.params?.partnerId;
        const result = await CustomerService.getJobBidPartnerDetails(jobId, partnerId);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async jobBindPartner(req: Request, res: Response) {
        const jobId = req?.params?.jobId;
        const partnerId = req?.params?.partnerId;
        const result = await CustomerService.jobBindPartner(jobId, partnerId);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async getPreviewBookingDetails(req: Request, res: Response) {
        const bookingId = req?.params?.bookingId;
        const result = await CustomerService.getPreviewBookingDetails(bookingId);
        res.status(result?.success ? 200 : 404).json(result);
    }
    static async jobBookingConfirme(req: Request, res: Response) {
        const customerId = req?.user?._id;
        const data = req?.body;
        const result = await CustomerService.jobBookingConfirme(customerId, data);
        res.status(result?.success ? 200 : 404).json(result);
    }
    static async bookingPaymentStatus(req: Request, res: Response) {
        const merchantOrderId = req?.params?.merchantOrderId as string;
        const result = await CustomerService.bookingPaymentStatus(merchantOrderId);
        res.status(result?.success ? 200 : 404).json(result);
    }
    static async getBookingPaymentDetails(req: Request, res: Response) {
        const bookingId = req?.params?.bookingId;
        const customerId = req?.user?._id;
        const result = await CustomerService.getBookingPaymentDetails(bookingId, customerId);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async cancelJobBooking(req: Request, res: Response) {
        const jobId = req?.params?.jobId;
        const result = await CustomerService.cancelJobBooking(jobId);
        res.status(result?.status).json(result);
    }

    static async ongoingJobs(req: Request, res: Response) {
        const customerId = req?.user?._id;
        const lastId = req?.query?.lastId || null;
        const limit = await (req?.query?.limit || 10) as string;
        const searchtext = req?.query?.searchtext as string;
        const result = await CustomerService.ongoingJobs(customerId, lastId, limit, searchtext);
        res.status(result?.success ? 200 : 500).json(result);
    }

    static async previousJobs(req: Request, res: Response) {
        const customerId = req?.user?._id;
        const lastId = req?.query?.lastId || null;
        const limit = await (req?.query?.limit || 10) as string;
        const searchtext = req?.query?.searchtext as string;
        const result = await CustomerService.previousJobs(customerId, lastId, limit, searchtext);
        res.status(result?.success ? 200 : 500).json(result);
    }

    static async getLanguages(req: Request, res: Response) {
        const languageType = req?.params?.languageType as string;
        const result = await CustomerService.getLanguages(languageType);
        res.status(result?.status).json(result);
    }
    static async getLanguageList(req: Request, res: Response) {
        const result = await CustomerService.getLanguageList();
        res.status(result?.status).json(result);
    }

    static async updateLanguageCode(req: Request, res: Response) {
        const customerId = await req?.user?._id;
        const languageCode = req?.body?.languageCode;
        const result = await CustomerService.updateLanguageCode(customerId, languageCode);
        res.status(result?.status).json(result);
    }

    static async getNotifications(req: Request, res: Response) {
        const customerId = await req?.user?._id;
        const result = await CustomerService.getNotifications(customerId);
        res.status(result?.status).json(result);
    }

    static async readNotifications(req: Request, res: Response) {
        const id = req?.params?.id;
        const result = await CustomerService.readNotifications(id);
        res.status(result?.status).json(result);
    }

    static async getNotificationDetails(req: Request, res: Response) {
        const id = req?.params?.id;
        const result = await CustomerService.getNotificationDetails(id);
        res.status(result?.status).json(result);
    }

    static async reviewAndRating(req: Request, res: Response) {
        const id = req?.user?.id;
        const data = req?.body;
        const result = await CustomerService.reviewAndRating(data);
        res.status(result?.status).json(result);
    }

    static async nearMeDoneJobs(req: Request, res: Response) {
        const customerId = req?.user?._id;
        const lastId = req?.query?.lastId || null;
        const limit = await (req?.query?.limit || 10) as number;
        const categoryId = req?.query?.categoryId;
        const latitude = req?.query?.latitude;
        const longitude = req?.query?.longitude;
        const data = req?.query;
        const result = await CustomerService.nearMeDoneJobs(customerId, data);
        res.status(result?.status).json(result);
    }

    static async filterServices(req: Request, res: Response) {
        const payload = req?.query;
        const customerId = req?.user?._id;
        const result = await CustomerService.filterServices(payload, customerId);
        res.status(result?.status).json(result);
    }

    static async bookmark(req: Request, res: Response) {
        const payload = req?.query;
        const customerId = req?.user?._id;
        const result = await CustomerService.bookmark(payload, customerId);
        res.status(result?.status).json(result);
    }

    static async getbookmark(req: Request, res: Response) {
        const customerId = req?.user?._id;
        const payload = req?.query;
        const result = await CustomerService.getbookmark(customerId, payload);
        res.status(result?.status).json(result);
    }

    static async getBanners(req: Request, res: Response) {
        const result = await CustomerService.getBanners();
        res.status(result?.status).json(result);
    }

    static async transactionHistory(req: Request, res: Response) {
        const customerId = req?.user?._id;
        const payload = req?.query;
        const result = await CustomerService.transactionHistory(customerId, payload);
        res.status(result?.status).json(result);
    }

    static async getSubscriptionPlans(req: Request, res: Response) {
        const result = await CustomerService.getSubscriptionPlans();
        res.status(result?.success ? 200 : 404).json(result);
    }


    static async subscriptionWithoutCode(req: Request, res: Response) {
        const customerId = req.user?._id.toString();
        const result = await CustomerService.subscriptionWithoutCode(req.body, customerId);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async fetchSubscriptionPaymentstatus(req: Request, res: Response) {
        const customerId = req.user?._id.toString();
        const result = await CustomerService.fetchSubscriptionPaymentstatus(req.body, customerId);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async applyReferralCode(req: Request, res: Response) {
        const referralCode = req?.body?.referralCode;
        const customerId = req?.user?._id;
        const result = await CustomerService.applyReferralCode(referralCode, customerId);
        res.status(result?.status).json(result);
    }

    static async getSubscriptionPlanStatus(req: Request, res: Response) {
        const customerId = req?.user?._id;
        const result = await CustomerService.getSubscriptionPlanStatus(customerId);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async checkJobSurgePricing(req: Request, res: Response) {
        const payload = req?.body;
        const customerId = req?.user?._id;
        const result = await CustomerService.checkJobSurgePricing(payload, customerId);
        res.status(result?.status).json(result);
    }

    static async checkCouponCode(req: Request, res: Response) {
        const payload = req?.body;
        const customerId = req?.user?._id;
        const result = await CustomerService.checkCouponCode(payload, customerId);
        res.status(result?.status).json(result);
    }

    static async getStaticWebUrls(req: Request, res: Response) {
        const result = await CustomerService.getStaticWebUrls();
        res.status(result?.status).json(result);
    }

    static async shareLink(req: Request, res: Response) {
        const customerId = req?.user?._id;
        const result = await CustomerService.shareLink(customerId);
        res.status(result?.status).json(result);
    }

    static async getVoccationalBanners(req: Request, res: Response) {
        const result = await CustomerService.getVoccationalBanners();
        res.status(result?.status).json(result);
    }

    static async currentBooking(req: Request, res: Response) {
        const customerId = req?.user?._id;
        const lastId = req?.query?.lastId || null;
        const limit = await (req?.query?.limit || 10) as string;
        const searchtext = req?.query?.searchtext as string;
        const result = await CustomerService.currentBooking(customerId, lastId, limit, searchtext);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async getTotalPartnerAndCustomer(req: Request, res: Response) {
        const result = await CustomerService.getTotalPartnerAndCustomer();
        res.status(result?.status).json(result);
    }

    static async getNotificationsCount(req: Request, res: Response) {
        const customerId = req?.user?._id;
        const result = await CustomerService.getNotificationsCount(customerId);
        res.status(result?.status).json(result);
    }

    static async addWithdrawRequest(req: Request, res: Response) {
        const customerId = req?.user?._id;
        const payload = req?.body;
        const result = await CustomerService.addWithdrawRequest(customerId, payload);
        res.status(result?.status).json(result);
    }

    static async transactionDetails(req: Request, res: Response) {
        const customerId = req?.user?._id;
        const transactionId = req?.params?.id;
        const result = await CustomerService.transactionDetails(transactionId, customerId);
        res.status(result?.status).json(result);
    }

    static async appReviewList(req: Request, res: Response) {
        const customerId = req?.user?._id;
        const payload = req?.query;
        const result = await CustomerService.appReviewList(payload, customerId);
        res.status(result?.status).json(result);
    }

    static async appReview(req: Request, res: Response) {
        const customerId = req?.user?._id;
        const payload = req?.body;
        const result = await CustomerService.appReview(payload, customerId);
        res.status(result?.status).json(result);
    }

    static async notificationSetting(req: Request, res: Response) {
        const customerId = req?.user?._id;
        const payload = req?.body;
        const result = await CustomerService.notificationSetting(customerId, payload);
        res.status(result?.status).json(result);
    }

    static async getNotificationSetting(req: Request, res: Response) {
        const customerId = req?.user?._id;
        const result = await CustomerService.getNotificationSetting(customerId);
        res.status(result?.status).json(result);
    }

    static async shareServicesLink(req: Request, res: Response) {
        const customerId = req?.user?._id;
        const { serviceId } = req?.params;
        const result = await CustomerService.shareServicesLink(customerId, serviceId);
        res.status(result?.status).json(result);
    }

    static async addPaymentmethod(req: Request, res: Response) {
        const customerId = req?.user?._id;
        const payload = await req?.body;
        const result = await CustomerService.addPaymentmethod(payload, customerId);
        res.status(result?.status).json(result);
    }

    static async getPaymentMethod(req: Request, res: Response) {
        const customerId = req?.user?._id;
        const result = await CustomerService.getPaymentMethod(customerId);
        res.status(result?.status).json(result);
    }

    static async setPrimaryPaymentMethod(req: Request, res: Response) {
        const partnerId = req?.user?._id;
        const methodId = req?.params?.methodId;
        const result = await CustomerService.setPrimaryPaymentMethod(partnerId, methodId);
        res.status(result?.status).json(result);
    }

    static async addWalletAmountRazorpayVerify(req: Request, res: Response) {
        const payload = req?.body;
        const customerId = req?.user?._id;
        const result = await CustomerService.addWalletAmountRazorpayVerify(payload, customerId);
        res.status(result?.status).json(result);
    }

    static async getRazorpayWalletPaymentStatus(req: Request, res: Response) {
        const { paymentId } = req?.params;
        const customerId = req?.user?._id;
        const result = await CustomerService.getRazorpayWalletPaymentStatus(paymentId, customerId);
        res.status(result?.status).json(result);
    }

    static async verifyRazorpaySubscriptionPayment(req: Request, res: Response) {
        const payload = req.body;
        const customerId = req?.user?._id;
        const result = await CustomerService.verifyRazorpaySubscriptionPayment(payload, customerId);
        res.status(result?.status).json(result);
    }

    static async getRazorpaySubscriptionPaymentStatus(req: Request, res: Response) {
        const paymentId = req?.params?.paymentId;
        const customerId = req?.user?._id;
        const result = await CustomerService.getRazorpaySubscriptionPaymentStatus(paymentId, customerId);
        res.status(result?.status).json(result);
    }

    static async walletRazorpayPaymentByOrderId(req: Request, res: Response) {
        const orderId = req?.params?.orderId;
        const result = await CustomerService.walletRazorpayPaymentByOrderId(orderId);
        res.status(result?.status).json(result);
    }

    static async subscriptionRazorpayPaymentByOrderId(req: Request, res: Response) {
        const orderId = req?.params?.orderId;
        const result = await CustomerService.subscriptionRazorpayPaymentByOrderId(orderId);
        res.status(result?.status).json(result);
    }

    static async checkEmail(req: Request, res: Response) {
        const result = await CustomerService.checkEmail();
        res.status(result?.status).json(result);
    }

    static async checkCouponReferral(req: Request, res: Response) {
        const partnerId = req.user?._id.toString();
        const result = await CustomerService.checkCouponReferral(req.body, partnerId);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async addSubscriptionplans(req: Request, res: Response) {
        const customerId = req?.user?._id;
        const payload = req?.body;
        const result = await CustomerService.addSubscriptionPlans(payload, customerId);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async getReferralPointsDetails(req: Request, res: Response) {
        const customerId = req?.user?._id;
        const result = await CustomerService.getReferralPointsDetails(customerId);
        res.status(result?.status).json(result);
    }

    static async redeemPoints(req: Request, res: Response) {
        const userId = req?.user?._id;
        const payload = req?.body;
        const result = await CustomerService.redeemPoints(payload, userId);
        res.status(result?.status).json(result);
    }


    static async getReferralHistory(req: Request, res: Response) {
        if (!req.user?._id) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const partnerId: Types.ObjectId = req.user._id;
        const result = await CustomerService.getReferralHistory(partnerId);
        res.status(result?.success ? 200 : 404).json(result);
    }

}
