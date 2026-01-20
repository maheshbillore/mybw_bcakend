import { Request, Response } from "express";
import { PartnerService } from "../services/partner.service.js";
import { Types } from "mongoose";

export class PartnerController {
    static async getPartners(req: Request, res: Response) {
        const { currentPage = 1, pageSize = 10 } = req.query;
        const result = await PartnerService.getAllPartners(
            Number(currentPage),
            Number(pageSize)
        );
        res.status(result.success ? 200 : 404).json(result);
    }

    static async uploadDocs(req: Request, res: Response): Promise<void> {
        try {
            const files = req.files as {
                [fieldname: string]: Express.Multer.File[];
            };
            const partnerId = req.user?._id;
            if (!partnerId) {
                res.status(404).json({
                    succuss: false,
                    data: null,
                    message: "Partner Id not found in Request object",
                });
                return;
            }

            const result = await PartnerService.uploadDocs(
                partnerId.toString(),
                files,
                req
            );
            res.status(200).json(result);
        } catch (error) {
            console.error("Error uploading documents:", error);
            res.status(500).json({
                success: false,
                message:
                    error instanceof Error
                        ? error.message
                        : "Error uploading documents",
            });
        }
    }

    // static async addSkills(req: Request, res: Response) {
    //     const partnerId: string = req.user?._id as string;

    //     if (!partnerId) {
    //         res.status(404).json({
    //             success: false,
    //             data: null,
    //             message: "Partner Id not found in Request object",
    //         });
    //         return;
    //     }

    //     const result = await PartnerService.addSkills(partnerId, req.body);
    //     res.status(result.success ? 200 : 400).json(result);
    // }

    static async updatePartnersSkill(req: Request, res: Response) {
        const partnerId = req.params.partnerId as string;
        const skillId = req.params.skillId as string;

        if (!partnerId) {
            return {
                success: false,
                data: null,
                message: "Partner Id not found",
            };
        }


        if (!skillId) {
            return {
                success: false,
                data: null,
                message: "skill Id not found",
            };
        }



        const result = await PartnerService.updateSkills(
            partnerId,
            skillId,
            req.body
        );

        res.status(result.success ? 200 : 404).json(result);
    }

    static async getPartner(req: Request, res: Response) {
        const id = req.params.id as string;
        const result = await PartnerService.getPartnerById(id);
        res.status(result.success ? 200 : 404).json(result);
    }

    static async signUpByNumber(req: Request, res: Response) {
        const { phone } = req.body;
        const result = await PartnerService.signUpByNumber(phone);
        res.status(result.success ? 200 : 404).json(result);
    }

    static async otpVerification(req: Request, res: Response) {
        const { otp, phone } = req.body;
        const result = await PartnerService.otpVerification(phone, otp);
        res.status(result.success ? 200 : 404).json(result);
    }

    static async profileUpdate(req: Request, res: Response) {
        try {
            if (!req.user?._id) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const partnerId: Types.ObjectId = req.user._id;

            const profile = req.file as Express.Multer.File;
            const files = { profile: [profile] };

            const result = await PartnerService.profileUpdate(
                files,
                partnerId.toString(),
                req
            );

            res.status(200).json(result);
        } catch (error) {
            console.error("Error uploading documents:", error);
            res.status(500).json({
                success: false,
                message:
                    error instanceof Error
                        ? error.message
                        : "Error uploading documents",
            });
        }
    }

    static async workLocationUpdate(req: Request, res: Response) {
        const partnerId = req.user?._id;
        if (!partnerId) {
            res.status(404).json({
                success: false,
                data: null,
                message: "Partner Id not found in Request object",
            });
            return;
        }
        const result = await PartnerService.workLocationUpdate(
            partnerId.toString(),
            req.body
        );
        res.status(result.success ? 200 : 404).json(result);
    }

    static async updateOnlineStatus(req: Request, res: Response) {
        if (!req.user?._id) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const partnerId: Types.ObjectId = req.user._id;
        if (!partnerId) {
            res.status(404).json({
                success: false,
                data: null,
                message: "Partner Id not found in Request object",
            });
        }
        const result = await PartnerService.updateOnlineStatus(
            partnerId.toString(),
            req.body
        );
        res.status(result.success ? 200 : 404).json(result);
    }
    static async updateLiveLocation(req: Request, res: Response) {
        if (!req.user?._id) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const partnerId: Types.ObjectId = req.user._id;
        if (!partnerId) {
            res.status(404).json({
                success: false,
                data: null,
                message: "Partner Id not found in Request object",
            });
        }
        const result = await PartnerService.updateLiveLocation(
            partnerId.toString(),
            req.body
        );
        res.status(result.success ? 200 : 404).json(result);
    }

    static async partnerSkills(req: Request, res: Response) {
        if (!req.user?._id) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const partnerId: Types.ObjectId = req.user._id;

        if (!partnerId) {
            res.status(404).json({
                success: false,
                data: null,
                message: "Partner Id not found in Request object",
            });
        }
        const files = req.files as {
            [fieldname: string]: Express.Multer.File[];
        };
        const result = await PartnerService.partnerSkills(
            partnerId.toString(),
            files,
            req.body
        );
        res.status(result.success ? 200 : 404).json(result);
    }

    static async getPartnerSkills(req: Request, res: Response) {
        if (!req.user?._id) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const partnerId: Types.ObjectId = req.user._id;

        if (!partnerId) {
            res.status(404).json({
                success: false,
                data: null,
                message: "Partner Id not found in Request object",
            });
        }
        const result = await PartnerService.getPartnerSkills(
            partnerId.toString()
        );
        res.status(result.success ? 200 : 404).json(result);
    }

    static async matchingJobs(req: Request, res: Response) {
        if (!req.user?._id) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const partnerId: Types.ObjectId = req.user._id;

        if (!partnerId) {
            res.status(404).json({
                success: false,
                data: null,
                message: "Partner Id not found in Request object",
            });
        }
        const result = await PartnerService.matchingJobs(partnerId.toString());
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async getServices(req: Request, res: Response) {
        const result = await PartnerService.getServices();
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async getServicesByCategory(req: Request, res: Response) {
        const categoryIds = req.body.categoryIds as any;
        const result = await PartnerService.getServicesByCategory(categoryIds);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async uploadPartnerDocuments(req: Request, res: Response) {
        if (!req.user?._id) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const partnerId: Types.ObjectId = req.user._id;
        if (!partnerId) {
            res.status(404).json({
                success: false,
                data: null,
                message: "Partner Id not found in Request object",
            });
        }

        const files = req.files as {
            [fieldname: string]: Express.Multer.File[];
        };

        const result = await PartnerService.uploadPartnerDocuments(partnerId.toString(), files, req);
        res.status(result?.success ? 200 : 404).json(result);

    }

    static async verifyUser(req: Request, res: Response) {
        const idToken = req.body.token;
        const result = await PartnerService.verifyUser(idToken);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async login(req: Request, res: Response) {
        const idToken = req.body.token;
        const result = await PartnerService.login(idToken);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async partnerSignup(req: Request, res: Response) {
        const token = req.body.token;
        const fcm_token = req.body.fcm_token;
        const languageCode = req.body.languageCode;
        const latitude = req.body.latitude;
        const longitude = req.body.longitude;
        const result = await PartnerService.partnerSignup(token, languageCode, fcm_token, latitude, longitude);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async getSubscriptionPlans(req: Request, res: Response) {
        if (!req.user?._id) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const partnerId: Types.ObjectId = req.user._id;
        if (!partnerId) {
            res.status(404).json({
                success: false,
                data: null,
                message: "Partner Id not found",
            });
        }
        const result = await PartnerService.getSubscriptionPlans();
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async getYearsExperience(req: Request, res: Response) {
        const result = await PartnerService.getYearsExperience();
        res.status(result?.success ? 200 : 404).json(result);
    }
    static async getPendingPartners(req: Request, res: Response) {
        const { currentPage = 1, pageSize = 10 } = req.query;
        const result = await PartnerService.getPendingPartners(
            Number(currentPage),
            Number(pageSize)
        );
        res.status(result.success ? 200 : 404).json(result);
    }
    static async partnerKycStatus(req: Request, res: Response) {
        const result = await PartnerService.partnerKycStatus(req.body);
        res.status(result?.success ? 200 : 404).json(result);
    }
    static async googleVerification(req: Request, res: Response) {
        const result = await PartnerService.googleVerification(req.body);
        res.status(result?.success ? 200 : 404).json(result);
    }
    static async getKycFaildPartner(req: Request, res: Response) {
        const { currentPage = 1, pageSize = 10 } = req.query;
        const result = await PartnerService.getKycFaildPartner(Number(currentPage),
            Number(pageSize));
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async getProfile(req: Request, res: Response) {
        if (!req.user?._id) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const partnerId: Types.ObjectId = req.user._id;
        const result = await PartnerService.getProfile(partnerId.toString());
        res.status(result?.success ? 200 : 404).json(result);
    }
    static async waitingForApproval(req: Request, res: Response) {
        if (!req.user?._id) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const partnerId: Types.ObjectId = req.user._id;
        const result = await PartnerService.waitingForApproval(partnerId.toString());
        res.status(result?.success ? 200 : 400).json(result);
    }
    static async incomingRequests(req: Request, res: Response) {
        const { currentPage = 1, pageSize = 10 } = req.query;
        const result = await PartnerService.incomingRequests(Number(currentPage), Number(pageSize));
        res.status(result.success ? 200 : 404).json(result);
    }

    static async addSubscriptionPlans(req: Request, res: Response) {
        if (!req.user?._id) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const partnerId: Types.ObjectId = req.user._id;
        const result = await PartnerService.addSubscriptionPlans(req.body, partnerId.toString());
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async bookedCustomers(req: Request, res: Response) {
        if (!req.user?._id) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const partnerId: Types.ObjectId = req.user._id;
        const result = await PartnerService.bookedCustomers(partnerId);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async subscriptionWithoutCode(req: Request, res: Response) {
        if (!req.user?._id) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const partnerId: Types.ObjectId = req.user._id;
        const result = await PartnerService.subscriptionWithoutCode(req.body, partnerId);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async fetchSubscriptionPaymentstatus(req: Request, res: Response) {
        if (!req.user?._id) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const partnerId: Types.ObjectId = req.user._id;
        const result = await PartnerService.fetchSubscriptionPaymentstatus(req.body, partnerId);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async transactionHistory(req: Request, res: Response) {
        if (!req.user?._id) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const partnerId: Types.ObjectId = req.user._id;
        const result = await PartnerService.transactionHistory(partnerId);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async getReferralHistory(req: Request, res: Response) {
        if (!req.user?._id) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const partnerId: Types.ObjectId = req.user._id;
        const result = await PartnerService.getReferralHistory(partnerId);
        res.status(result?.success ? 200 : 404).json(result);
    }
    static async getSubscriptionPlanStatus(req: Request, res: Response) {
        if (!req.user?._id) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const partnerId: Types.ObjectId = req.user._id;
        const result = await PartnerService.getSubscriptionPlanStatus(partnerId);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async refreshSubscriptionPaymentStatus(req: Request, res: Response) {
        if (!req.user?._id) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const partnerId: Types.ObjectId = req.user._id;
        const merchantOrderId = req.params.merchantOrderId;
        const result = await PartnerService.refreshSubscriptionPaymentStatus(partnerId, merchantOrderId);
        res.status(result?.success ? 200 : 404).json(result);
    }


    static async updateCategorySubcategoryAndService(req: Request, res: Response) {
        if (!req.user?._id) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const partnerId: Types.ObjectId = req.user._id;
        const data = req?.body;
        const result = await PartnerService.updateCategorySubcategoryAndService(data, partnerId);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async activeJobs(req: Request, res: Response) {
        if (!req.user?._id) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const partnerId: Types.ObjectId = req.user._id;
        const lastId = req?.query?.lastId || null;
        const limit = await (req?.query?.limit || 10) as string;
        const searchText = req?.query?.searchText as string;
        const result = await PartnerService.activeJobs(partnerId, lastId, limit, searchText);
        res.status(result?.success ? 200 : 404).json(result);
    }


    static async addJobBid(req: Request, res: Response) {
        const partnerId = req?.user?._id;
        const data = req?.body;
        const result = await PartnerService.addJobBid(data, partnerId);
        res.status(result?.status).json(result);
    }

    static async getJobDetails(req: Request, res: Response) {
        const partnerId = req?.user?._id;
        const jobId = req?.params?.jobId;
        const result = await PartnerService.getJobDetails(jobId, partnerId);
        if (result?.success == true) {
            if (result?.data?.job?.serviceId?.image) {
                result.data.job.serviceId.image = `${process.env.BASE_URL}/uploads/servicesImage/${result?.data?.job?.serviceId?.image}`;
            } else {
                result.data.job.serviceId.image = null;
            }
        }
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async bidCancel(req: Request, res: Response) {
        const partnerId = req?.user?._id;
        const data = req?.body;
        const result = await PartnerService.bidCancel(data, partnerId);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async getJobStartVerificationPhone(req: Request, res: Response) {
        const jobId = req?.params?.jobId;
        const result = await PartnerService.getJobStartVerificationPhone(jobId);
        res.status(result?.status).json(result);
    }

    static async updateJobStartVerificationStatus(req: Request, res: Response) {
        const data = req?.body;
        const result = await PartnerService.updateJobStartVerificationStatus(data);
        res.status(result?.status).json(result);
    }

    static async addExtraWork(req: Request, res: Response) {
        const data = req?.body;
        const result = await PartnerService.addExtraWork(data);
        res.status(result?.status).json(result);
    }

    static async ongoingJobs(req: Request, res: Response) {
        const partnerId = req?.user?._id;
        const lastId = req?.query?.lastId || null;
        const limit = await (req?.query?.limit || 10) as string;
        const searchText = req?.query?.searchText as string;
        const result = await PartnerService.ongoingJobs(partnerId, lastId, limit, searchText);
        res.status(result?.success ? 200 : 500).json(result);
    }

    static async previousJobs(req: Request, res: Response) {
        const partnerId = req?.user?._id;
        const lastId = req?.query?.lastId || null;
        const limit = await (req?.query?.limit || 10) as string;
        const searchText = req?.query?.searchText as string;
        const result = await PartnerService.previousJobs(partnerId, lastId, limit, searchText);
        res.status(result?.success ? 200 : 500).json(result);
    }

    static async bidingJobs(req: Request, res: Response) {
        const partnerId = req?.user?._id;
        const lastId = req?.query?.lastId || null;
        const limit = await (req?.query?.limit || 10) as string;
        const searchText = req?.query?.searchText as string;
        const result = await PartnerService.bidingJobs(partnerId, lastId, limit, searchText);
        res.status(result?.success ? 200 : 500).json(result);
    }

    static async updateIdentityConfiramtionStatus(req: Request, res: Response) {
        const partnerId = req?.user?._id;
        const update_identity = req?.query?.update_identity as string;
        const result = await PartnerService.updateIdentityConfirmationStatus(partnerId, update_identity);
        res.status(result?.status).json(result);
    }

    static async cancelExtraWork(req: Request, res: Response) {
        const workId = req?.params?.workId;
        const partnerId = req?.user?._id;
        const result = await PartnerService.cancelExtraWork(workId, partnerId);
        res.status(result?.status).json(result);
    }

    static async verifyExtraWorkPayment(req: Request, res: Response) {
        const bookingId = req?.params?.bookingId;
        const result = await PartnerService.verifyExtraWorkPayment(bookingId);
        res.status(result?.status).json(result);
    }

    static async getMatchingJobs(req: Request, res: Response) {
        const partnerId = req?.user?._id;
        const lastId = req?.query?.lastId || null;
        const limit = await (req?.query?.limit || 10) as string;
        const searchText = req?.query?.searchText as string;
        const result = await PartnerService.getMatchingJobs(partnerId, lastId, limit, searchText);
        res.status(result?.status).json(result);
    }


    static async getLanguages(req: Request, res: Response) {
        const languageType = req?.params?.languageType as string;
        const result = await PartnerService.getLanguages(languageType);
        res.status(result?.status).json(result);
    }
    static async getLanguageList(req: Request, res: Response) {
        const result = await PartnerService.getLanguageList();
        res.status(result?.status).json(result);
    }

    static async updateLanguageCode(req: Request, res: Response) {
        const partnerId = await req?.user?._id;
        const languageCode = req?.body?.languageCode;
        const result = await PartnerService.updateLanguageCode(partnerId, languageCode);
        res.status(result?.status).json(result);
    }

    static async updateBookingStatus(req: Request, res: Response) {
        const partnerId = req?.user?._id;
        const data = req?.body;
        const paymentImage = req.file as Express.Multer.File;
        const files = { paymentImage: [paymentImage] };
        const result = await PartnerService.updateBookingStatus(partnerId, data, files);
        res.status(result?.status).json(result);
    }

    static async jobBookmark(req: Request, res: Response) {
        const partnerId = req?.user?._id;
        const data = req?.body;
        const result = await PartnerService.jobBookmark(partnerId, data);
        res.status(result?.status).json(result);
    }

    static async getBookmarklist(req: Request, res: Response) {
        const partnerId = req?.user?._id;
        const lastId = req?.query?.lastId || null;
        const limit = await (req?.query?.limit || 10) as string;
        const searchText = req?.query?.searchText as string;
        const result = await PartnerService.getBookmarklist(partnerId, lastId, limit, searchText);
        res.status(result?.status).json(result);
    }

    static async getAllJobs(req: Request, res: Response) {
        const partnerId = req?.user?._id;
        const data = req?.query;
        const result = await PartnerService.getAllJobs(partnerId, data);
        res.status(result?.status).json(result);
    }
    static async getFilters(req: Request, res: Response) {
        const partnerId = req?.user?._id;
        const result = await PartnerService.getFilters(partnerId);
        res.status(result?.status).json(result);
    }
    static async getWalletAmount(req: Request, res: Response) {
        const partnerId = req?.user?._id;
        const result = await PartnerService.getWalletAmount(partnerId);
        res.status(result?.status).json(result);
    }

    static async walletTransactionHistory(req: Request, res: Response) {
        const partnerId = req?.user?._id;
        const result = await PartnerService.walletTransactionHistory(partnerId);
        res.status(result?.status).json(result);
    }
    static async addWithdrawRequest(req: Request, res: Response) {
        const partnerId = req?.user?._id;
        const payload = req?.body;
        const result = await PartnerService.addWithdrawRequest(partnerId, payload);
        res.status(result?.status).json(result);
    }
    static async todaySummary(req: Request, res: Response) {
        const partnerId = req?.user?._id;
        const result = await PartnerService.todaySummary(partnerId);
        res.status(result?.status).json(result);
    }
    static async getNotifications(req: Request, res: Response) {
        const partnerId = req?.user?._id;
        const result = await PartnerService.getNotifications(partnerId);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async readNotifications(req: Request, res: Response) {
        const id = req?.params?.id;
        const result = await PartnerService.readNotifications(id);
        res.status(result?.status).json(result);
    }

    static async getNotificationDetails(req: Request, res: Response) {
        const id = req?.params?.id;
        const result = await PartnerService.getNotificationDetails(id);
        res.status(result?.status).json(result)
    }

    static async addWalletAmount(req: Request, res: Response) {
        const data = req?.body;
        const partnerId = req?.user?._id;
        const result = await PartnerService.addWalletAmount(data, partnerId);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async addWalletConfirm(req: Request, res: Response) {
        const data = req?.body;
        const partnerId = req?.user?._id;
        const result = await PartnerService.addWalletConfirm(data, partnerId);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async walletAmountStatus(req: Request, res: Response) {
        const data = req?.body;
        const partnerId = req?.user?._id;
        const result = await PartnerService.walletAmountStatus(data, partnerId);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async transactionsByTab(req: Request, res: Response) {
        const payload = req?.query;
        const partnerId = req?.user?._id;
        const result = await PartnerService.transactionsByTab(partnerId, payload);
        res.status(result?.status).json(result);
    }

    static async getBanners(req: Request, res: Response) {
        const result = await PartnerService.getBanners();
        res.status(result?.status).json(result);
    }

    static async notificationSetting(req: Request, res: Response) {
        const partnerId = req?.user?._id;
        const payload = req?.body;
        const result = await PartnerService.notificationSetting(partnerId, payload);
        res.status(result?.status).json(result);
    }

    static async getNotificationSetting(req: Request, res: Response) {
        const partnerId = req?.user?._id;
        const result = await PartnerService.getNotificationSetting(partnerId);
        res.status(result?.status).json(result);
    }

    static async shareLink(req: Request, res: Response) {
        const partnerId = req?.user?._id;
        const result = await PartnerService.shareLink(partnerId);
        res.status(result?.status).json(result);
    }

    static async getNotificationsCount(req: Request, res: Response) {
        const partnerId = req?.user?._id;
        const result = await PartnerService.getNotificationsCount(partnerId);
        res.status(result?.status).json(result);
    }

    static async transactionDetails(req: Request, res: Response) {
        const partnerId = req?.user?._id;
        const transactionId = req?.params?.id;
        const result = await PartnerService.transactionDetails(transactionId, partnerId);
        res.status(result?.status).json(result);
    }

    static async appReviewList(req: Request, res: Response) {
        const partnerId = req?.user?._id;
        const payload = req?.query;
        const result = await PartnerService.appReviewList(payload, partnerId);
        res.status(result?.status).json(result);
    }

    static async appReview(req: Request, res: Response) {
        const partnerId = req?.user?._id;
        const payload = req?.body;
        const result = await PartnerService.appReview(payload, partnerId);
        res.status(result?.status).json(result);
    }

    static async getTotalPartnerAndCustomer(req: Request, res: Response) {
        const result = await PartnerService.getTotalPartnerAndCustomer();
        res.status(result?.status).json(result);
    }

    static async addPaymentmethod(req: Request, res: Response) {
        const partnerId = req?.user?._id;
        const payload = await req?.body;
        const result = await PartnerService.addPaymentmethod(payload, partnerId);
        res.status(result?.status).json(result);
    }

    static async getPaymentMethod(req: Request, res: Response) {
        const partnerId = req?.user?._id;
        const result = await PartnerService.getPaymentMethod(partnerId);
        res.status(result?.status).json(result);
    }

    static async setPrimaryPaymentMethod(req: Request, res: Response) {
        const partnerId = req?.user?._id;
        const methodId = req?.params?.methodId;
        const result = await PartnerService.setPrimaryPaymentMethod(partnerId, methodId);
        res.status(result?.status).json(result);
    }

    static async addWalletAmountRazorpayVerify(req: Request, res: Response) {
        const payload = req?.body;
        const partnerId = req?.user?._id;
        const result = await PartnerService.addWalletAmountRazorpayVerify(payload, partnerId);
        res.status(result?.status).json(result);
    }

    static async getRazorpayWalletPaymentStatus(req: Request, res: Response) {
        const { paymentId } = req?.params;
        const partnerId = req?.user?._id;
        const result = await PartnerService.getRazorpayWalletPaymentStatus(paymentId, partnerId);
        res.status(result?.status).json(result);
    }

    static async verifyRazorpaySubscriptionPayment(req: Request, res: Response) {
        const payload = req.body;
        const partnerId = req?.user?._id;
        const result = await PartnerService.verifyRazorpaySubscriptionPayment(payload, partnerId);
        res.status(result?.status).json(result);
    }

    static async getRazorpaySubscriptionPaymentStatus(req: Request, res: Response) {
        const paymentId = req?.params?.paymentId;
        const partnerId = req?.user?._id;
        const result = await PartnerService.getRazorpaySubscriptionPaymentStatus(paymentId, partnerId);
        res.status(result?.status).json(result);
    }

    static async walletRazorpayPaymentByOrderId(req: Request, res: Response) {
        const orderId = req?.params?.orderId;
        const result = await PartnerService.walletRazorpayPaymentByOrderId(orderId);
        res.status(result?.status).json(result);
    }

    static async subscriptionRazorpayPaymentByOrderId(req: Request, res: Response) {
        const orderId = req?.params?.orderId;
        const result = await PartnerService.subscriptionRazorpayPaymentByOrderId(orderId);
        res.status(result?.status).json(result);
    }

    static async checkEmail(req:Request,res:Response){
        const result = await PartnerService.checkEmail();
        res.status(result?.status).json(result);
    }

    static async getReferralPointsDetails(req:Request,res:Response){
        const partnerId = req?.user?._id;
        const result = await PartnerService.getReferralPointsDetails(partnerId);
        res.status(result?.status).json(result);
    }

    static async redeemPoints(req:Request,res:Response){
        const userId = req?.user?._id;
        const payload = req?.body;
        const result = await PartnerService.redeemPoints(payload,userId);
        res.status(result?.status).json(result);
    }

}  
