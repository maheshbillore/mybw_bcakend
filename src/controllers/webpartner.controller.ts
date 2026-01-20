import { Request, Response } from "express";
import { WebPartnerService } from "../services/webpartner.service.js";
import { Types } from "mongoose";

export class WebPartnerController {
    static async getPartners(req: Request, res: Response) {
        const { currentPage = 1, pageSize = 10 } = req.query;
        const result = await WebPartnerService.getAllPartners(
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

            const result = await WebPartnerService.uploadDocs(
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

    //     const result = await WebPartnerService.addSkills(partnerId, req.body);
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



        const result = await WebPartnerService.updateSkills(
            partnerId,
            skillId,
            req.body
        );

        res.status(result.success ? 200 : 404).json(result);
    }

    static async getPartner(req: Request, res: Response) {
        const id = req.params.id as string;
        const result = await WebPartnerService.getPartnerById(id);
        res.status(result.success ? 200 : 404).json(result);
    }

    static async signUpByNumber(req: Request, res: Response) {
        const { phone } = req.body;
        const result = await WebPartnerService.signUpByNumber(phone);
        res.status(result.success ? 200 : 404).json(result);
    }

    static async otpVerification(req: Request, res: Response) {
        const { otp, phone } = req.body;
        const result = await WebPartnerService.otpVerification(phone, otp);
        res.status(result.success ? 200 : 404).json(result);
    }
    // ============================  web =========================================================

    static async webotpVerification(req: Request, res: Response): Promise<void> {
        const { phone, email } = req.body;

        if (!phone && !email) {
            res.status(400).json({
                success: false,
                data: null,
                message: "Phone or Email is required",
            });
            return;
        }

        const result = await WebPartnerService.webotpVerificationservice(phone, email);

        if (result.success && result.data?.token) {
            res.setHeader("Authorization", `Bearer ${result.data.token}`);
            res.status(200).json(result);
        } else {
            res.status(400).json(result);
        }
    }

    // ================= web contect us from 

    static async submitContactForm(req: Request, res: Response): Promise<void> {
        try {
            const { name, email, phone, service, message } = req.body

            if (!name || !email || !phone || !service || !message) {
                res.status(400).json({ success: false, message: "All fields are required." })
                return
            }

            const result = await WebPartnerService.submitContactForm({
                name,
                email,
                phone,
                service,
                message,
            })

            res.status(200).json(result)
        } catch (error) {
            res.status(500).json({
                success: false,
                message: (error as Error).message || "Server error",
            })
        }
    }
    // ============================ validate Email

    static async validateEmail(req: Request, res: Response): Promise<void> {
        try {
            const { email } = req.body;

            if (!email) {
                res.status(400).json({
                    success: false,
                    data: null,
                    message: "Email is required",
                    emailExists: false,
                });
                return;
            }

            const result = await WebPartnerService.validateEmailForRegistration(email);

            let statusCode = 200;
            if (!result.success) {
                if (result.emailExists) {
                    statusCode = 409;
                } else {
                    statusCode = 400;
                }
            }

            res.status(statusCode).json(result);
        } catch (error) {
            console.error("Error in validateEmail controller:", error);
            res.status(500).json({
                success: false,
                data: null,
                message:
                    error instanceof Error
                        ? error.message
                        : "Internal server error during email validation",
                emailExists: false,
            });
        }
    }


    // ============================== validate Phone

    static async validatePhone(req: Request, res: Response): Promise<void> {
        try {
            const { phone } = req.body;

            // Basic validation
            if (!phone) {
                res.status(400).json({
                    success: false,
                    data: null,
                    message: "Phone number is required",
                    phoneExists: false
                });
                return
            }

            // Call service function
            const result = await WebPartnerService.validatePhoneForRegistration(phone);

            // Determine status code based on result
            let statusCode = 200; // Default success
            if (!result.success) {
                if (result.phoneExists) {
                    statusCode = 409; // Conflict - phone already exists
                } else {
                    statusCode = 400; // Bad request - validation failed
                }
            }

            res.status(statusCode).json(result);

        } catch (error) {
            console.error("Error in validatePhone controller:", error);
            res.status(500).json({
                success: false,
                data: null,
                message: error instanceof Error
                    ? error.message
                    : "Internal server error during phone validation",
                phoneExists: false
            });
        }
    }




    static async profileUpdate(req: Request, res: Response) {
        try {
            if (!req.user?._id) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const partnerId: Types.ObjectId = req.user._id;
            const profile = req.file as Express.Multer.File;
            const files = { profile: [profile] };
            const result = await WebPartnerService.profileUpdate(
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
        const result = await WebPartnerService.workLocationUpdate(
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
        const result = await WebPartnerService.updateOnlineStatus(
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
        const result = await WebPartnerService.updateLiveLocation(
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
        const result = await WebPartnerService.partnerSkills(
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
        const result = await WebPartnerService.getPartnerSkills(
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
        const result = await WebPartnerService.matchingJobs(partnerId.toString());
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async getServices(req: Request, res: Response) {
        const result = await WebPartnerService.getServices();
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async getServicesByCategory(req: Request, res: Response) {
        const categoryIds = req.body.categoryIds as any;
        const result = await WebPartnerService.getServicesByCategory(categoryIds);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async uploadPartnerDocuments(req: Request, res: Response) {
        if (!req.user?._id) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const partnerId: Types.ObjectId = req.user._id;

        const files = req.files as {
            [fieldname: string]: Express.Multer.File[];
        };

        const result = await WebPartnerService.uploadPartnerDocuments(partnerId.toString(), files, req);
        res.status(result?.success ? 200 : 404).json(result);

    }

    static async verifyUser(req: Request, res: Response) {
        const idToken = req.body.token;
        const result = await WebPartnerService.verifyUser(idToken);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async login(req: Request, res: Response) {
        const idToken = req.body.token;
        const result = await WebPartnerService.login(idToken);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async partnerSignup(req: Request, res: Response) {
        const token = req.body.token;
        const result = await WebPartnerService.partnerSignup(token);
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
        const result = await WebPartnerService.getSubscriptionPlans();
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async getYearsExperience(req: Request, res: Response) {
        const result = await WebPartnerService.getYearsExperience();
        res.status(result?.success ? 200 : 404).json(result);
    }
    static async getPendingPartners(req: Request, res: Response) {
        const { currentPage = 1, pageSize = 10 } = req.query;
        const result = await WebPartnerService.getPendingPartners(
            Number(currentPage),
            Number(pageSize)
        );
        res.status(result.success ? 200 : 404).json(result);
    }
    static async partnerKycStatus(req: Request, res: Response) {
        const result = await WebPartnerService.partnerKycStatus(req.body);
        res.status(result?.success ? 200 : 404).json(result);
    }
    static async googleVerification(req: Request, res: Response) {
        const result = await WebPartnerService.googleVerification(req.body);
        res.status(result?.success ? 200 : 404).json(result);
    }
    static async getKycFaildPartner(req: Request, res: Response) {
        const { currentPage = 1, pageSize = 10 } = req.query;
        const result = await WebPartnerService.getKycFaildPartner(Number(currentPage),
            Number(pageSize));
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async getProfile(req: Request, res: Response) {
        if (!req.user?._id) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const partnerId: Types.ObjectId = req.user._id;
        const result = await WebPartnerService.getProfile(partnerId.toString());
        res.status(result?.success ? 200 : 404).json(result);
    }
    static async waitingForApproval(req: Request, res: Response) {
        if (!req.user?._id) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const partnerId: Types.ObjectId = req.user._id;
        const result = await WebPartnerService.waitingForApproval(partnerId.toString());
        res.status(result?.success ? 200 : 400).json(result);
    }
    static async incomingRequests(req: Request, res: Response) {
        const { currentPage = 1, pageSize = 10 } = req.query;
        const result = await WebPartnerService.incomingRequests(Number(currentPage), Number(pageSize));
        res.status(result.success ? 200 : 404).json(result);
    }

    static async addSubscriptionPlans(req: Request, res: Response) {
        if (!req.user?._id) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const partnerId: Types.ObjectId = req.user._id;
        const result = await WebPartnerService.addSubscriptionPlans(req.body, partnerId);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async bookedCustomers(req: Request, res: Response) {
        if (!req.user?._id) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const partnerId: Types.ObjectId = req.user._id;
        const result = await WebPartnerService.bookedCustomers(partnerId);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async subscriptionWithoutCode(req: Request, res: Response) {
        if (!req.user?._id) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const partnerId: Types.ObjectId = req.user._id;
        const result = await WebPartnerService.subscriptionWithoutCode(req.body, partnerId);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async fetchSubscriptionPaymentstatus(req: Request, res: Response) {
        if (!req.user?._id) {
                    return res.status(401).json({ message: "Unauthorized" });
                }
                const partnerId: Types.ObjectId = req.user._id;
        const result = await WebPartnerService.fetchSubscriptionPaymentstatus(req.body, partnerId);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async partnerWebSubscriptionPayNow(req: Request, res: Response) {
        const partnerId = req?.user?._id;
        const result = await WebPartnerService.partnerWebSubscriptionPayNow(req.body, partnerId);
        res.status(result?.success ? 200 : 404).json(result);
    }


}  
