import Partner from "../models/partner.model.js";
import { GenericResponse, GenericResponseCode } from "../shared/type.js";
import { upload } from "../config/multer.config.js";
import { getBaseUrl } from "../utils/gertBaseUrl.js";
import { Request } from "express";
import mongoose, { Query, Types } from "mongoose";
import { generateOTP } from "../utils/otp.util.js";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import Booking from "../models/booking.model.js";
import fs from "fs";
import path from "path";
import Category from "../models/category.model.js";
import { createResponse, getDobFormate, getPlansDuration, getProfile, getYearsExperience, isValidAadhaar, isValidPan, partnerSubscriptionPaymentCompleted, addSubscriptionPaymentPending, removeCountryCode, removeOldFile, validateFields, displayDate, partnerSubscriptionPaymentFaild, getReferralHistory, fetchingSubscriptionPlans, updateActiveJobs, getJobDetails, getApplicateDetails, partnerToJobDistance, checkIsValidPhoneNumber, createResponseStatus, getPartnerJobDetailsList, checkBookingPaymentStatus, refundWorkPayment, dateFormate, getFormatedDateTime, languagesList, bookingStatusList, addBookingStatus, getJobCurrentTab, createKmRanges, getPartnerJobMinMaxRange, getPartnerJobDetailsListWithFilters, getMinAndMaxPrice, addBookingAmountWallet, updatePartnerWalletAmount, calculatePortalCharge, withdrawRequest, timeRange, formatDateOrDay, getStatusDisplayName, preparePushNotification, getRoleId, addPartnerWalletPendingTrasncation, getAdminId, addPartnerWalletAmountSuccess, addPartnerWalletAmountFailed, payBidingPayment, getBidingCharge, bidingPaymentInWallet, checkBookingCancelRequest, getBookingTransaction, serviceRatingDetails, updateWalletAmount, referralPointDetails, convertReferralPoints } from "../utils/helper.js";

import { verifyUserWithFirebase } from "../utils/firebase.js";
import { updateProfileCompletion } from "../utils/helper.js";
import subscriptionPlansModel from "../models/subscriptionPlans.model.js";
import _, { result, update } from "lodash";
import Service from "../models/service.model.js";
import UserSubscription from "../models/user.subscription.model.js";
import Customer from "../models/customer.model.js";
import { fetchPaymentStatus, generatePhonePePaymentLink, getPhonePeAccessToken } from "../utils/phonepe.js";
import Transaction from "../models/transaction.model.js";
import ReferralCode from "../models/referral.code.model.js";
import Job from "../models/job.model.js";
import Bid from "../models/bids.model.js";
import { format } from "timeago.js";
import ExtraWork from "../models/extrawork.model.js";
import { resourceLimits } from "worker_threads";

import { getJsonData } from "../utils/readJson.js";
import Bookmark from "../models/bookmark.model.js";
import Wallet from "../models/wallet.model.js";
import Notification from "../models/notification.model.js";
import Banner from "../models/banner.model.js";
import Setting from "../models/setting.model.js";
import logger from "../utils/logger.js";
import moment from "moment-timezone";
import { activeGateway, activeGatewayId, checkAccountNumber, checkIFSCCode, getAppReviewList, getBankDetailsByIFSC, getBookingPaymentDetails, getPartnerAppReviewList, getPaymentMethod, getSubscriptionTransactionDetail, getWalletTransactionDetails, isValidUPIFormat, setPartnerAsOnline } from "../utils/comman.js";
import Rating from "../models/rating.model.js";
import PaymentMethod from "../models/paymentMethod.model.js";
import { increaseCustomer, increasePartner } from "../utils/seo_helper.js";
import { addInitiateRazorpaySubscriptionOrder, addInitiateRazorpayWalletOrder, addPartnerRazorpayWalletAmountSuccess, checkRazorpayPaymentStatus, getOrderPaymentStatus, initiateRazorpayOrder, partnerRazorpaySubscriptionPaymentCompleted, paymentStatusArray, pendingMessages, rzp_auth, verifyRazorpayPayment } from "../utils/razorpay.js";
import { job_complete } from "../utils/mail/customer.js";
import { job_complete_partner, subscription_plan_added, subscription_plan_expire, subscription_plan_failed, subscription_plan_pending, wallet_recharge_failed, wallet_recharge_pending, wallet_recharge_successfully, welcome } from "../utils/mail/partner.js";

export { upload };

export class PartnerService {
    static async getAllPartners(
        currentPage: number,
        pageSize: number
    ): Promise<GenericResponse<any>> {
        try {
            const skip = (currentPage - 1) * pageSize;
            const [partners, totalItems] = await Promise.all([
                await Partner.find({ kycStatus: "approved" })
                    .populate({
                        path: "user",
                        match: { role: "partner" },
                        select: "name email phone role isActive",
                    })
                    .populate({
                        path: "createdBy",
                        select: "name email phone role isActive",
                    })
                    .populate({
                        path: "updatedBy",
                        select: "name email phone role isActive",
                    })
                    .skip(skip)
                    .limit(pageSize)
                    .sort({ updatedAt: -1 }).lean(),
                Partner.countDocuments({ kycStatus: "approved" }),
            ]);


            const formatted = await Promise.all(
                partners.map(async (p) => ({
                    ...p,
                    createdAt: await getFormatedDateTime(p.createdAt),
                    updatedAt: await getFormatedDateTime(p.updatedAt),
                    kycApprovedAt: await getFormatedDateTime(p.kycApprovedAt),
                }))
            );
            const totalPages = Math.ceil(totalItems / pageSize);

            if (!partners) {
                return {
                    success: false,
                    data: null,
                    message: "No partners found",
                };
            }

            return {
                success: true,
                data: {
                    partners: formatted,
                    pagination: {
                        currentPage,
                        pageSize,
                        totalItems,
                        totalPages,
                    },
                },
                message: "Partners data fetched successfully",
            };
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching partners`);
            return {
                success: false,
                data: null,
                message: error?.message || "Error fetching partners",
            };
        }
    }

    static async uploadDocs(
        partnerId: string,
        files: { [fieldname: string]: Express.Multer.File[] },
        req: Request
    ) {
        try {
            const partner = await Partner.findOne({ user: partnerId });
            if (!partner) {
                throw new Error(
                    "Partner not found. Please complete your partner registration first."
                );
            }

            if (files.aadharFront?.[0]) {
                partner.aadharFront = `${getBaseUrl(
                    req
                )}/${files.aadharFront[0].path.replace(/\\/g, "/")}`;
            }
            if (files.aadharBack?.[0]) {
                partner.aadharBack = `${getBaseUrl(
                    req
                )}/${files.aadharBack[0].path.replace(/\\/g, "/")}`;
            }
            if (files.panFront?.[0]) {
                partner.panFront = `${getBaseUrl(
                    req
                )}/${files.panFront[0].path.replace(/\\/g, "/")}`;
            }
            if (files.panBack?.[0]) {
                partner.panBack = `${getBaseUrl(
                    req
                )}/${files.panBack[0].path.replace(/\\/g, "/")}`;
            }
            if (
                files.experienceCertificates &&
                files.experienceCertificates.length > 0
            ) {
                const paths = files.experienceCertificates.map(
                    (file) =>
                        `${getBaseUrl(req)}/${file.path.replace(/\\/g, "/")}`
                );
                partner.experienceCertificates = paths;
            }

            await partner.save();

            const formatPath = (filePath: string) =>
                filePath.replace(/\\/g, "/");

            const baseUrl = getBaseUrl(req);

            return {
                success: true,
                message: "Documents uploaded successfully",
                documents: {
                    aadharFront: partner.aadharFront
                        ? `${baseUrl}/${partner.aadharFront.replace(
                            /\\/g,
                            "/"
                        )}`
                        : null,
                    aadharBack: partner.aadharBack
                        ? `${baseUrl}/${partner.aadharBack.replace(/\\/g, "/")}`
                        : null,
                    panFront: partner.panFront
                        ? `${baseUrl}/${partner.panFront.replace(/\\/g, "/")}`
                        : null,
                    panBack: partner.panBack
                        ? `${baseUrl}/${partner.panBack.replace(/\\/g, "/")}`
                        : null,
                    experienceCertificates: partner.experienceCertificates?.map(
                        (path) => `${baseUrl}/${path.replace(/\\/g, "/")}`
                    ),
                },
            };
        } catch (error: any) {
            logger.error(`${error?.message} Error when upload docs`);
            return {
                success: false,
                data: null,
                message: error?.message || "Error in uploadDocs service",
            };
        }
    }

    static async updateSkills(
        partnerId: string,
        skillId: string,
        payload: any
    ) {
        try {
            if (!payload.skillName || !payload.yearsOfExperience) {
                return {
                    success: false,
                    data: null,
                    message:
                        "skillName and yearsOfExperience are required fields",
                };
            }

            if (
                typeof payload.yearsOfExperience !== "number" ||
                payload.yearsOfExperience < 0
            ) {
                return {
                    success: false,
                    data: null,
                    message: "yearsOfExperience must be a positive number",
                };
            }

            const partner = await Partner.findOne({ user: partnerId });
            if (!partner) {
                return {
                    success: false,
                    data: null,
                    message: "Partner not found",
                };
            }

            const skillExists = await Partner.findOne({
                user: partnerId,
                "skills._id": skillId,
            });
            if (!skillExists) {
                return {
                    success: false,
                    data: null,
                    message: `Skill with ID ${skillId} not found`,
                };
            }

            const result = await Partner.findOneAndUpdate(
                { user: partnerId },
                {
                    $set: {
                        "skills.$[skill]": payload,
                    },
                },
                {
                    arrayFilters: [{ "skill._id": skillId }],
                    new: true,
                }
            );

            if (!result) {
                return {
                    success: false,
                    data: null,
                    message: "Partner not found",
                };
            }

            return {
                success: true,
                data: result,
                message: "Skill updated successfully",
            };
        } catch (error: any) {
            logger.error(`${error?.message} Error during updating skill`);
            return {
                success: false,
                data: null,
                message: error?.message || "Error during updating skill",
            };
        }
    }

    static async getPartnerById(id: string): Promise<GenericResponse<any>> {
        try {
            const response: any = await Partner.findOne({ _id: id })
                .populate([
                    {
                        path: "user",
                    },
                    {
                        path: "bookingHistory",
                        populate: {
                            path: "service",
                        },
                    },
                    {
                        path: "category",
                    },
                    {
                        path: "services",
                    }, {
                        path: "referredBy",
                        select: "name email phone"
                    }, {
                        path: "createdBy",
                        select: "name email phone"
                    }, {
                        path: "updatedBy",
                        select: "name email phone"
                    }
                ])
                .lean();
            if (!response) {
                return {
                    success: false,
                    data: null,
                    message: "Partner not found",
                };
            }

            response.aadharFront = `${process.env.BASE_URL}/uploads/partner-docs/${response.aadharFront}`;
            response.aadharBack = `${process.env.BASE_URL}/uploads/partner-docs/${response.aadharBack}`;
            response.panFront = `${process.env.BASE_URL}/uploads/partner-docs/${response.panFront}`;
            response.panBack = `${process.env.BASE_URL}/uploads/partner-docs/${response.panBack}`;
            response.profile = `${process.env.BASE_URL}/uploads/profile/${response.profile}`;
            response.experienceCertificates =
                response.experienceCertificates.map(
                    (certificate: string) =>
                        `${process.env.BASE_URL}/uploads/partner-docs/${certificate}`
                );

            if (response?.skills) {
                response?.skills.forEach((element: any) => {
                    return element.experienceCertificates = (element?.experienceCertificates != "") && (element?.experienceCertificates != undefined) ? `${process.env.BASE_URL}/uploads/partner-docs/${element?.experienceCertificates}` : '';
                })
            }


            if (response?.dob) {
                response.dob = await getDobFormate(response.dob);
            }

            response.createdAt = await getFormatedDateTime(response.createdAt);
            response.updatedAt = await getFormatedDateTime(response.updatedAt);
            response.kycApprovedAt = await getFormatedDateTime(response.kycApprovedAt);

            if (response?.referralHistory.length > 0) {
                const referralHistorypoints = await getReferralHistory(response?.user);
                response.referralHistory = referralHistorypoints?.data?.referralHistory;
            }


            return {
                success: true,
                data: response,
                message: "Partner found successfully",
            };
        } catch (error: any) {
            logger.error(`${error?.message} Error during getting partner by id`);
            return {
                success: false,
                data: null,
                message: error?.message || "Error during getting partner by id",
            };
        }
    }

    static async signUpByNumber(phone: string): Promise<GenericResponse<any>> {
        const session = await mongoose.startSession();
        try {
            const uniqOtp = generateOTP();
            const response = await User.findOne({ phone: phone });

            session.startTransaction();
            if (!response) {
                const user = await User.create(
                    [
                        {
                            email: `${phone}@gmail.com`,
                            phone: phone,
                            role: "partner",
                            roleId: await getRoleId("partner"),
                            isActive: false,
                        },
                    ],
                    { session }
                );
                const partner = await Partner.create({
                    user: user[0]._id,
                    otp: uniqOtp,
                    registeredVia: "app",
                });
            }
            await session.commitTransaction();

            if (response) {
                const partnerUpdate = await Partner.findOneAndUpdate(
                    { user: response._id },
                    { otp: uniqOtp },
                    { new: true }
                );
                return {
                    success: true,
                    data: {
                        otp: uniqOtp,
                        isNewPartner: false,
                    },
                    message:
                        "We've sent a verification code to your phone. Kindly check your messages.",
                };
            }
            if (!response) {
                return {
                    success: true,
                    data: {
                        otp: uniqOtp,
                        isNewPartner: true,
                    },
                    message:
                        "We've sent a verification code to your phone. Kindly check your messages.",
                };
            }
            return {
                success: false,
                data: null,
                message: "An unexpected error occurred.",
            };
        } catch (error: any) {
            logger.error(`${error?.message} Error during registration`);
            return {
                success: false,
                data: null,
                message: error?.message || "Error during registration",
            };
        } finally {
            session.endSession();
        }
    }

    static async otpVerification(
        phone: string,
        otp: string
    ): Promise<GenericResponse<any>> {
        try {
            /*
            const response = await User.findOne({ phone: phone });
            const partner = await Partner.findOne({
                user: response?._id,
                otp: otp,
            });

            if (!otp) {
                return {
                    success: false,
                    data: null,
                    message: "OTP is required",
                };
            }
            if (!phone) {
                return {
                    success: false,
                    data: null,
                    message: "Phone is required",
                };
            }
            if (partner) {
                const token = jwt.sign(
                    { id: response?._id, role: response?.role },
                    process.env.JWT_SECRET!,
                    { expiresIn: "7d" }
                );
                const uniqOtp = generateOTP();

                const userUpdate = await User.findOneAndUpdate(
                    { _id: response?._id },
                    { isActive: true },
                    { new: true }
                );
                const partnerUpdate = await Partner.findOneAndUpdate(
                    { user: response?._id },
                    { otp: uniqOtp },
                    { new: true }
                );

                return {
                    success: true,
                    data: {
                        token: token,
                        user: response,
                    },
                    message: "OTP verified successfully !",
                };
            }

            if (!response) {
                return {
                    success: false,
                    data: {
                        otp: otp,
                        phone: phone,
                    },
                    message:
                        "Oops! The OTP is incorrect. Please check and enter again",
                };
            }
            */
            return {
                success: false,
                data: null,
                message:
                    "Oops! The OTP is incorrect. Please check and enter again",
            };
        } catch (error: any) {
            logger.error(`${error?.message} Error during otp verification`);
            return {
                success: false,
                data: null,
                message: error?.message || "Error during registration",
            };
        }
    }

    static async profileUpdate(
        files: { [fieldname: string]: Express.Multer.File[] },
        partnerId: string,
        req: Request
    ) {
        try {

            if (!partnerId) {
                return {
                    success: false,
                    data: null,
                    message: "User is not found",
                };
            }
            const { name, email, dob } = req.body || {};
            if (!name || !email || !dob) {
                return {
                    success: false,
                    data: null,
                    message: "Please fill out all fields",
                };
            }

            if (req.body?.phone) {
                const checkPhoneValid = await checkIsValidPhoneNumber(req.body?.phone);
                if (checkPhoneValid == false) {
                    return createResponse(false, null, "Invalid phone number plz check and try again");
                }
            }


            const olduser = await User.findOne({ _id: partnerId });
            if (olduser?.joinVia === "Phone" && email) {
                const checkEmailExist = await User.findOne({
                    email: email,
                    _id: { $ne: partnerId }
                });
                if (checkEmailExist) {
                    return createResponse(false, null, "Email is already use with other user");
                }
            }


            if (olduser?.joinVia === "Google" && req.body?.phone) {
                const checkPhoneExist = await User.findOne({
                    phone: req.body?.phone,
                    _id: { $ne: partnerId }
                });
                if (checkPhoneExist) {
                    return createResponse(false, null, "Phone is already use with other user");
                }
            }
            // const partner = await Partner.findOne({ user: user?._id });
            if (olduser) {
                const updateUser = await User.findOneAndUpdate(
                    { _id: partnerId },
                    {
                        name,
                        email: olduser.joinVia == "Google" ? olduser.email : email,
                        dob: new Date(dob),
                        phone: olduser.joinVia == "Phone" ? olduser.phone : req.body?.phone
                    },
                    { new: true }
                );

                const oldPartner = await Partner.findOne({ user: olduser._id });
                // checking if the profile is updated then delete the old profile from the server
                if (files.profile && files.profile[0]) {
                    const oldProfileFilename = oldPartner?.profile;
                    if (oldProfileFilename) {
                        const oldProfilePath = path.join(
                            "uploads/profile/",
                            oldProfileFilename
                        );

                        if (fs.existsSync(oldProfilePath)) {
                            fs.unlinkSync(oldProfilePath);
                        }
                    }
                }


                if (updateUser?.phone && (oldPartner?.referralCode == null || oldPartner?.referralCode == "")) {
                    let updatePartner = await Partner.findOneAndUpdate(
                        { user: olduser._id },
                        {
                            referralCode: await removeCountryCode(updateUser?.phone),
                            languageCode: req?.body?.languageCode
                        },
                        { new: true }
                    );
                }

                let updatePartner = await Partner.findOneAndUpdate(
                    { user: olduser._id },
                    {
                        dob: new Date(dob),
                        languageCode: req?.body?.languageCode,
                        profile: files.profile[0] ? files.profile?.[0]?.filename : oldPartner?.profile,
                        profilePendingScreens: oldPartner?.profilePendingScreens == 1 ? 2 : oldPartner?.profilePendingScreens
                    },
                    { new: true }
                );

                if (oldPartner?.profilePendingScreens == 1) {
                    await welcome({ name: updateUser?.name, email: updateUser?.email });
                }


                if (updatePartner) {
                    await updateProfileCompletion(updatePartner?._id);
                }



                const profile = await getProfile(partnerId);

                return {
                    success: true,
                    data: {
                        user: profile?.user,
                        partner: profile?.partner,
                    },
                    message: "Profile updated successfully!",
                };
            }


        } catch (error: any) {
            logger.error(`${error?.message} Error When update profile`);
            return {
                success: false,
                data: null,
                message: error?.message || "Error during registration",
            };
        }
    }

    static async workLocationUpdate(partnerId: string, payload: any) {
        try {
            if (
                !payload.address ||
                !payload.city ||
                !payload.state ||
                !payload.pincode ||
                !payload.country ||
                !payload.latitude ||
                !payload.longitude ||
                !payload.serviceAreaDistance
            ) {
                return {
                    success: false,
                    data: null,
                    message: "Please fill out all fields",
                };
            }

            const user = await User.findOne({ _id: Object(partnerId) });
            const partner = await Partner.findOne({ user: user?._id });
            if (partner) {
                partner.address = payload.address;
                partner.city = payload.city;
                partner.state = payload.state;
                partner.pincode = payload.pincode;
                partner.country = payload.country;
                partner.latitude = payload.latitude;
                partner.longitude = payload.longitude;
                partner.location = {
                    type: "Point",
                    coordinates: [payload.longitude, payload.latitude], // [longitude, latitude]
                };
                partner.serviceAreaDistance = payload.serviceAreaDistance;
                if (partner.profilePendingScreens === 5) {
                    partner.profilePendingScreens = 6;  // 6 mean pending for upload documents
                }
                await partner.save();
            }

            if (partner) {
                await updateProfileCompletion(partner?._id);
            }


            const profile = await getProfile(partnerId);

            return {
                success: true,
                data: {
                    user: profile?.user,
                    partner: profile?.partner,
                },
                message: "Work location updated successfully",
            };
        } catch (error: any) {
            logger.error(`${error?.message} Error When update location`);
            return {
                success: false,
                data: null,
                message: error?.message || "Error during registration",
            };
        }
    }

    static async updateOnlineStatus(partnerId: string, payload: any) {
        try {

            const partner = await Partner.findOne({ user: Object(partnerId) });


            if (!payload.latitude || !payload.longitude) {
                return {
                    success: false,
                    data: null,
                    message: "Latitude and longitude are required",
                };
            }

            if (partner) {
                partner.isOnline = payload.isOnline;
                partner.latitude = payload.latitude;
                partner.longitude = payload.longitude;
                await partner.save();
            }

            let message = "Don't miss out on new job opportunities! Click the 'Ready to Work' button to view today's latest openings.";
            if (payload.isOnline == true) {
                message = "Congratulations! You’re now ready to work and open to exciting new job opportunities"
            }

            const profile = await getProfile(partnerId);
            return {
                success: true,
                data: {
                    user: profile.user,
                    partner: profile.partner
                },
                message: message,
            };
        } catch (error: any) {
            logger.error(`${error?.message} Error When update online status`);
            return {
                success: false,
                data: null,
                message:
                    error?.message || "Error during updating online status",
            };
        }
    }

    static async updateLiveLocation(partnerId: string, payload: any) {
        try {
            const partner = await Partner.findOne({ user: Object(partnerId) });
            if (!payload.latitude || !payload.longitude) {
                return {
                    success: false,
                    data: null,
                    message: "Latitude and longitude are required",
                };
            }
            if (partner) {
                partner.latitude = payload.latitude;
                partner.longitude = payload.longitude;
                await partner.save();
            }
            return {
                success: true,
                data: {
                    partner: partner,
                },
                message: "Live location updated successfully",
            };
        } catch (error: any) {
            logger.error(`${error?.message} Error When update Live location`);
            return {
                success: false,
                data: null,
                message:
                    error?.message || "Error during updating live location",
            };
        }
    }

    static async partnerSkills(partnerId: string, files: { [fieldname: string]: Express.Multer.File[] }, payload: any) {
        try {
            if (!partnerId)
                return createResponse(false, null, "User not found");

            const partner = await Partner.findOne({ user: Object(partnerId) });
            const user = await User.findOne({ _id: Object(partner?.user) }).select('-password');

            if (!payload?.skills) {
                return {
                    success: false,
                    data: null,
                    message: "skills are required",
                };
            }



            let PSkills = [];
            if (!Array.isArray(payload.skills)) {
                PSkills.push(payload.skills);
            } else {
                PSkills = payload.skills;
            }




            const skills = PSkills.map((id: any) => new mongoose.Types.ObjectId(id));

            const subcategoriesByCategory = await Service.find({
                _id: { $in: skills },
            }).select("category categorytype name");


            let categories = subcategoriesByCategory.map((subcategory: any) => subcategory.category.toString());
            categories = [...new Set(categories)];
            let subcategories = subcategoriesByCategory.map((subcategory: any) => subcategory._id.toString());
            subcategories = [...new Set(subcategories)];
            let typeOfCategory = subcategoriesByCategory.map((subcategory: any) => subcategory.categorytype.toString());
            typeOfCategory = [...new Set(typeOfCategory)];

            let subcategoriesNames = subcategoriesByCategory.map((subcategory: any) => subcategory);

            const yearOfExprence = payload.yearOfExprence || [];

            interface SkillExperience {
                serviceId: any;
                skill: string;
                yearOfExprence: number;
                experienceCertificates: string;
            }

            const skillsWithYearOfExprence: SkillExperience[] = [];


            subcategoriesNames.forEach((item: any) => {
                const serviceId = item?._id?.toString?.();

                const experienceYear =
                    yearOfExprence?.[serviceId] ??
                    partner?.skills?.find((s: any) => s.serviceId?.toString() === serviceId)?.yearOfExprence ??
                    0;

                let experienceCertificate =
                    files?.experienceCertificates?.[serviceId]?.filename ??
                    partner?.skills?.find((s: any) => s.serviceId?.toString() === serviceId)?.experienceCertificates ??
                    "";

                // Optional: If `files` is an array (like from multer), process it accordingly
                if (Array.isArray(files)) {
                    files.forEach((file: any) => {
                        if (file?.fieldname?.includes(serviceId)) {
                            experienceCertificate = file.filename;
                        }
                    });
                }

                skillsWithYearOfExprence.push({
                    serviceId: item?._id?.toString(),
                    skill: item?.name,
                    yearOfExprence: experienceYear,
                    experienceCertificates: experienceCertificate,
                });
            });

            if (partner) {
                partner.category = categories.map((category: any) => new mongoose.Types.ObjectId(category.toString())) || [];
                partner.services = subcategories.map((subcategory: any) => new mongoose.Types.ObjectId(subcategory.toString())) || [];
                partner.skills = skillsWithYearOfExprence as any || [];
                partner.categoryType = typeOfCategory || [];
                if (partner.profilePendingScreens < 5 && partner.profilePendingScreens !== 0) {
                    partner.profilePendingScreens = 5;  // 5 mean pending for update work location
                }
                partner.totalExperience = Math.max(...skillsWithYearOfExprence.map(item => Number(item.yearOfExprence)));

                await partner.save();
            }

            if (partner) {
                await updateProfileCompletion(partner._id);
            }

            const profile = await getProfile(partnerId);

            return {
                success: true,
                data: {
                    user: profile?.user,
                    partner: profile?.partner,
                },
                message: "Partner skills updated successfully",
            };
        } catch (error: any) {
            logger.error(`${error?.message} Error When update Partner skills`);
            return {
                success: false,
                data: null,
                message:
                    error?.message ||
                    "Error during updating partner provide services",
            };
        }
    }

    static async getPartnerSkills(partnerId: string) {
        const objectId = new mongoose.Types.ObjectId(partnerId);
        try {
            const partner = await Partner.findOne(
                { user: objectId },
                { skills: 1, _id: 0 }
            );
            if (partner) {
                return {
                    success: true,
                    data: {
                        partner: partner,
                    },
                };
            }
            return {
                success: false,
                data: null,
                message: "Partner not found",
            };
        } catch (error: any) {
            logger.error(`${error?.message} Error When getting partner skill`);
            return {
                success: false,
                data: null,
                message:
                    error?.message || "Error during getting partner skills",
            };
        }
    }

    static async matchingJobs(partnerId: string) {
        try {
            const partner = await Partner.findOne({ user: Object(partnerId) });
            const jobs = await Booking.find({
                service: { $in: partner?.skills.map((skill) => skill) },
            });

            if (partner) {
                return {
                    success: true,
                    data: {
                        partner: partner,
                        jobs: jobs,
                    },
                    message: "Matching jobs fetched successfully",
                };
            }
        } catch (error: any) {
            logger.error(`${error?.message} Error during getting matching jobs`);
            return {
                success: false,
                data: null,
                message: error?.message || "Error during getting matching jobs",
            };
        }
    }

    static async getServices() {
        try {
            const categories = await Category.find({ status: "active" });

            if (categories.length === 0) {
                return {
                    success: false,
                    data: null,
                    message: "No services found",
                };
            }

            categories.forEach((category: any) => {
                category.image = category.image
                    ? `${process.env.BASE_URL}/uploads/categories/${category.image}`
                    : null;
            });

            if (categories) {
                return {
                    success: true,
                    data: {
                        services: categories,
                    },
                    message: "Services fetched successfully",
                };
            }

            return {
                success: false,
                data: {
                    services: [],
                },
                message: "No services found",
            };
        } catch (error: any) {
            logger.error(`${error?.message} Error when get services`);
            return {
                success: false,
                data: null,
                message: error?.message || "Error during getting services",
            };
        }
    }

    static async getServicesByCategory(categoryId: string) {
        try {
            const categoryIds = Array.isArray(categoryId)
                ? categoryId.map((id) => new mongoose.Types.ObjectId(id))
                : [new mongoose.Types.ObjectId(categoryId)];

            const services = await Service.aggregate([
                {
                    $match: {
                        category: { $in: categoryIds },
                    },
                },
                {
                    $lookup: {
                        from: "categories",
                        localField: "category",
                        foreignField: "_id",
                        as: "category"
                    }
                },
                {
                    $unwind: "$category"
                },
                {
                    $lookup: {
                        from: "categorytypes",
                        localField: "categorytype",
                        foreignField: "_id",
                        as: "categorytype"
                    }
                },
                {
                    $unwind: "$categorytype"
                },
                {
                    $group: {
                        _id: {
                            categoryId: "$category._id",
                            categoryName: "$category.name",
                            categoryTypeId: "$categorytype._id",
                            categoryTypeName: "$categorytype.name",
                            image: "$category.image",
                        },
                        services: {
                            $push: {
                                _id: "$_id",
                                name: "$name",
                                description: "$description",
                                isCertificate: "$isCertificate"
                                // other service fields you need
                            }
                        }
                    }
                },
                {
                    $group: {
                        _id: {
                            categoryId: "$_id.categoryId",
                            categoryName: "$_id.categoryName",
                            image: "$_id.image",
                        },
                        categorytypes: {
                            $push: {
                                categoryTypeId: "$_id.categoryTypeId",
                                categoryTypeName: "$_id.categoryTypeName",
                                services: "$services"
                            }
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        categoryId: "$_id.categoryId",
                        categoryName: "$_id.categoryName",
                        image: "$_id.image",
                        categorytypes: 1
                    }
                }
            ]);

            services.map((category: any) => {
                category.image = category.image
                    ? `${process.env.BASE_URL}/uploads/categories/${category.image}`
                    : null;
                category.categorytypes.map(async (type: any) => {
                    type.categoryTypeName = _.capitalize(type?.categoryTypeName);
                })
            })
            return {
                success: true,
                data: {
                    services: services,
                },
                message: "Services fetched successfully",
            };
        } catch (error: any) {
            logger.error(`${error?.message} Error when get services by category`);
            return {
                success: false,
                data: null,
                message:
                    error?.message ||
                    "Error during getting services by category",
            };
        }
    }

    static async uploadPartnerDocuments(partnerId: string, files: { [fieldname: string]: Express.Multer.File[] }, req: Request) {
        try {
            const { aadharNo, panNo, isAadharCard, isPanCard } = req.body;

            const session = await mongoose.startSession();
            const oldImages = [];
            const newImages = [];
            session.startTransaction();
            const user = await User.findOne({ _id: Object(partnerId) });
            const partner = await Partner.findOne({ user: Object(partnerId) });

            if (aadharNo && isAadharCard) {
                const isDuplicate = await Partner.findOne({
                    aadharNo: req.body.aadharNo,
                    _id: { $ne: partner?._id }, // Exclude current partner (being edited)
                });

                if (isDuplicate) {
                    return {
                        success: false,
                        data: null,
                        message: "Aadhar number already exists.",
                    };
                }
            }

            if (panNo && isPanCard) {
                const isDuplicate = await Partner.findOne({
                    panNo: req.body.panNo,
                    _id: { $ne: partner?._id }, // Exclude current partner (being edited)
                });
                if (isDuplicate) {
                    return {
                        success: false,
                        data: null,
                        message: "Pan number already exists.",
                    };
                }
            }


            if (!partner) {
                return {
                    success: false,
                    data: null,
                    message: "Partner not found",
                };
            }

            if (isAadharCard === "true") {
                partner.aadharNo = aadharNo !== "undefined" ? aadharNo : partner.aadharNo;
            }
            if (isPanCard === "true") {
                partner.panNo = panNo !== "undefined" ? panNo : partner.panNo;
            }

            if (files?.aadharFront?.[0]) {
                oldImages.push(`uploads/partner-docs/${partner.aadharFront}`);
                partner.aadharFront = files.aadharFront[0].filename;
                newImages.push(`uploads/partner-docs/${files.aadharFront[0].filename}`);
            }
            if (files?.aadharBack?.[0]) {
                oldImages.push(`uploads/partner-docs/${partner.aadharBack}`);
                partner.aadharBack = files.aadharBack[0].filename;
                newImages.push(`uploads/partner-docs/${files.aadharBack[0].filename}`);
            }
            if (files?.panFront?.[0]) {
                oldImages.push(`uploads/partner-docs/${partner.panFront}`);
                partner.panFront = files.panFront[0].filename;
                newImages.push(`uploads/partner-docs/${files.panFront[0].filename}`);
            }
            if (files?.panBack?.[0]) {
                oldImages.push(`uploads/partner-docs/${partner.panBack}`);
                partner.panBack = files.panBack[0].filename;
                newImages.push(`uploads/partner-docs/${files.panBack[0].filename}`);
            }

            const experienceCertificates: string[] = [];
            if (files?.experienceCertificates?.length > 0) {
                files.experienceCertificates.forEach((file: any) => {
                    experienceCertificates.push(file.filename);
                    newImages.push(`uploads/partner-docs/${file.filename}`);
                });

                partner.experienceCertificates.forEach((certificate: string) => {
                    oldImages.push(`uploads/partner-docs/${certificate}`);
                });

                partner.experienceCertificates = experienceCertificates;
            }


            if (isAadharCard === "true") {
                if (!isValidAadhaar(aadharNo as string)) {
                    newImages.forEach(async (image) => {
                        await removeOldFile(image as string)
                    });
                    return {
                        success: false,
                        data: null,
                        message: "Please upload valid Aadhar Details",
                    };
                }

                if ((files?.aadharFront?.[0] && !files?.aadharBack?.[0]) ||
                    (!files?.aadharFront?.[0] && files?.aadharBack?.[0])) {
                    newImages.forEach(async (image) => {
                        await removeOldFile(image as string)
                    });
                    return {
                        success: false,
                        data: null,
                        message: "Please upload both Aadhar front and back",
                    };       //
                }

            }

            if (isPanCard === "true") {
                if (!isValidPan(panNo as string)) {
                    newImages.forEach(async (image) => {
                        await removeOldFile(image as string)
                    });
                    return {
                        success: false,
                        data: null,
                        message: "Please upload valid Pan number",
                    };
                }
                if ((files?.panFront?.[0] && !files?.panBack?.[0]) ||
                    (!files?.panFront?.[0] && files?.panBack?.[0])) {
                    newImages.forEach(async (image) => {
                        await removeOldFile(image as string)
                    });
                    return {
                        success: false,
                        data: null,
                        message: "Please upload both Pan front and back",
                    };
                }
            }
            partner.profilePendingScreens = 0;  // 0 mean profile is complete 


            if (partner.kycStatus == "rejected") {
                partner.kycStatus = "pending";
            }
            await partner.save();
            await session.commitTransaction();
            oldImages.forEach(async (image) => {
                await removeOldFile(image as string)
            });
            session.endSession();


            await updateProfileCompletion(partner._id);


            const profile = await getProfile(partnerId);
            return {
                success: true,
                data: {
                    "user": profile?.user,
                    "partner": profile?.partner
                },
                message: "Partner documents uploaded successfully",
            };


        } catch (error: any) {
            logger.error(`${error?.message} Error when upload partner documents`);
            return {
                success: false,
                data: null,
                message: error?.message || "Error during uploading partner documents",
            };
        }
    }

    static async verifyUser(idToken: string) {
        try {
            const result = await verifyUserWithFirebase(idToken) as any;
            if (result.error && result.error === "Invalid token") {
                return {
                    success: false,
                    data: null,
                    message: result.error,
                };
            }
            return {
                success: true,
                data: result,
                message: "User verified successfully",
            };
        } catch (error: any) {
            logger.error(`${error?.message} Error when user verified`);
            return {
                success: false,
                data: null,
                message: error?.message || "Error during verifying user",
            };
        }
    }

    static async login(idToken: string) {
        try {
            const result = await verifyUserWithFirebase(idToken) as any;

            if (result.error && result.error === "Invalid token") {
                return {
                    success: false,
                    data: null,
                    message: result.error,
                };
            }

            const checkDetailsInCustomer = await User.findOne({ phone: result.phone_number, role: "customer" });
            if (checkDetailsInCustomer) {
                logger.info(`${result.phone_number} is already registered with bharat worker customer app. Please try a different number`);
                return createResponse(false, null, "This number is already registered with bharat worker customer app. Please try a different number");
            }

            const user = await User.findOne({ phone: result.phone_number });
            if (!user) {
                logger.info(`${result.phone_number} Partner not found please signup first`);
                return {
                    success: false,
                    data: null,
                    message: "User not found please signup first",
                };
            }
            const partner = await Partner.findOne({ user: user._id });
            if (!partner) {
                logger.info(`${result.phone_number} Partner Record not found on partner schema`);
                return {
                    success: false,
                    data: null,
                    message: "Partner not found please signup first",
                };
            }
            const token = jwt.sign(
                { id: user._id, role: user.role },
                process.env.JWT_SECRET!,
                { expiresIn: "7d" }
            );

            if (partner.aadharBack) {
                partner.aadharBack = `${process.env.BASE_URL}/uploads/partner-docs/${partner.aadharBack}`;
            }
            if (partner.aadharFront) {
                partner.aadharFront = `${process.env.BASE_URL}/uploads/partner-docs/${partner.aadharFront}`;
            }
            if (partner.panBack) {
                partner.panBack = `${process.env.BASE_URL}/uploads/partner-docs/${partner.panBack}`;
            }
            if (partner.panFront) {
                partner.panFront = `${process.env.BASE_URL}/uploads/partner-docs/${partner.panFront}`;
            }
            if (partner.experienceCertificates && partner.experienceCertificates.length > 0 && partner.experienceCertificates[0] !== "undefined" && partner.experienceCertificates[0] !== null) {
                partner.experienceCertificates = partner.experienceCertificates.map((certificate: string) => `${process.env.BASE_URL}/uploads/partner-docs/${certificate}`);
            }
            logger.info(`${user?.name} Login successfuly`);
            return {
                success: true,
                data: {
                    token: token,
                    user: user,
                    partner: partner,
                },
                message: "Login successful",
            };
        } catch (error: any) {
            logger.error(`${error?.message} Error during login`);
            return {
                success: false,
                data: null,
                message: error?.message || "Error during login",
            };
        }
    }

    static async partnerSignup(token: any, languageCode: string, fcm_token: string, latitude: any, longitude: any) {
        try {
            const result = await verifyUserWithFirebase(token) as any;

            if (result.error && result.error === "Invalid token") {
                return {
                    success: false,
                    data: null,
                    message: result.error,
                };
            }

            const checkDetailsInCustomer = await User.findOne({ phone: result.phone_number, role: "customer" });
            if (checkDetailsInCustomer) {
                logger.info(`${result.phone_number} is already registered with bharat worker customer app. Please try a different number`);
                return createResponse(false, null, "This number is already registered with bharat worker customer app. Please try a different number");
            }
            const user = await User.findOne({ phone: result.phone_number });

            if (!user) {
                const newUser = await User.create({
                    phone: result?.phone_number,
                    role: "partner",
                    fcm_token,
                    roleId: await getRoleId("partner"),
                    isActive: false,
                });
                const partner = await Partner.create({
                    user: newUser._id,
                    profilePendingScreens: 1, // 1 pending for profile update 
                    profileCompletion: 0,
                    latitude,
                    longitude,
                    location: {
                        type: "Point",
                        coordinates: [longitude, latitude], // [longitude, latitude]
                    },
                    languageCode
                });




                const token = jwt.sign(
                    { id: newUser._id, role: newUser.role },
                    process.env.JWT_SECRET!,
                    { expiresIn: "7d" }
                );

                if (partner) {
                    await updateProfileCompletion(partner._id);
                }
                await setPartnerAsOnline(newUser._id);
                const profile = await getProfile(newUser._id.toString());

                logger.info(`${profile.user?.name} Partner signup successfuly`);
                return {
                    success: true,
                    data: {
                        token: token,
                        user: profile.user,
                        partner: profile.partner,
                    },
                    message: "Partner signup successful",
                };
            }

            if (user) {
                const partner = await Partner.findOne({ user: user._id });
                await setPartnerAsOnline(user._id);
                await User.updateOne(
                    { _id: user._id },        // filter (which document to update)
                    { $set: { fcm_token } } // update fields
                );



                if (partner) {
                    partner.languageCode = languageCode;
                    await partner.save();
                    await updateProfileCompletion(partner._id);
                }

                const profile = await getProfile(user._id.toString());

                const token = jwt.sign(
                    { id: user._id, role: user.role },
                    process.env.JWT_SECRET!,
                    { expiresIn: "7d" }
                );
                logger.info(`${profile.user?.name} Partner login sucessfuly`);
                return {
                    success: true,
                    data: {
                        token: token,
                        user: profile.user,
                        partner: profile.partner,
                    },
                    message: "Partner Login successful",
                };
            }


        } catch (error: any) {
            logger.error(`${error?.message} Error during partner signup`);
            return {
                success: false,
                data: null,
                message: error?.message || "Error during partner signup",
            };
        }
    }

    static async getSubscriptionPlans() {
        try {
            const subscriptionPlans = await subscriptionPlansModel.find({ status: "active", target: "partner" }, { pricingTiers: 0, target: 0 });
            return {
                success: true,
                data: subscriptionPlans,
                message: "Subscription plans fetched successfully",
            };
        } catch (error: any) {
            logger.error(`${error?.message} Error when getting subscription plans`);
            return {
                success: false,
                data: null,
                message: error?.message || "Error during getting subscription plans",
            };
        }
    }

    static async getYearsExperience() {
        try {
            const years = getYearsExperience();
            return {
                success: true,
                data: years,
                message: "Years experience fetched successfully",
            };
        } catch (error: any) {
            logger.error(`${error?.message} Error when getting years list`)
            return {
                success: false,
                data: null,
                message: error?.message || "Error during getting years list",
            };
        }
    }

    static async getPendingPartners(
        currentPage: number,
        pageSize: number
    ): Promise<GenericResponse<any>> {
        try {
            const skip = (currentPage - 1) * pageSize;
            const [partners, totalItems] = await Promise.all([
                await Partner.find({ kycStatus: "pending", waitingForApproval: true })
                    .populate({
                        path: "user",
                        match: { role: "partner" },
                        select: "name email phone role isActive",
                    })
                    .skip(skip)
                    .limit(pageSize)
                    .sort({ updatedAt: -1 }).lean(),
                Partner.countDocuments({ kycStatus: "pending", waitingForApproval: true }),
            ]);



            const formatted = await Promise.all(
                partners.map(async (p) => ({
                    ...p,
                    createdAt: await getFormatedDateTime(p.createdAt),
                    updatedAt: await getFormatedDateTime(p.updatedAt),
                }))
            );

            const totalPages = Math.ceil(totalItems / pageSize);

            if (!partners) {
                return {
                    success: false,
                    data: null,
                    message: "No partners found",
                };
            }

            return {
                success: true,
                data: {
                    partners: formatted,
                    pagination: {
                        currentPage,
                        pageSize,
                        totalItems,
                        totalPages,
                    },
                },
                message: "Partners data fetched successfully",
            };
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching pending partners`)
            return {
                success: false,
                data: null,
                message: error?.message || "Error fetching partners",
            };
        }
    }

    static async partnerKycStatus(payload: any) {

        try {
            const { id, approvalStatus, kycRejectionReason } = payload;
            const user = await User.findOne({ _id: Object(id) });
            const partner = await Partner.findOne({ user: Object(id) });
            if ((partner?.waitingForApproval == false) && partner?.kycStatus != "approved")
                return createResponse(false, null, "KYC status cannot be updated until the required KYC details are submitted");

            if (partner?.kycStatus == "approved")
                return createResponse(false, null, "This profile is already approved");
            if (!user || !partner) {
                return {
                    success: false,
                    data: null,
                    message: "user not found"
                }
            }

            if (approvalStatus == true) {
                user.isActive = true;
                await user.save();
                partner.kycStatus = "approved";
                partner.kycApprovedAt = new Date;
                partner.kycRejectionReason = "";
            } else {
                user.isActive = false;
                await user.save();
                partner.kycStatus = "rejected";
                partner.kycRejectionReason = kycRejectionReason;
            }
            partner.waitingForApproval = false;
            await partner.save();

            return {
                success: true,
                data: {
                    user: user,
                    partner: partner
                },
                message: "User Kyc Update successfully!"
            }
        } catch (error: any) {
            logger.error(`${error?.message} Error when update kyc`)
            return {
                success: false,
                data: null,
                message: error.message || "something went wronge"
            }
        }
    }

    static async googleVerification(payload: any) {

        try {

            if (!payload.email) {
                return {
                    success: true,
                    data: null,
                    message: "Email is required"
                }
            }

            const checkDetailsInCustomer = await User.findOne({ email: payload.email, role: "customer" });

            if (checkDetailsInCustomer)
                return createResponse(false, null, "This Email is already registered with bharat worker customer app. Please try a different Email");


            let user = await User.findOne({ email: payload.email });


            if (!user) {
                const newUser = await User.create({
                    email: payload?.email,
                    name: payload?.name,
                    phone: payload?.phone,
                    fcm_token: payload?.fcm_token,
                    joinVia: payload.joinVia,
                    roleId: await getRoleId("partner"),
                    role: "partner",
                    isActive: false,
                });
                const partner = await Partner.create({
                    user: newUser._id,
                    profilePendingScreens: 1, // 1 pending for profile update 
                    profileCompletion: 0,
                    languageCode: payload?.languageCode,
                    latitude: payload.latitude,
                    longitude: payload.longitude,
                    location: {
                        type: "Point",
                        coordinates: [payload.longitude, payload.latitude], // [longitude, latitude]
                    }
                });

                await updateProfileCompletion(partner._id);

                const token = jwt.sign(
                    { id: newUser._id, role: newUser.role },
                    process.env.JWT_SECRET!,
                    { expiresIn: "7d" }
                );
                await setPartnerAsOnline(partner?.user);
                const profile = await getProfile(newUser?._id.toString());
                return {
                    success: true,
                    data: {
                        token: token,
                        user: profile?.user,
                        partner: profile?.partner,
                    },
                    message: "Partner signup successful",
                };
            } if (user) {
                const token = jwt.sign(
                    { id: user._id, role: user.role },
                    process.env.JWT_SECRET!,
                    { expiresIn: "7d" }
                );


                await User.updateOne(
                    { _id: user._id },        // filter (which document to update)
                    { $set: { fcm_token: payload?.fcm_token } } // update fields
                );

                const partner = await Partner.findOne({ user: user._id });
                if (partner) {
                    partner.languageCode = payload?.languageCode;
                    partner.latitude = payload.latitude;
                    partner.longitude = payload.longitude;
                    partner.location = {
                        type: "Point",
                        coordinates: [payload.longitude, payload.latitude], // [longitude, latitude]
                    }
                    await partner.save();
                }
                await setPartnerAsOnline(partner?.user);

                const profile = await getProfile(user._id.toString());

                await updateProfileCompletion(profile?.partner?._id);

                return {
                    success: true,
                    data: {
                        token: token,
                        user: profile?.user,
                        partner: profile?.partner,
                    },
                    message: "Partner login successful",
                };

            }

        } catch (error: any) {
            logger.error(`${error?.message} Error when partner google verification`);
            return {
                success: false,
                data: null,
                message: error.message || "something went wronge"
            }
        }

    }

    static async getKycFaildPartner(
        currentPage: number,
        pageSize: number
    ): Promise<GenericResponse<any>> {
        try {
            const skip = (currentPage - 1) * pageSize;
            const [partners, totalItems] = await Promise.all([
                await Partner.find({ kycStatus: "rejected" })
                    .populate({
                        path: "user",
                        match: { role: "partner" },
                        select: "name email phone role isActive",
                    })
                    .skip(skip)
                    .limit(pageSize)
                    .sort({ updatedAt: -1 }).lean(),
                Partner.countDocuments({ kycStatus: "rejected" }),
            ]);

            const totalPages = Math.ceil(totalItems / pageSize);

            const formatted = await Promise.all(
                partners.map(async (p) => ({
                    ...p,
                    createdAt: await getFormatedDateTime(p.createdAt),
                    updatedAt: await getFormatedDateTime(p.updatedAt),
                }))
            );

            if (!partners) {
                return {
                    success: false,
                    data: null,
                    message: "No partners found",
                };
            }

            return {
                success: true,
                data: {
                    partners: formatted,
                    pagination: {
                        currentPage,
                        pageSize,
                        totalItems,
                        totalPages,
                    },
                },
                message: "Partners data fetched successfully",
            };
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching kyc faild partner`);
            return {
                success: false,
                data: null,
                message: error?.message || "Error fetching partners",
            };
        }
    }

    static async getProfile(partnerId: string): Promise<GenericResponse<any>> {

        try {
            const profile = await getProfile(partnerId);
            return {
                success: true,
                data: {
                    user: profile?.user,
                    partner: profile?.partner,
                },
                message: "Profile get successfully !"
            }
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching partner profile`);
            return {
                success: false,
                data: null,
                message: error?.message || "Error fetching partners",
            }
        }

    }

    static async waitingForApproval(partnerId: string): Promise<GenericResponse<any>> {
        try {

            const checkPaterActivity = await Partner.findOne({ user: partnerId, kycStatus: "pending" });

            if (checkPaterActivity) {
                const partner = await Partner.findOneAndUpdate(
                    { user: partnerId },
                    { waitingForApproval: true },
                    { new: true } // returns the updated document
                );

                const profile = await getProfile(partnerId); // partner Id user _id

                return {
                    success: true,
                    data: {
                        user: profile?.user,
                        partner: profile?.partner
                    },
                    message: "Your approval status has been successfully updated !"
                }
            } else {
                return {
                    success: false,
                    data: null,
                    message: "Your KYC verification has failed. Please update your identity documents and try again."
                }
            }

        } catch (error: any) {
            logger.error(`${error?.message} Error when enable for update approval status`);
            return {
                success: false,
                data: null,
                message: error?.message || "Failed to update approval status. Please try again.",
            }
        }
    }

    static async incomingRequests(currentPage: number,
        pageSize: number): Promise<GenericResponse<any>> {
        try {
            const skip = (currentPage - 1) * pageSize;
            const [partners, totalItems] = await Promise.all([
                await Partner.find({ kycStatus: "pending", waitingForApproval: false })
                    .populate({
                        path: "user",
                        match: { role: "partner" },
                        select: "name email phone role isActive",
                    })
                    .skip(skip)
                    .limit(pageSize)
                    .sort({ updatedAt: -1 })
                    .lean(),
                Partner.countDocuments({ kycStatus: "pending", waitingForApproval: false }),
            ]);

            const formatted = await Promise.all(
                partners.map(async (p) => ({
                    ...p,
                    createdAt: await getFormatedDateTime(p.createdAt),
                    updatedAt: await getFormatedDateTime(p.updatedAt),
                    kycApprovedAt: await getFormatedDateTime(p.kycApprovedAt),
                }))
            );
            const totalPages = Math.ceil(totalItems / pageSize);

            if (!partners) {
                return {
                    success: false,
                    data: null,
                    message: "No partners found",
                };
            }
            return {
                success: true,
                data: {
                    partners: formatted,
                    pagination: {
                        currentPage,
                        pageSize,
                        totalItems,
                        totalPages,
                    },
                },
                message: "Incoming Partners fetched successfully",
            };
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching incomming partners`);
            return {
                success: false,
                data: null,
                message: error?.message || "Error fetching Incoming Partners",
            };
        }
    }

    static async addSubscriptionPlans(data: any, partnerId: any): Promise<GenericResponse<any>> {
        const session = await mongoose.startSession();

        try {
            if (!partnerId)
                return await createResponse(false, null, "User not found");

            const requiredFields = ["referralOrCoupon", "subscriptionplans",
                "planPrice", "totalPayable", "codeType",
            ];
            const fieldDisplayNames: Record<string, string> = {
                referralOrCoupon: "referral or coupon",
                subscriptionplans: "subscription plans",
                planPrice: "subscription plan price",
                totalPayable: "total payable",
                codeType: "Code Type"
            };

            const missingFields = await validateFields(data, requiredFields);

            if (missingFields.length) {
                const readableFields = missingFields.map((field: any) => fieldDisplayNames[field] || field);
                return createResponse(
                    false,
                    null,
                    `${readableFields.join(" and ")} ${readableFields.length > 1 ? "are" : "is"} required`
                );
            }

            const subscriptionDetails = await subscriptionPlansModel.findOne({ _id: new mongoose.Types.ObjectId(data.subscriptionplans) });

            if (!subscriptionDetails)
                return createResponse(false, null, "subscription plans not found");

            session.startTransaction();

            const plansDuration = await getPlansDuration(subscriptionDetails, partnerId);

            let referrerId: any = null;
            let referralcodeid: any = null;
            if (data.codeType == "referral code") {
                const referrer = await Partner.findOne(
                    {
                        referralCode: data.referralOrCoupon,
                        user: { $ne: partnerId }
                    }
                ).select('user');
                if (!referrer)
                    return createResponse(false, null, "Invalid referral code");
                referrerId = referrer?.user;

                const referalDetails = await ReferralCode.findOne({
                    subscriptionPlans: subscriptionDetails._id,
                    status: "active"
                });

                if (!referalDetails)
                    return createResponse(false, null, "Invalid referral code");

                referralcodeid = referalDetails?._id;

            }


            // razorpay code start
            const checkActiveGateway = await activeGateway();
            if (checkActiveGateway === "RAZORPAY") {
                const [razorpayOrder, userInfo] = await Promise.all([
                    initiateRazorpayOrder(data.totalPayable),
                    User.findById(partnerId).select("name email phone").lean(),
                ]);
                if (!razorpayOrder?.amount)
                    return createResponse(false, null, "Something went wronge");

                await addInitiateRazorpaySubscriptionOrder(subscriptionDetails, partnerId, data, razorpayOrder, referralcodeid, referrerId);

                const rzp_authenticate = await rzp_auth();
                const result = {
                    key: rzp_authenticate?.razorpay_key_id,
                    amount: razorpayOrder?.amount,
                    currency: "INR",
                    name: "subscription",
                    description: "User subscription amount",
                    order_id: razorpayOrder?.id,
                    userInfo
                }

                return createResponse(
                    true,
                    {
                        paymentGateway: "RAZORPAY",
                        result
                    },
                    "Your wallet amount is ready. Please complete the payment to add it"
                );
            }
            // razorpay code end
            const gatewayId = await activeGatewayId();
            const merchantOrderId = "BW_SUBORD" + Date.now();
            const userSubscription = await UserSubscription.create({
                userId: partnerId,
                subscriptionPlans: data.subscriptionplans,
                paymentGateway: "PHONEPE",
                gatewayId,
                codeType: data.codeType,
                couponCodeId: data.couponCodeId,
                referralcodeId: referralcodeid,
                referralOrCoupon: data.referralOrCoupon,
                referrerBy: referrerId,
                price: data.planPrice,
                discountAmount: data.discountAmount,
                discountType: data.discountType,
                payableAmount: data.totalPayable,
                merchantOrderId: merchantOrderId,
                startDate: plansDuration?.startDate,
                endDate: plansDuration?.endDate,
                status: 'pending'
            });

            const pendingTransaction = await addSubscriptionPaymentPending(merchantOrderId, userSubscription);
            session.commitTransaction();

            const token = await getPhonePeAccessToken();


            if (!token?.access_token)
                return createResponse(false, null, "Failed to fetch PhonePe access token. Please try again later");

            return await createResponse(true, { merchantOrderId, amount: userSubscription?.payableAmount, phonepeToken: token?.access_token }, "Your subscription is ready. Please complete the payment to reserve it");

        } catch (error: any) {
            logger.error(`${error?.message} Error when purchasing subscription plan`);
            return await createResponse(false, null, error?.message || "Error when purchaseing subscription plans by Partners");
        } finally {
            session.endSession();
        }
    }

    static async bookedCustomers(partnerId: any): Promise<GenericResponse<any>> {
        try {
            // condition are remaing
            const activeCustomerIds = await Booking.find({
                partnerId,
                status: {
                    $in: [
                        "confirmed",
                        "on_the_Way",
                        "arrived",
                        "paused",
                        "awaiting_material",
                        "awaiting_payment",
                        "in_progress",
                    ]
                }
            }).distinct("customerId");

            const bookedCustomer = await Customer.find({ user: { $in: activeCustomerIds } }).populate('user');
            if (bookedCustomer) {
                bookedCustomer.map((customer) => {
                    if (customer?.profile) {
                        customer.profile = `${process.env.BASE_URL}/uploads/profile/${customer.profile}`;
                    }
                })
            }
            return createResponse(true, {
                bookedCustomer
            }, "Customers fetch successfully");
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching customer`);
            return createResponse(false, null, error?.message || "Error when fetching customer");
        }
    }

    static async subscriptionWithoutCode(data: any, partnerId: any): Promise<GenericResponse<any>> {
        try {
            const { subscriptionplans } = data;
            const subscriptionDetails = await subscriptionPlansModel.findOne({ _id: subscriptionplans });
            if (!subscriptionDetails)
                return createResponse(false, null, "subscription plan not found");

            const partner = await User.findOne({ _id: partnerId });
            if (!partner)
                return createResponse(false, null, "User is not found");

            // razorpay code start
            const checkActiveGateway = await activeGateway();
            if (checkActiveGateway === "RAZORPAY") {
                const [razorpayOrder, userInfo] = await Promise.all([
                    initiateRazorpayOrder(subscriptionDetails.price),
                    User.findById(partnerId).select("name email phone").lean(),
                ]);
                if (!razorpayOrder?.amount)
                    return createResponse(false, null, "Something went wronge");

                await addInitiateRazorpaySubscriptionOrder(subscriptionDetails, partnerId, data, razorpayOrder);
                const rzp_authenticate = await rzp_auth();
                const result = {
                    key: rzp_authenticate?.razorpay_key_id,
                    amount: razorpayOrder?.amount,
                    currency: "INR",
                    name: "subscription",
                    description: "User subscription amount",
                    order_id: razorpayOrder?.id,
                    userInfo
                }

                return createResponse(
                    true,
                    {
                        paymentGateway: "RAZORPAY",
                        result
                    },
                    "Your wallet amount is ready. Please complete the payment to add it"
                );
            }
            // razorpay code end


            const plansDuration = await getPlansDuration(subscriptionDetails, partnerId);
            const gatewayId = await activeGatewayId();
            const merchantOrderId = "BW_SUBORD" + Date.now();
            const userSubscription = await UserSubscription.create({
                userId: partnerId,
                gatewayId,
                subscriptionPlans: data.subscriptionplans,
                price: subscriptionDetails.mrp,
                discountAmount: subscriptionDetails.flat_discount,
                discountType: "flat",
                payableAmount: subscriptionDetails.price,
                merchantOrderId: merchantOrderId,
                startDate: plansDuration?.startDate,
                endDate: plansDuration?.endDate,
                paymentGateway: "PHONEPE",
                status: 'pending'
            });


            await addSubscriptionPaymentPending(merchantOrderId, userSubscription);

            // update parter subscritions and referred by  
            await Partner.findOneAndUpdate(
                { user: partnerId },
                { $push: { subscriptionPlans: userSubscription._id } },
                { new: true }
            )

            const token = await getPhonePeAccessToken();

            if (!token)
                return createResponse(false, null, "Failed to fetch PhonePe access token. Please try again later");

            return createResponse(true, { paymentGateway: "PHONEPE", result: { merchantOrderId, amount: userSubscription?.payableAmount, phonepeToken: token?.access_token } }, "Your subscription is ready. Please complete the payment to reserve it");
        } catch (error: any) {
            logger.error(`${error?.message} Error when when purchase subscription plan with code`);
            return createResponse(false, null, error?.message || "Error when purchaseing subscription plans by Partners")
        }
    }

    static async fetchSubscriptionPaymentstatus(data: any, partnerId: any): Promise<GenericResponse<any>> {
        try {
            const { merchantOrderId, phonepeToken } = data;
            const result = await fetchPaymentStatus(phonepeToken, merchantOrderId);

            if (result?.state == "COMPLETED") {
                const updateResponse = await partnerSubscriptionPaymentCompleted(merchantOrderId, result);
                await subscription_plan_added(merchantOrderId);
                return createResponse(true, { status: result?.state, details: updateResponse }, "payment status fetch successfully!");
            }

            if ((result?.state == "FAILED") || (result?.state == "PENDING")) {
                const updateResponse = await partnerSubscriptionPaymentFaild(merchantOrderId, result);
                if (result?.state == "PENDING") {
                    await subscription_plan_pending(merchantOrderId);
                } else {
                    await subscription_plan_failed(merchantOrderId);
                }
                return createResponse(false, { status: result?.state, details: updateResponse }, "payment status fetch successfully!");
            }

            return createResponse(true, { status: result?.state, details: result }, "payment status fetch successfully!");

        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching payment status`);
            return createResponse(false, null, error?.message || "Error when fetching payment status!");
        }
    }

    static async transactionHistory(partnerId: any): Promise<GenericResponse<any>> {
        try {
            let query: any = { partnerId };
            const walletTransaction = await Transaction.find(query)
                .select("amount transactionType paymentFor paymentMethod particular paymentStatus createdAt updatedAt")
                .limit(10)
                .sort({ _id: -1 }).lean();

            let transactionHistory = await Promise.all(
                walletTransaction.map(async (transaction) => {
                    let createdAt = await moment(transaction?.createdAt).tz("Asia/Kolkata").format('DD MMM, YYYY HH:mm:ss');
                    let paymentIcon = transaction?.paymentFor;
                    return { ...transaction, createdAt, paymentIcon }
                })
            )


            return createResponse(true, { "transactionHistory": transactionHistory }, "fetch records successfully !");
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching transaction history`);
            return createResponse(false, null, "something went wronge !");
        }
    }

    static async getReferralHistory(partnerId: any): Promise<GenericResponse<any>> {
        try {
            const result = await getReferralHistory(partnerId);
            return result;
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching referral history`);
            return createResponse(false, null, "something went wronge !");
        }
    }

    static async getSubscriptionPlanStatus(partnerId: any): Promise<GenericResponse<any>> {
        try {
            const result = await fetchingSubscriptionPlans(partnerId);
            return createResponse(true, result, "Subscription plans fetch successfuly");
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetch subscription plan`);
            return createResponse(false, null, "Error when fetching subscription plan details");
        }
    }

    static async refreshSubscriptionPaymentStatus(partnerId: any, merchantOrderId: any): Promise<GenericResponse<any>> {
        try {
            const token = await getPhonePeAccessToken();
            if (!token)
                return createResponse(false, null, "PhonePe access token getting issue");

            const result = await fetchPaymentStatus(token?.access_token, merchantOrderId);
            if (result?.state == "COMPLETED") {
                const updateResponse = await partnerSubscriptionPaymentCompleted(merchantOrderId, result);
                return createResponse(true, { status: result?.state, details: updateResponse }, "payment status fetch successfully!");
            }

            if ((result?.state == "FAILED") || (result?.state == "PENDING")) {
                const updateResponse = await partnerSubscriptionPaymentFaild(merchantOrderId, result);
                return createResponse(false, { status: result?.state, details: updateResponse }, "payment status fetch successfully!");
            }

            return createResponse(true, { status: result?.state, details: result }, "payment status fetch successfully!");

        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching payment status`);
            return createResponse(false, null, error?.message || "Error when fetching payment status!");
        }

    }

    static async updateCategorySubcategoryAndService(data: any, partnerId: any): Promise<GenericResponse<any>> {
        try {
            const { category, categoryType, services } = data;
            if ((category.length == 0) || (categoryType.length == 0) || (services.length == 0)) {
                return createResponse(false, null, "Category ,Subcategory and service are required");
            }

            const result = await Partner.findOneAndUpdate(
                { user: partnerId },
                {
                    $set: {
                        category,
                        categoryType,
                        services
                    }
                },
                { new: true } // return updated doc instead of old
            )

            const profile = await getProfile(partnerId);
            return createResponse(true, { user: profile?.user, partner: profile?.partner }, "Update Partner Category Subcategory and service");
        } catch (error: any) {
            logger.error(`${error?.message} Error when updating category , subcategory and service`);
            return createResponse(false, null, error?.message || "Error when updating Category Subcategory and service");
        }
    }

    static async activeJobs(partnerId: any, lastId: any, limit: string, searchtext: string): Promise<GenericResponse<any>> {
        try {
            const bookingStatus = await bookingStatusList("upcomming");
            const query: any = { status: { $in: ["open", "confirmation_Pending", "confirmed"] } };
            if (lastId) {
                query._id = { $lt: new mongoose.Types.ObjectId(lastId) };  // get jobs older than last loaded one
            }

            const ongoingJobs: any = await getPartnerJobDetailsList(query, limit, partnerId, searchtext);

            const ongoingJobsN = await Promise.all(
                ongoingJobs.allJobs.map(async (job: any) => {
                    let tabdetails = await getJobCurrentTab(job.status);
                    return { ...job, tabName: tabdetails?.tabName, bookingStatus: tabdetails?.bookingStatusArr }
                })
            )

            return createResponse(true, { activeJobs: ongoingJobsN, lastId: ongoingJobs?.lastId, bookingStatus }, "Jobs list fetch successfully !");
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching active jobs`);
            return createResponse(false, null, error?.message || "Error when fetching jobs");
        }
    }

    static async addJobBid(data: any, partnerId: any): Promise<GenericResponseCode<any>> {
        const session = await mongoose.startSession();
        try {
            const { jobId, price, availableTime, message } = data;

            if (!jobId || !price || !availableTime) {
                return createResponseStatus(400, null, "All fields are required!");
            }

            const jobBid = await Bid.findOne({ partnerId, jobId });

            // return createResponseStatus(409, null, "You’ve already placed a bid on this job");

            // checking here job found or not
            const jobDetails = await Job.findById(jobId).session(session);
            if (!jobDetails) {
                await session.abortTransaction();
                session.endSession();
                return createResponseStatus(400, null, "Job not found!");
            }

            // cheching here wallet balance 
            const wallets: any = await updatePartnerWalletAmount(partnerId);
            let currentWalletAmount = wallets.data.wallet_amount;
            if (jobBid) {
                currentWalletAmount = currentWalletAmount + jobBid.bidCharge;
            }

            const checkBidCharge = (await getBidingCharge(price)).bidChargeFixed;
            if (!wallets || Number(currentWalletAmount) < Number(checkBidCharge)) {
                return createResponseStatus(409, null, "Insufficient wallet balance. Please add funds to continue.");
            }

            // delete old bid record
            if (jobBid) {
                const getWallet = await Wallet.findOne({ bidId: jobBid?._id, partnerId, jobId });
                const [adminTransactions, transactionRes] = await Promise.all([
                    Wallet.deleteMany({ bidId: jobBid?._id, partnerId, jobId }),
                    Transaction.deleteMany({ merchantOrderId: getWallet?.merchantOrderId })
                ])
            }

            await session.startTransaction();



            const partnerIdStr = partnerId.toString();
            const bidObj = {
                jobId,
                partnerId: partnerIdStr,
                bidCharge: checkBidCharge,
                bidPaymentStatus: "COMPLETED",
                price,
                customerId: jobDetails.customerId,
                availableTime,
                message
            };

            const addBidRes = await Bid.findOneAndUpdate(
                { jobId, partnerId: partnerIdStr },
                { $set: bidObj },
                { upsert: true, new: true, session }
            );

            const applicantsCount = await Bid.countDocuments({
                jobId,
                status: { $in: ["pending", "accepted"] }
            }).session(session);

            await Job.findByIdAndUpdate(
                jobId,
                {
                    $set: { applicants: applicantsCount },
                    $addToSet: { bidPartnerIds: partnerIdStr }
                },
                { new: true, session }
            );

            await session.commitTransaction();
            session.endSession();
            await payBidingPayment(addBidRes);
            const notification_res = await preparePushNotification("bid_added", jobDetails?.customerId.toString(), jobDetails?._id.toString());
            logger.info(`${partnerId} Partner bid applied successfully`);
            return createResponseStatus(200, { bid: addBidRes }, "Job bid applied successfully!");
        } catch (error: any) {
            await session.abortTransaction();
            session.endSession();
            console.error("Error in addJobBid:", error);
            logger.error(`${error?.message} Error when partner appy bid on job`);
            return createResponseStatus(500, null, error?.message || "Error applying bid on job.");
        }
    }


    static async getJobDetails(jobId: any, partnerId: any): Promise<GenericResponse<any>> {
        try {
            const upcommingStatus: any[] = ["pending", "open", "confirmation_Pending", "confirmed"];
            const ongoingStatus: any[] = ["on_the_Way", "arrived", "awaiting_material", "awaiting_payment", "in_progress", "paused"];
            const addExtraWork: any[] = ["arrived", "awaiting_material", "awaiting_payment", "in_progress", "paused"];
            const previousStatus: any[] = ["completed", "cancelled"];
            const bidStatus: any[] = ["completed", "cancelled", "expired"];
            const [jobDetails, jobBid, bookingDetails] = await Promise.all([
                getJobDetails(jobId),
                Bid.findOne({ jobId, partnerId }).select("availableTime message price status"),
                Booking.findOne({ jobId, partnerId }).
                    select("status paymentStatus extraWorkHistory basePrice extraWorkAmount totalDueAmount totalPaid totalRefund totalAmount job_startAt job_endAt booking_date job_time")
                    .populate("extraWorkHistory", "status workTitle amount cancellation_reason paymentStatus timeTaken workDescription")
                    .populate("customerId", "_id name email phone")
            ]);

            let jobDetailsN: any = jobDetails;
            jobDetailsN.price = bookingDetails?.basePrice ? bookingDetails?.basePrice : jobDetailsN.price;
            let tabName: string = "";
            let bookingStatus: any[] = [];
            let jobStatus: string = jobDetailsN.status;
            let isActiveBidEditCancel: boolean = false;
            let isActiveAddExtraWork: boolean = false;
            let isActiveMarkComplete: boolean = false;
            let isContactDetails: boolean = false;
            if (jobStatus == "open") {
                isActiveBidEditCancel = true;
            }
            if (upcommingStatus.includes(jobDetailsN.status)) {
                tabName = "upcomming";
                if (jobDetailsN.status == "confirmed") {
                    isContactDetails = true;
                    bookingStatus = await bookingStatusList("upcomming", jobDetailsN?.status);
                }
            } else if (ongoingStatus.includes(jobDetailsN.status)) {
                tabName = "ongoing";
                if (addExtraWork.includes(jobDetailsN.status)) {
                    isActiveAddExtraWork = true;
                }
                if (jobDetailsN.status == "in_progress") {
                    isActiveMarkComplete = true;
                }
                isContactDetails = true;
                bookingStatus = await bookingStatusList("ongoing", jobDetailsN?.status);
            } else if (previousStatus.includes(jobDetailsN.status)) {
                tabName = "previous";
            } else {
                tabName = "bid";
            }
            // if (bookingDetails) {
            //     await checkBookingPaymentStatus(bookingDetails?._id);
            // }

            const declinedIds = (await Bid.find({ partnerId, status: "declined" }).distinct("jobId"))
                .map(id => id.toString());
            if (declinedIds.includes(jobDetailsN?._id.toString())) {
                jobDetailsN.status = "declined";
                isActiveMarkComplete = false;
                isActiveAddExtraWork = false;
                isActiveBidEditCancel = false;
                isContactDetails = false;
                bookingStatus = [];
            }

            jobDetailsN.status_name = await getStatusDisplayName(jobDetailsN?.status);

            const minMaxPriceRes = await getMinAndMaxPrice(jobDetailsN?.price);
            if (minMaxPriceRes) {
                jobDetailsN.min = minMaxPriceRes.min;
                jobDetailsN.max = minMaxPriceRes.max;
            }
            const bidPrice = jobBid != null ? jobBid?.price : jobDetailsN?.price;
            const portalCharge: any = await calculatePortalCharge(jobDetailsN?.serviceId?.partnerCommissionRate, bidPrice);
            portalCharge.customer_budget = jobDetailsN?.price;
            let job_booking_slot = await timeRange(jobDetailsN?.job_time);
            let bookingday = await formatDateOrDay(jobDetailsN?.job_date);
            let partner_scheduled_slot: string = "";
            if (jobBid) {
                partner_scheduled_slot = await timeRange(jobBid?.availableTime);
            }

            return createResponse(true,
                {
                    job: jobDetailsN,
                    bid: jobBid,
                    bookingDetails,
                    tabName,
                    jobStatus: jobDetailsN.status,
                    bookingStatus,
                    isActiveBidEditCancel,
                    isActiveAddExtraWork,
                    isActiveMarkComplete,
                    adjustAmountDetails: portalCharge,
                    bookingday,
                    job_booking_slot,
                    partner_scheduled_slot,
                    isContactDetails
                }, "Job details fetch successfully !");
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching job details`);
            return createResponse(false, null, error?.message || "Error when fetching job details");
        }
    }

    static async bidCancel(data: any, partnerId: any): Promise<GenericResponse<any>> {
        try {
            const { bidId, reson_for_cancel } = data;

            const res = await Bid.findOne({ _id: bidId, partnerId });
            if (!res)
                return createResponse(true, null, "Request bid not found");

            if (res?.status == "accepted")
                return createResponse(false, null, "Your bid has been accepted. If you wish to cancel, please cancel the job");

            if (res?.status == "cancelled")
                return createResponse(false, null, "You have already cancelled this bid.");

            await bidingPaymentInWallet(res);

            res.status = "cancelled";
            res.reson_for_cancel = reson_for_cancel;
            const bid = await res.save();


            const applicantsIds = await Bid.find(
                {
                    jobId: res?.jobId,
                    status: { $in: ["pending", "declined", "accepted"] }
                }
            ).select("partnerId").lean();

            const partnerIds = applicantsIds.map(bid => bid.partnerId);

            await Job.findByIdAndUpdate(
                res?.jobId,
                {
                    $set: { applicants: partnerIds.length, bidPartnerIds: partnerIds }
                },
                { new: true }
            );

            const [partnerCancel, customerGetUpdate] = await Promise.all([
                preparePushNotification("cancelled", res?.partnerId.toString(), res?.jobId.toString()!),
                preparePushNotification("bid_cancelled", res?.customerId.toString(), res?.jobId.toString()!)
            ])
            return createResponse(true, { bid }, "Bid Cancel Successfully !");
        } catch (error: any) {
            logger.error(`${error?.message} Error when Bid Cancelation`);
            return createResponse(false, null, error?.message || "Error when Bid Cancelation!");
        }
    }

    static async getJobStartVerificationPhone(jobId: any): Promise<GenericResponseCode<any>> {
        try {
            const jobDetails: any = await Job.findOne({ _id: jobId, status: "confirmed" }).select("contact_number").populate("customerId", "phone");
            if (!jobDetails)
                return createResponseStatus(400, null, "Job or Customer details not found");

            const phoneNumber = jobDetails?.contact_number ? jobDetails?.contact_number : jobDetails?.customerId?.phone;
            return createResponseStatus(200, { phoneNumber }, "Please verify the customer's phone number to start the job. !");
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching job start verification phone number`);
            return createResponseStatus(500, null, error?.message || "Something went wrong while fetching custome phone number.")
        }
    }

    static async updateJobStartVerificationStatus(data: any): Promise<GenericResponseCode<any>> {
        try {
            const { jobId, isPhoneVerified } = data;
            if ((!jobId))
                return createResponseStatus(400, null, "JobId is required");

            const jobDetails: any = await Job.findOne({ _id: jobId });
            if (!jobDetails)
                return createResponseStatus(400, null, "Job or Customer details not found");

            if (jobDetails?.status == "in_progress")
                return createResponseStatus(409, null, "This job has already been started");

            if (isPhoneVerified == false)
                return createResponseStatus(401, null, "Job start verification from the customer is still pending.");

            const [job, booking] = await Promise.all([
                Job.findOneAndUpdate({ _id: jobDetails?._id.toString() }, { $set: { status: "in_progress" } }, { new: true }),
                Booking.findOneAndUpdate({ _id: jobDetails?.bookingId.toString() }, { $set: { status: "in_progress", job_startAt: new Date() } }, { new: true })
            ])

            return createResponseStatus(200, { job, booking }, "Job start successfully");
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching custome phone number.`);
            return createResponseStatus(500, null, error?.message || "Something went wrong while fetching custome phone number.");
        }
    }

    static async addExtraWork(data: any): Promise<GenericResponseCode<any>> {
        try {
            const jobDetails = await Job.findOne({ bookingId: data?.bookingId });
            const jobBooking = await Booking.findOne({ _id: data?.bookingId }).select('basePrice');
            if (!jobDetails)
                return createResponseStatus(400, null, "Booking details not found");


            if (jobDetails?.otp != data?.otp) {
                return createResponseStatus(409, null, "Invalid OTP. Request the customer to share the correct code");
            }
            jobDetails.otp = await generateOTP();
            jobDetails.save();

            const checkconfirmedWork = await ExtraWork.findOne({
                jobId: jobDetails?._id,
                bookingId: jobDetails?.bookingId,
                workTitle: data?.workTitle,
                status: "confirmed"
            });
            if (checkconfirmedWork)
                return createResponseStatus(409, { job: checkconfirmedWork }, "This work is already added and payment is done");

            const workObj = {
                jobId: jobDetails?._id,
                ...data
            }

            const response = await ExtraWork.findOneAndUpdate(
                {
                    jobId: jobDetails?._id,
                    bookingId: jobDetails?.bookingId,
                    workTitle: data?.workTitle,
                    status: "confirmed"
                },
                { $set: workObj },
                { upsert: true, new: true });

            let extraworkArr = await ExtraWork.find({ jobId: jobDetails?._id, bookingId: data?.bookingId }).select("_id amount");
            let idsAsString = extraworkArr.map(element => element._id.toString());

            const extratotalAmount = extraworkArr.reduce((sum, item) => sum + (item.amount || 0), 0);


            /*
            const [booking, jobUpdate] = await Promise.all([
                Booking.findOneAndUpdate({ _id: data?.bookingId },
                    { $set: { extraWorkHistory: idsAsString, paymentStatus: "PENDING", status: "paused" } },
                    { upsert: true, new: true }
                ).populate("extraWorkHistory", "amount paymentStatus status timeTaken workDescription workTitle"),
                Job.findOneAndUpdate({ bookingId: data?.bookingId }, { status: "paused" })
            ])
            const checkExtraWorkPayment = await checkBookingPaymentStatus(data?.bookingId); */
            const total_amount = jobBooking?.basePrice ? jobBooking?.basePrice + extratotalAmount : extratotalAmount;
            const [booking] = await Promise.all([
                Booking.findOneAndUpdate({ _id: data?.bookingId },
                    { $set: { extraWorkHistory: idsAsString, extraWorkAmount: extratotalAmount, totalAmount: total_amount } },
                    { upsert: true, new: true }
                ).populate("extraWorkHistory", "amount paymentStatus status timeTaken workDescription workTitle")
            ])

            return createResponseStatus(200, { booking, jobDetails }, "Work added successfully !");
        } catch (error: any) {
            logger.error(`${error?.message} Error when partner add extra work`);
            return createResponseStatus(500, null, error?.message || "Something went wrong while adding work.");
        }
    }

    static async ongoingJobs(partnerId: any, lastId: any, limit: string, searchtext: string): Promise<GenericResponse<any>> {
        try {

            const ongoingStatus: any[] = ["awaiting_material", "awaiting_payment", "in_progress", "paused"];
            // const updateActive = await updateActiveJobs(partnerId);
            const bookingStatus = await bookingStatusList("ongoing");
            const query: any = { status: { $in: ["on_the_Way", "arrived", "paused", "awaiting_material", "awaiting_payment", "in_progress"] } };
            if (lastId) {
                query._id = { $lt: new mongoose.Types.ObjectId(lastId) }; // get jobs older than last loaded one
            }
            const ongoingJobs: any = await getPartnerJobDetailsList(query, limit, partnerId, searchtext);



            const ongoingJobsN = await Promise.all(
                ongoingJobs.allJobs.map(async (job: any) => {
                    let tabdetails = await getJobCurrentTab(job.status);
                    let isActiveMarkComplete: boolean = false;
                    if (ongoingStatus.includes(job.status)) {
                        isActiveMarkComplete = true;
                    }
                    return { ...job, isActiveMarkComplete, tabName: tabdetails?.tabName, bookingStatus: tabdetails?.bookingStatusArr }
                })
            )

            return createResponse(true, { ongoingJobs: ongoingJobsN, lastId: ongoingJobs?.lastId, bookingStatus }, "Jobs list fetch successfully !");
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching ongoing jobs`);
            return createResponse(false, null, error?.message || "Error when fetching jobs");
        }
    }


    static async previousJobs(partnerId: any, lastId: any, limit: string, searchtext: string): Promise<GenericResponse<any>> {
        try {

            const query: any = { status: { $in: ["completed", "cancelled"] } };
            if (lastId) {
                query._id = { $lt: new mongoose.Types.ObjectId(lastId) }; // get jobs older than last loaded one
            }
            const ongoingJobs: any = await getPartnerJobDetailsList(query, limit, partnerId, searchtext);

            const ongoingJobsN = await Promise.all(
                ongoingJobs.allJobs.map(async (job: any) => {
                    let tabdetails = await getJobCurrentTab(job.status);
                    return { ...job, tabName: tabdetails?.tabName, bookingStatus: tabdetails?.bookingStatusArr }
                })
            )

            return createResponse(true, { previousJobs: ongoingJobsN, lastId: ongoingJobs?.lastId }, "Jobs list fetch successfully !");

        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching previous jobs`);
            return createResponse(false, null, error?.message || "Error when fetching jobs");
        }
    }


    static async bidingJobs(partnerId: any, lastId: any, limit: string, searchtext: string): Promise<GenericResponse<any>> {
        try {

            const bidJobIds = await Bid.find({ status: { $in: ["accepted", "pending", "cancelled", "declined"] }, partnerId })
                .distinct("jobId"); // Directly get unique jobIds instead of map + Set

            const query: any = {
                _id: { $in: bidJobIds }
            };

            if (lastId) {
                query._id = {
                    $in: bidJobIds,
                    $lt: new mongoose.Types.ObjectId(lastId)
                };
            }
            const ongoingJobs: any = await getPartnerJobDetailsList(query, limit, partnerId, searchtext);

            const ongoingJobsN = await Promise.all(
                ongoingJobs.allJobs.map(async (job: any) => {
                    let tabdetails = await getJobCurrentTab(job.status);
                    return { ...job, tabName: tabdetails?.tabName, bookingStatus: tabdetails?.bookingStatusArr }
                })
            )
            return createResponse(true, { bidingJob: ongoingJobsN, lastId: ongoingJobs?.lastId }, "Jobs list fetch successfully !");

        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching biding jobs`);
            return createResponse(false, null, error?.message || "Error when fetching jobs");
        }
    }

    static async updateIdentityConfirmationStatus(partnerId: any, update_identity: string): Promise<GenericResponseCode<any>> {
        try {
            const user = await User.findOne(partnerId);
            if (!user)
                return createResponseStatus(400, null, "User not found");
            let waitingForApprovalIn: boolean = true;
            if (update_identity == "yes") {
                waitingForApprovalIn = false;
            }
            user.isActive = false;
            await user.save();
            const partner = await Partner.findOneAndUpdate({ user: partnerId }, { $set: { kycStatus: "pending", waitingForApproval: waitingForApprovalIn } })
            const profile = await getProfile(partnerId);
            return createResponseStatus(200, { user: profile?.user, partner: profile?.partner }, "update identity confirmation update successfully");
        } catch (error: any) {
            logger.error(`${error?.message} Error when updating identity status`);
            return createResponseStatus(500, null, error?.message || "Error when updating identity status")
        }
    }

    static async cancelExtraWork(workId: any, partnerId: any): Promise<GenericResponseCode<any>> {
        try {
            const workdetails = await ExtraWork.findOne({ _id: workId });
            const bookingDetails = await Booking.findOne({ _id: workdetails?.bookingId });
            if (bookingDetails?.status == "completed")
                return createResponseStatus(409, null, "Your job has been completed. Cancellations are no longer allowed");

            if (!workdetails)
                return createResponseStatus(400, null, "Work details is not found");
            if (workdetails.status == "cancelled")
                return createResponseStatus(409, null, "Work is already cancelled");

            if (workdetails.paymentStatus == "COMPLETED") {
                // const resrefundWorkPayment = await refundWorkPayment(workId);
                const checkExtraWorkPayment = await checkBookingPaymentStatus(workdetails?.bookingId);
                return createResponseStatus(200, null, "work details cancel successfully");
            }
            workdetails.status = "cancelled";
            workdetails.paymentStatus = "cancelled";
            workdetails.cancellation_reason = "Cancelled by worker as the customer did not grant permission this work.";
            await workdetails.save();
            const checkExtraWorkPayment = await checkBookingPaymentStatus(workdetails?.bookingId);
            return createResponseStatus(200, { checkExtraWorkPayment }, "Work Cancel successfully");
        } catch (error: any) {
            logger.error(`${error.message} Error when cancel extra work`);
            return createResponseStatus(500, null, error?.message || "Error when cancel work");
        }
    }

    static async verifyExtraWorkPayment(bookingId: any): Promise<GenericResponseCode<any>> {
        try {
            const checkExtraWorkPayment = await checkBookingPaymentStatus(bookingId);
            const bookingDetails = await Booking.findOne({ _id: bookingId })
                .select("booking_date job_time basePrice partner_availability_time location paymentStatus status extraWorkAmount totalDueAmount totalPaid totalRefund totalAmount extraWorkHistory")
                .populate("extraWorkHistory", "workTitle amount status paymentStatus");
            return createResponseStatus(200, { bookingDetails }, "Extra Work Payment details fetch successfully!");
        } catch (error: any) {
            logger.error(`${error.message} Error when verify extra work payment`);
            return createResponseStatus(500, null, error?.message || "Error when fetching Extra work Payment details");
        }
    }

    static async getMatchingJobs(partnerId: any, lastId: any, limit: any, searchtext: string): Promise<GenericResponseCode<any>> {
        try {

            const bidJobIds = await Bid.find({ status: { $in: ["pending", "accepted", "cancelled"] }, partnerId })
                .distinct("jobId").lean(); // Directly get unique jobIds instead of map + Set


            const query: any = { status: "open" };

            if (bidJobIds?.length || lastId) {
                query._id = {};

                if (bidJobIds?.length) {
                    query._id.$nin = bidJobIds;
                }

                if (lastId) {
                    query._id.$lt = new mongoose.Types.ObjectId(lastId);
                }
            }
            const ongoingJobs: any = await getPartnerJobDetailsList(query, limit, partnerId, searchtext);

            const ongoingJobsN = await Promise.all(
                ongoingJobs.allJobs.map(async (job: any) => {
                    let tabdetails = await getJobCurrentTab(job.status);
                    return { ...job, tabName: tabdetails?.tabName, bookingStatus: tabdetails?.bookingStatusArr }
                })
            )

            return createResponseStatus(200, { matchingJobs: ongoingJobsN, lastId: ongoingJobs?.lastId }, "Jobs list fetch successfully !");

        } catch (error: any) {
            logger.error(`${error.message} Error when fetching matching jobs`);
            return createResponseStatus(500, null, error?.message || "Error when fetching matching jobs");
        }
    }

    static async getLanguages(type: string): Promise<GenericResponseCode<any>> {
        try {
            const language = await getJsonData(type, "partner");
            return createResponseStatus(200, { [type]: language }, "fetching language successfully");
        } catch (error: any) {
            logger.error(`${error.message} Error when fetching selected language`);
            return createResponseStatus(500, null, error.message || "Failed to fetching language")
        }
    }

    static async getLanguageList(): Promise<GenericResponseCode<any>> {
        try {
            const data = await languagesList();
            return createResponseStatus(200, data, "fetching language list successfully");
        } catch (error: any) {
            logger.error(`${error.message} Error when fetching language list`);
            return createResponseStatus(500, null, error.message || "Failed to update partner");
        }
    }

    static async updateLanguageCode(partnerId: any, languageCode: string): Promise<GenericResponseCode<any>> {
        try {
            const data = await languagesList();
            const exists = data.some(item => item.code === languageCode);
            if (!exists)
                return createResponseStatus(400, null, "language not found");

            const update = await Partner.findOneAndUpdate({ user: partnerId }, { $set: { languageCode } });
            const getpartner = await getProfile(partnerId);

            return createResponseStatus(200, { user: getpartner?.user, partner: getpartner?.partner }, "language update successfully ! ");
        } catch (error: any) {
            logger.error(`${error.message} Error when update language flag`);
            return createResponseStatus(500, null, error.message || "Failed to update language");
        }
    }

    static async updateBookingStatus(partnerId: any, data: any, files: { [fieldname: string]: Express.Multer.File[] }): Promise<GenericResponseCode<any>> {
        try {
            const { bookingId, status } = data;
            const checkId = await Booking.findOne({ _id: bookingId, partnerId: partnerId });
            if (!checkId)
                return createResponseStatus(400, null, "Booking not found");

            if (checkId?.status === status)
                return createResponseStatus(400, null, `${status} status has already been updated`);
            // if (status == "completed") {
            //     await addBookingAmountWallet(partnerId, bookingId, status);
            // }

            if (status == "cancelled") {
                const jobDetails = await Job.findOne({ _id: checkId?.jobId });
                const checkBookingCancel = await checkBookingCancelRequest(jobDetails);
                if (checkBookingCancel == false)
                    return createResponseStatus(400, null, "Cancellations are allowed up to 2 hours before the scheduled booking time.");

                const bidDetails = await Bid.findOne({ partnerId, jobId: checkId?.jobId });
                await bidingPaymentInWallet(bidDetails);
            }

            if (["in_progress", "completed"].includes(status)) {
                const getJobOtp = await Job.findOne({ _id: checkId?.jobId }).select("otp");
                if (getJobOtp?.otp != data?.otp) {
                    return createResponseStatus(409, null, "Invalid OTP. Request the customer to share the correct code");
                }
            }

            let updateObj: any = {

            };
            if (status == "completed") {
                updateObj.paymentImage = files.paymentImage[0] ? files.paymentImage[0].filename : null;
                updateObj.paymentMode = data?.paymentMode;
                updateObj.paymentStatus = "COMPLETED";
                updateObj.status = status;
            } else {
                updateObj.status = status;
            }

            const resOTP = await generateOTP();

            const [updateBooking, updateJob, bookingStatus] = await Promise.all([
                Booking.findOneAndUpdate({ _id: bookingId }, { $set: updateObj }, { new: true }).select("status job_date title paymentStatus"),
                Job.findOneAndUpdate({ _id: checkId.jobId }, { $set: { status: status, otp: resOTP } }, { new: true }).select("status title description contact_email contact_name contact_number"),
                addBookingStatus(bookingId, checkId.jobId, status, data?.latitude, data?.longitude),
            ])

            if (["completed", "cancelled"].includes(status)) { //cancelled
                if (updateBooking?.customerId) {
                    await updateWalletAmount(updateBooking?.customerId.toString());
                }
                await job_complete(bookingId);
                await job_complete_partner(bookingId);
                await updatePartnerWalletAmount(partnerId);
                // ExtraWork.findOneAndUpdate({ bookingId: bookingId, status: "confirmed" }, { $set: { paymentStatus: "COMPLETED" } }, { new: true })
            }

            const customerId = checkId.customerId?.toString() as string;
            const notification_res = await preparePushNotification(status, customerId, checkId.jobId.toString());
            logger.info(`BookingId-${updateBooking?._id} partnerId-${partnerId} Booking status ${status} update successfully`);
            return createResponseStatus(200, { job: updateJob, booking: updateBooking }, "Status update successfully !");
        } catch (error: any) {
            logger.error(`${error.message} Error when update booking status`);
            return createResponseStatus(500, null, error.message || "Error when updating booking status code");
        }
    }

    static async jobBookmark(partnerId: any, data: any): Promise<GenericResponseCode<any>> {
        try {
            if (!partnerId)
                return createResponseStatus(400, null, "user is not round");

            if ((!data.jobId) || (!data.operation))
                return createResponseStatus(400, null, "Job id or operation is required");

            const checkBookmark = await Bookmark.findOne({
                partnerId,
                jobId: data.jobId
            });

            if ((data.operation == "remove") && (!checkBookmark))
                return createResponseStatus(409, null, "This job is not bookmarked or has been removed");

            let response: any = "";
            if (data.operation == "add") {
                response = await Bookmark.create({
                    partnerId,
                    jobId: data.jobId
                });
            } else {
                response = await Bookmark.deleteOne({
                    partnerId,
                    jobId: data.jobId
                });
            }

            return createResponseStatus(200, null, `Job bookmark ${data.operation} successfully`);
        } catch (error: any) {
            logger.error(`${error.message} Error when job bookmar`);
            return createResponseStatus(500, null, error.message || "Error when job bookmark");
        }
    }

    static async getBookmarklist(partnerId: any, lastId: any, limit: any, searchtext: string): Promise<GenericResponseCode<any>> {
        try {
            const bookmarklistIds = await Bookmark.find({ partnerId }).distinct("jobId");

            const query: any = {
                _id: { $in: bookmarklistIds }
            };

            if (lastId) {
                query._id = {
                    $in: bookmarklistIds,
                    $lt: new mongoose.Types.ObjectId(lastId)
                };
            }

            const ongoingJobs: any = await getPartnerJobDetailsList(query, limit, partnerId, searchtext);

            return createResponseStatus(200, { bookmarkJob: ongoingJobs.allJobs, lastId: ongoingJobs?.lastId }, "bookmark Jobs list fetch successfully !");

        } catch (error: any) {
            logger.error(`${error.message} Error when fetching bookmark job`);
            return createResponseStatus(500, null, error.message || "Error when fetching bookmark job");
        }
    }

    static async getAllJobs(partnerId: any, filters: any): Promise<GenericResponseCode<any>> {
        try {
            const { lastId, searchText, limit, distanceRange, timeSlot, priceRange } = filters;
            const query: any = { status: { $in: ["open", "confirmation_Pending", "confirmed", "on_the_Way", "arrived", "paused", "awaiting_material", "awaiting_payment", "in_progress", "completed", "cancelled"] } };
            if (lastId) {
                query._id = { $lt: new mongoose.Types.ObjectId(lastId) };  // get jobs older than last loaded one
            }

            const jobs: any = await getPartnerJobDetailsListWithFilters(query, limit, partnerId, searchText, distanceRange, timeSlot, priceRange);

            const allJobsTabName = await Promise.all(
                jobs.allJobs.map(async (job: any) => {
                    let tabdetails = await getJobCurrentTab(job.status);
                    return { ...job, tabName: tabdetails?.tabName, bookingStatus: tabdetails?.bookingStatusArr }
                })
            )

            return createResponseStatus(200, { activeJobs: allJobsTabName, lastId: jobs?.lastId }, "Jobs list fetch successfully !");

        } catch (error: any) {
            logger.error(`${error.message} Error when fetching all jobs`);
            return createResponseStatus(500, null, error.message || "Error when fetching job");
        }
    }

    static async getFilters(partnerId: any): Promise<GenericResponseCode<any>> {
        try {
            const query: any = { status: { $in: ["open", "confirmation_Pending", "confirmed", "on_the_Way", "arrived", "paused", "awaiting_material", "awaiting_payment", "in_progress", "completed", "cancelled"] } };
            const partner = await Partner.findOne({ user: partnerId }).select("serviceAreaDistance");
            const pertnerRange: number = partner?.serviceAreaDistance as number;
            const getPriceRange = await getPartnerJobMinMaxRange(query, partnerId);
            const [services, filterKmRange] = await Promise.all([
                Partner.findOne({ user: partnerId }).select("skills.serviceId skills.skill category categoryType").populate("category", "_id name").populate("categoryType", "_id name"),
                createKmRanges(0, pertnerRange, 10, "Km")
            ])
            const timeSlot = [{ key: "12:00", value: "Morning(6AM-12PM)" }, { key: "18:00", value: "Afternoo(12PM-6PM)" }, { key: "23:59", value: "Evening(6PM-12AM)" }];
            return createResponseStatus(200, { distanceRange: filterKmRange, timeSlot, priceRange: getPriceRange?.priceRangeArra }, "fetch all filter successfully");
        } catch (error: any) {
            logger.error(`${error.message} Error when fetching all filter`);
            return createResponseStatus(500, null, error.message || "Error when fetching all filters");
        }
    }

    static async getWalletAmount(partnerId: any): Promise<GenericResponseCode<any>> {
        try {
            const response = await updatePartnerWalletAmount(partnerId);
            const data = response?.data;
            return createResponseStatus(200, {
                wallet_amount: data.wallet_amount,
                total_income: data.total_income,
                totalWithdrawAmount: data?.totalWithdrawAmount,
                totalWithdrawRequests: data?.totalWithdrawRequests
            }, "Wallet amount fetch succesfully");
        } catch (error: any) {
            logger.error(`${error.message} Error when fetching wallet amount`);
            return createResponseStatus(500, null, error.message || "Error when fetching wallet amount");
        }
    }

    static async walletTransactionHistory(partnerId: any): Promise<GenericResponseCode<any>> {
        try {
            const walletdetails = await Wallet.find({ partnerId });
            return createResponseStatus(200, { transactionHistory: walletdetails }, "transaction details fetch successfully");
        } catch (error: any) {
            logger.error(`${error.message} Error when fetching wallet transaction history`);
            return createResponseStatus(500, null, error.message || "Error when fetching transaction history");
        }
    }

    static async addWithdrawRequest(partnerId: any, payload: any): Promise<GenericResponseCode<any>> {
        try {
            const { requested_money, settlementAccountId } = payload;
            if (!requested_money && !settlementAccountId)
                return createResponseStatus(400, null, "requested_money are required");

            const checkWalletAmount = await Partner.findOne({ user: partnerId }).select("wallet_amount");

            if (checkWalletAmount?.wallet_amount! < requested_money)
                return createResponseStatus(400, null, "Withdrawal amount exceeds your wallet balance");

            const res = await withdrawRequest(partnerId, requested_money, settlementAccountId);

            return createResponseStatus(200, { withdraw: res?.data?.withdraw }, "withdraw request added successfully");
        } catch (error: any) {
            logger.error(`${error.message} Error when adding withdraw request`);
            return createResponseStatus(500, null, error.message || "Error when adding withdraw money request")
        }
    }

    static async todaySummary(partnerId: any): Promise<GenericResponseCode<any>> {
        try {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);

            const todayAcceptJobCount = await Bid.countDocuments({
                status: "accepted",
                partnerId,
                updatedAt: { $gte: startOfDay, $lte: endOfDay }
            });

            const result = await Booking.aggregate([
                {
                    $match: {
                        partnerId,
                        paymentStatus: "COMPLETED", // सिर्फ completed payments
                        status: "completed",
                        updatedAt: { $gte: startOfDay, $lte: endOfDay } // आज की date filter
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalAmount: { $sum: "$totalAmount" } // amount field का sum
                    }
                }
            ]);
            const ratingDetails = await serviceRatingDetails(null, partnerId);
            const countWalletAmount = result.length > 0 ? (result[0].totalAmount).toFixed(0) : 0;
            return createResponseStatus(200, { acceptedJob: todayAcceptJobCount, earning_today: parseInt(countWalletAmount), job_rating: ratingDetails?.averageRating, total_review: ratingDetails?.review }, "fetch today summary successfully");
        } catch (error: any) {
            logger.error(`${error.message} Error when fetching today summary`);
            return createResponseStatus(500, null, error.message || "Error when fetching today's summary");
        }
    }

    static async getNotifications(partnerId: any): Promise<GenericResponse<any>> {
        try {
            const result = await Notification.aggregate([
                { $match: { userId: partnerId } },
                { $sort: { createdAt: -1 } },
                {
                    $facet: {
                        notifications: [
                            { $sort: { createdAt: -1 } } // list of notifications
                        ],
                        counts: [
                            {
                                $group: {
                                    _id: "$isRead",
                                    count: { $sum: 1 }
                                }
                            }
                        ]
                    }
                }
            ]);

            // Extract results
            const notifications = result[0]?.notifications || [];
            const counts = result[0]?.counts || [];

            // Format count summary
            const readCount = counts.find((c: any) => c._id === true)?.count || 0;
            const unreadCount = counts.find((c: any) => c._id === false)?.count || 0;

            return createResponse(true, {
                total: notifications.length,
                readCount,
                unreadCount,
                notifications
            }, "fetch notifications successfully");
        } catch (error: any) {
            logger.error(`${error.message} Error when fetching notifications`);
            return createResponse(false, null, error.message || "Error when fetching notifications")
        }
    }

    static async readNotifications(notificationId: any): Promise<GenericResponseCode<any>> {
        try {
            const update = await Notification.findByIdAndUpdate(notificationId,
                { $set: { isRead: true } },
                { new: true })
            return createResponseStatus(200, { notification: update }, "Notification read status updated successfully");
        } catch (error: any) {
            logger.error(`${error.message} Error when update read notification`);
            return createResponseStatus(500, null, error.message || "Error when update read status");
        }
    }

    static async getNotificationDetails(notificationId: any): Promise<GenericResponseCode<any>> {
        try {
            const updatedNotification = await Notification.findByIdAndUpdate(
                notificationId,
                { $set: { isRead: true } },
                { new: true, lean: true } // 'new' returns the updated doc; 'lean' makes it lightweight (plain JS object)
            );
            return createResponseStatus(200, { notification: updatedNotification }, "Get Notification detais successfully");
        } catch (error: any) {
            logger.error(`${error.message} Error when fetching notification details`);
            return createResponseStatus(500, null, error.message || "Error when update read status");
        }
    }

    static async addWalletAmount(data: any, partnerId: any): Promise<GenericResponse<any>> {
        try {
            if (!partnerId)
                return createResponse(false, null, "partner Id is required");
            const { amount } = data;
            if (!amount)
                return createResponse(false, null, "Amount is required !");

            const adminId = await getAdminId();
            if (!adminId) {
                throw new Error("Admin not found");
            }

            // razorpay code start
            const checkActiveGateway = await activeGateway();

            if (checkActiveGateway === "RAZORPAY") {
                const [razorpayOrder, userInfo] = await Promise.all([
                    initiateRazorpayOrder(amount),
                    User.findById(partnerId).select("name email phone").lean(),
                ]);
                if (!razorpayOrder?.amount)
                    return createResponse(false, null, "Something went wronge");

                await addInitiateRazorpayWalletOrder(razorpayOrder, null, partnerId);

                const rzp_authenticate = await rzp_auth();
                const result = {
                    key: rzp_authenticate?.razorpay_key_id,
                    amount: razorpayOrder?.amount,
                    currency: "INR",
                    name: "Wallet Recharge",
                    description: "User Recharge our wallet",
                    order_id: razorpayOrder?.id,
                    userInfo
                }

                return createResponse(
                    true,
                    {
                        paymentGateway: "RAZORPAY",
                        result
                    },
                    "Your wallet amount is ready. Please complete the payment to add it"
                );
            }
            // razorpay code end



            const gatewayId = await activeGatewayId();
            const merchantOrderId = "BW_WALORD" + Date.now();
            const wallet = await Wallet.create({
                partnerId,
                adminId,
                gatewayId,
                paymentStatus: "PENDING",
                paymentGateway: "PHONEPE",
                particular: "Received! wallet amount",
                merchantOrderId,
                invoiceNo: `INV${Date.now()}`,
                amount: data?.amount,
                walletType: "added"
            });
            const walletTransaction = await addPartnerWalletPendingTrasncation(merchantOrderId);

            const token = await getPhonePeAccessToken();
            if (!token?.access_token)
                return createResponse(false, null, "Failed to fetch PhonePe access token. Please try again later");

            return await createResponse(true, { paymentGateway: "PHONEPE", result: { merchantOrderId, amount: amount, phonepeToken: token?.access_token } }, "Your wallet amount is ready. Please complete the payment to add it");

        } catch (error: any) {
            logger.error(`${error.message} Error when adding wallet amount`);
            return createResponse(false, null, error?.message || "Error when adding wallet amount")
        }
    }

    static async addWalletConfirm(data: any, partnerId: any): Promise<GenericResponse<any>> {
        try {
            const { amount, merchantOrderId, phonepeToken } = data;
            const checkRequest = await Wallet.findOne({ merchantOrderId, paymentStatus: "PENDING", partnerId, amount });
            if (!checkRequest)
                return createResponse(false, null, "Request is not valid");
            const createPayment = await generatePhonePePaymentLink(phonepeToken, merchantOrderId, amount);
            return {
                success: true,
                data: {
                    "redirectLink": createPayment
                },
                message: "Payment link is generate successfuly !"
            }
        } catch (error: any) {
            logger.error(`${error.message} Error when wallet amount confirm`);
            return {
                success: false,
                data: null,
                message: error
            }
        }
    }

    static async walletAmountStatus(data: any, partnerId: any): Promise<GenericResponse<any>> {
        try {
            const { merchantOrderId, phonepeToken } = data;
            if (!merchantOrderId)
                return createResponse(false, null, "merchantOrderId is required");
            if (!phonepeToken)
                return createResponse(false, null, "token is missing");

            const result = await fetchPaymentStatus(phonepeToken, merchantOrderId);
            if (result?.state == "COMPLETED") {
                const response = await addPartnerWalletAmountSuccess(merchantOrderId, result);
                await wallet_recharge_successfully(merchantOrderId);
                return createResponse(true, { response }, "wallet amount added successfully !");
            }

            if ((result?.state == "FAILED") || (result?.state == "PENDING")) {
                const response = await addPartnerWalletAmountFailed(merchantOrderId, result);
                if (result?.state == "PENDING") {
                    await wallet_recharge_pending(merchantOrderId);
                } else {
                    await wallet_recharge_failed(merchantOrderId);
                }
                return createResponse(false, { response }, `Wallet amount is ${result?.state}`);
            }


            return createResponse(false, { result }, `Wallet transaction has been ${result?.state}`);
        } catch (error: any) {
            logger.error(`${error.message} Error when fetching wallet payment status`);
            return createResponse(false, null, error?.message || "Error when fetching wallet payment status");
        }
    }

    static async transactionsByTab(partnerId: any, payload: any): Promise<GenericResponseCode<any>> {
        try {
            const { lastId, limit, tab, fromDate, toDate } = payload;
            const startDate = new Date(fromDate || "2025-01-15");
            const endDate = new Date(toDate || Date.now());
            endDate.setHours(23, 59, 59, 999);

            let transactionHistory: any[] = [];
            if (["wallet", "subscription", "withdraw", "all"].includes(tab)) {
                let query: any = { partnerId, paymentFor: tab, createdAt: { $gte: startDate, $lte: endDate } };
                if (lastId) {
                    query._id = { $lt: new mongoose.Types.ObjectId(lastId) }
                }
                if (tab == "all") {
                    query.paymentFor = { $in: ["wallet", "withdraw", "subscription"] }
                }
                const walletTransaction = await Transaction.find(query)
                    .select("amount transactionType paymentFor paymentMethod particular paymentStatus createdAt updatedAt")
                    .limit(Number(limit) || 10)
                    .sort({ _id: -1 }).lean();
                transactionHistory = await Promise.all(
                    walletTransaction.map(async (transaction) => {
                        let createdAt = await moment(transaction?.createdAt).tz("Asia/Kolkata").format('DD MMM, YYYY HH:mm:ss');
                        let paymentIcon = transaction?.paymentFor;
                        return { ...transaction, createdAt, paymentIcon }
                    })
                )

            } else {
                let query: any = {
                    status: {
                        $in: [
                            "paused",
                            "awaiting_material",
                            "awaiting_payment",
                            "in_progress",
                            "completed"
                        ]
                    },
                    partnerId,
                    createdAt: { $gte: startDate, $lte: endDate }
                };
                if (lastId) {
                    query._id = { $lt: new mongoose.Types.ObjectId(lastId) }; // ensure ObjectId
                }
                const transactionRes = await getBookingTransaction(query, limit);
                transactionHistory = await Promise.all(
                    transactionRes?.allTransaction.map(async (transaction: any) => {
                        return {
                            "_id": transaction?._id,
                            "paymentStatus": transaction?.paymentStatus,
                            "particular": transaction?.particular,
                            "amount": transaction?.totalAmount,
                            "createdAt": transaction?.createdAt,
                            "paymentIcon": "income"
                        }
                    })
                )
            }
            const newlastId = transactionHistory.length > 0 ? transactionHistory[(transactionHistory.length) - 1]._id : null;
            return createResponseStatus(200, { transactionHistory, lastId: newlastId }, "fetch transaction successfully done");
        } catch (error: any) {
            logger.error(`${error.message} Error when fetching transaction list by tab`);
            return createResponseStatus(500, null, error?.message || "Error when fetching transaction history")
        }
    }

    static async getBanners(): Promise<GenericResponseCode<any>> {
        try {
            const res = await Banner.find({ status: "active", bannerType: "partner" });
            const banners = res.map((bannerObj) => {
                const bannerUrl = bannerObj?.banner
                    ? `${process.env.BASE_URL}/uploads/banner/${bannerObj.banner}`
                    : null;

                return {
                    ...bannerObj.toObject?.() || bannerObj, // ensure plain object if it's a Mongoose doc
                    banner: bannerUrl,
                };
            });
            return createResponseStatus(200, { banner: banners }, "Banners fetch successfully done");
        } catch (error: any) {
            logger.error(`${error.message} Error when fetching banners list`);
            return createResponseStatus(500, null, error.message || "Error when fetching banners")
        }
    }

    static async notificationSetting(partnerId: any, payload: any): Promise<GenericResponseCode<any>> {
        try {
            const { job, wallet, payment, service_tips } = payload;
            const res = await Setting.findOneAndUpdate(
                { partnerId, type: "notification" },   // filter
                {
                    $set: {
                        job,
                        wallet,
                        payment,
                        service_tips,
                        type: "notification",
                        partnerId
                    }
                },
                {
                    new: true,      // return updated doc
                    upsert: true,   // create if not exists
                    lean: true      // return plain JS object (faster)
                }
            );
            return createResponseStatus(200, { notification: res }, "Notification setting add successfully done");
        } catch (error: any) {
            logger.error(`${error.message} Error when update notification setting page`);
            return createResponseStatus(500, null, error.message || "Error when updating notification setting");
        }
    }

    static async getNotificationSetting(partnerId: any): Promise<GenericResponseCode<any>> {
        try {
            let result: any = await Setting.findOne({ partnerId, type: "notification" }).select("-customerId");

            if (!result) {
                result = await Setting.findOneAndUpdate(
                    { partnerId, type: "notification" },   // filter
                    {
                        $set: {
                            job: true,
                            wallet: true,
                            payment: true,
                            service_tips: true,
                            type: "notification",
                            partnerId
                        }
                    },
                    {
                        new: true,      // return updated doc
                        upsert: true,   // create if not exists
                        lean: true      // return plain JS object (faster)
                    }
                );
            }
            return createResponseStatus(200, { notification: result }, "Notification status fetch successfully done");
        } catch (error: any) {
            logger.error(`${error.message} Error when fetching notification setting details`);
            return createResponseStatus(500, null, error.message || "Error when fetching Notification status");
        }
    }

    static async shareLink(partnerId: any): Promise<GenericResponseCode<any>> {
        try {
            const result: any = await Partner.findOne({ user: partnerId }).select("referralCode").lean();
            const referral_code = result?.referralCode;
            const baseUrl = "https://play.google.com/store/apps/details?id=com.alina.bharat.worker.partner";
            const message = encodeURIComponent(`Use Referral Code ${referral_code} and get a referral points!`);
            const shareLinks = {
                whatsapp: `https://api.whatsapp.com/send?text=${message}%20${baseUrl}`,
                facebook: `https://www.facebook.com/sharer/sharer.php?u=${baseUrl}`,
                twitter: `https://twitter.com/intent/tweet?text=${message}%20${baseUrl}`,
                linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${baseUrl}`,
            };
            logger.info(`Partner share refferal code ${referral_code}`);
            return createResponseStatus(200, shareLinks, "share link gernate successfully");
        } catch (error: any) {
            logger.error(`${error?.message} Error when generate link share on social`);
            return createResponseStatus(500, null, "Error when share app link on social media");
        }
    }

    static async getNotificationsCount(partnerId: any): Promise<GenericResponseCode<any>> {
        try {
            const count = await Notification.countDocuments({ userId: partnerId, isRead: false });

            return createResponseStatus(200, { count }, "fetch notification count successfully");
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching unread notification count`);
            return createResponseStatus(500, null, error?.message || "Error when fetching unread notification count");
        }
    }


    static async transactionDetails(transactionId: any, customerId: any): Promise<GenericResponseCode<any>> {
        try {
            let detailObj: any = {
                detailsType: "",
                details: {}
            };
            let checkTrans = await Transaction.findOne({ _id: transactionId });
            if (checkTrans) {
                if (checkTrans?.paymentFor === "subscription") {
                    detailObj = await getSubscriptionTransactionDetail(checkTrans);
                } else {
                    detailObj = await getWalletTransactionDetails(checkTrans);
                }
            } else {
                detailObj = await getBookingPaymentDetails(transactionId);
                delete detailObj?.details?.partnerId;
            }

            return createResponseStatus(200, { detailsType: detailObj?.detailsType, details: detailObj?.details }, "fetch transaction detail successfully");
        } catch (error: any) {
            logger.error(`${error.message} Error when fetching transaction details`);
            return createResponseStatus(500, null, error.message || "Error when fetching transaction details")
        }
    }


    static async appReview(payload: any, partnerId: any): Promise<GenericResponseCode<any>> {
        try {

            const result = await Rating.findOneAndUpdate(
                { partnerId, isAppReview: true },
                {
                    description: payload?.description,
                    rating: payload?.rating,
                    appReview: "partner"
                },
                { new: true, upsert: true, setDefaultsOnInsert: true }
            );
            const response = await getPartnerAppReviewList(partnerId, 10, { isAppReview: true, appReview: "partner" });
            return createResponseStatus(200, { ...response }, "app review add successfully");
        } catch (error: any) {
            return createResponseStatus(500, null, error.message || "Error when adding app review");
        }
    }
    static async appReviewList(payload: any, partnerId: any): Promise<GenericResponseCode<any>> {
        try {
            const { lastId, limit } = payload;
            let query: any = { isAppReview: true, appReview: "partner" };
            if (lastId) {
                query._id = { $lt: new mongoose.Types.ObjectId(lastId) };
            }
            const result = await getPartnerAppReviewList(partnerId, limit, query);
            return createResponseStatus(200, { ...result }, "Fetching app review list successfully");
        } catch (error: any) {
            return createResponseStatus(500, null, error.message || "Error when fetching app review list");
        }
    }

    static async getTotalPartnerAndCustomer(): Promise<GenericResponseCode<any>> {
        try {
            const total_partner = await Partner.countDocuments({ kycStatus: "approved" }) + await increasePartner();
            const total_customer = await Customer.countDocuments() + await increaseCustomer();
            return createResponseStatus(200, { total_partner, total_customer }, "User count details fetched successfully");
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching partner and coustomer count`);
            return createResponseStatus(500, null, error?.message || "Error when fetching partner and coustomer count");
        }
    }


    static async addPaymentmethod(payload: any, partnerId: any): Promise<GenericResponseCode<any>> {
        try {
            const {
                method,
                upiId,
                accountHolderName,
                accountNumber,
                ifscCode,
                bankName,
                branchAddress
            } = payload;

            const hasPrimary = !!(await PaymentMethod.exists({
                user: partnerId,
                isPrimary: true
            }));


            let insertObj: any = {
                userType: "partner",
                user: partnerId,
                method,
                isPrimary: hasPrimary ? false : true
            };

            let condtionObj: any = {
                user: partnerId
            }

            if (method === "BANK") {
                let isVerifiedAccountNumber = await checkAccountNumber(accountNumber);
                if (!isVerifiedAccountNumber) {
                    return createResponseStatus(409, null, "Account number is not valid");
                }

                let checkExistingAccount = await PaymentMethod.findOne({ accountNumber, user: { $ne: partnerId } });
                if (checkExistingAccount) {
                    return createResponseStatus(409, null, "This account is already linked to a different user");
                }

                let isVerifiedIFSCCode = await checkIFSCCode(ifscCode);
                if (!isVerifiedIFSCCode) {
                    return createResponseStatus(409, null, "IFSC code is not valid");
                }

                const fetchAddress = await getBankDetailsByIFSC(ifscCode);
                insertObj = {
                    ...insertObj,
                    accountHolderName: accountHolderName || null,
                    accountNumber: accountNumber || null,
                    ifscCode: ifscCode || null,
                    bankName: bankName || fetchAddress?.BANK,
                    branchAddress: branchAddress || fetchAddress?.BRANCH,
                    bankCode: fetchAddress ? fetchAddress?.BANKCODE : "UPI",
                    upiId: null
                };
                condtionObj = {
                    ...condtionObj,
                    accountNumber
                }
            }

            if (method === "UPI") {
                let isValidUPI = await isValidUPIFormat(upiId);
                if (!isValidUPI) {
                    return createResponseStatus(409, null, "Please enter valid UPI Id");
                }
                let checkExistingupiId = await PaymentMethod.findOne({ upiId, user: { $ne: partnerId } });
                if (checkExistingupiId) {
                    return createResponseStatus(409, null, "This UPI ID is already linked to a different user");
                }

                insertObj = {
                    ...insertObj,
                    upiId: upiId || null,
                    accountHolderName: null,
                    accountNumber: null,
                    ifscCode: null,
                    bankName: null,
                    branchAddress: null
                };

                condtionObj = {
                    ...condtionObj,
                    upiId
                }
            }
            const result = await PaymentMethod.findOneAndUpdate(
                { ...condtionObj },
                { $set: insertObj },
                { new: true, upsert: true }
            );
            return createResponseStatus(200, { result }, "payment method add successfully");
        } catch (error: any) {
            logger.error(`${error?.message} Error when generate link share on social`);
            return createResponseStatus(500, null, error.message || "Error when adding payment method");
        }
    }

    static async getPaymentMethod(partnerId: any): Promise<GenericResponseCode<any>> {
        try {
            let res = await getPaymentMethod(partnerId);
            return createResponseStatus(200, { primary: res?.primary, result: res?.result }, "fetch payment method successfully");
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching payment method`);
            return createResponseStatus(500, null, error.message || "Error when fetching payment method")
        }
    }

    static async setPrimaryPaymentMethod(partnerId: any, methodId: any): Promise<GenericResponseCode<any>> {
        try {
            const checkPaymentMethod = await PaymentMethod.findOne({ user: partnerId, _id: methodId });
            if (!checkPaymentMethod)
                return createResponseStatus(400, null, "Payment method not found");

            checkPaymentMethod.isPrimary = true;
            await checkPaymentMethod.save();

            await PaymentMethod.updateMany(
                {
                    user: partnerId,
                    _id: { $ne: methodId }
                },
                { $set: { isPrimary: false } }
            );
            let res = await getPaymentMethod(partnerId);
            return createResponseStatus(200, { primary: res?.primary, result: res?.result }, "Set primay method successfully");
        } catch (error: any) {
            logger.error(`${error?.message} Error when set primary payment method`);
            return createResponseStatus(500, null, error.message || "Error when set primary payment method");
        }
    }


    static async addWalletAmountRazorpayVerify(payload: any, customerId: any): Promise<GenericResponseCode<any>> {
        try {
            const verifyResult = await verifyRazorpayPayment(payload);
            if (verifyResult) {
                await Wallet.findOneAndUpdate(
                    { merchantOrderId: payload?.razorpay_order_id },
                    {
                        $set: {
                            transactionId: payload?.razorpay_payment_id,
                            "razorpayObj.razorpay_signature": payload?.razorpay_signature,
                        },
                    },
                    { new: true }
                );
            }
            return createResponseStatus(200, { verifyResult }, "Wallet payment processed successfully");
        } catch (error: any) {
            logger.error(`${error?.message} Error when adding wallet amount by razorpay`);
            return createResponseStatus(500, null, error.message || "Error when adding wallet amount");
        }
    }

    static async getRazorpayWalletPaymentStatus(paymentId: any, customerId: any): Promise<GenericResponseCode<any>> {
        try {
            const result = await checkRazorpayPaymentStatus(paymentId);
            if (result?.success) {
                const response = await addPartnerRazorpayWalletAmountSuccess(result?.order_id, result);
            }

            return createResponseStatus(200, { result, customerId }, "payment status fetch successfully");
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching razorpay wallet payment status`);
            return createResponseStatus(500, null, error.message || "Error when fetching razorpay wallet payment status");
        }
    }



    static async verifyRazorpaySubscriptionPayment(payload: any, customerId: any): Promise<GenericResponseCode<any>> {
        try {
            const verifyResult = await verifyRazorpayPayment(payload);
            if (verifyResult) {
                await UserSubscription.findOneAndUpdate(
                    { merchantOrderId: payload?.razorpay_order_id },
                    {
                        $set: {
                            transactionId: payload?.razorpay_payment_id,
                            "razorpayObj.razorpay_signature": payload?.razorpay_signature,
                        },
                    },
                    { new: true }
                );

                await Transaction.updateMany(
                    { merchantOrderId: payload?.razorpay_order_id },
                    {
                        $set: {
                            transactionId: payload?.razorpay_payment_id,
                        },
                    }
                );
            }
            return createResponseStatus(200, { verifyResult }, "Wallet payment processed successfully");
        } catch (error: any) {
            logger.error(`${error?.message} Error when adding wallet amount by razorpay`);
            return createResponseStatus(500, null, error.message || "Error when adding wallet amount");
        }
    }

    static async getRazorpaySubscriptionPaymentStatus(paymentId: any, customerId: any): Promise<GenericResponseCode<any>> {
        try {

            const result = await checkRazorpayPaymentStatus(paymentId);
            if (result?.success) {
                const updateResponse = await partnerRazorpaySubscriptionPaymentCompleted(result?.order_id, result);
                await wallet_recharge_successfully(result?.order_id);
                return createResponseStatus(200, { result, customerId }, "payment status fetch successfully!");
            }

            return createResponseStatus(200, { result, customerId }, "payment status fetch successfully");
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching razorpay wallet payment status`);
            return createResponseStatus(500, null, error.message || "Error when fetching razorpay wallet payment status");
        }
    }

    static async walletRazorpayPaymentByOrderId(merchantOrderId: any): Promise<GenericResponseCode<any>> {
        try {
            const result = await getOrderPaymentStatus(merchantOrderId);
            if (!result) return createResponseStatus(500, null, "order id not found");
            let statusArray = await paymentStatusArray();
            let paymentstatus = "failed";
            if (statusArray.includes(result.status)) {
                paymentstatus = result.status;
                if (paymentstatus == "captured") {
                    await wallet_recharge_successfully(merchantOrderId);
                } else {
                    await wallet_recharge_pending(merchantOrderId);
                }
            } else {
                await wallet_recharge_failed(merchantOrderId);
            }

            let getPendingMessage = await pendingMessages();
            let pendingMessage = result?.reason || result?.message || getPendingMessage;

            await Promise.all([
                // Update Wallet
                Wallet.findOneAndUpdate(
                    { merchantOrderId },
                    {
                        $set: {
                            paymentStatus: paymentstatus,
                            "razorpayObj.particular": pendingMessage,
                            "razorpayObj.status": result.status,
                        },
                    },
                    { new: true }
                ),

                // Update Transactions
                Transaction.updateMany(
                    { merchantOrderId },
                    {
                        $set: {
                            particular: pendingMessage,
                            paymentStatus: paymentstatus,
                        },
                    }
                ),
            ]);
            return createResponseStatus(200, { result }, `${pendingMessage}`);
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching payment status by order id`);
            return createResponseStatus(500, null, error.message || "Error when fetching payment status by order id");
        }
    }



    static async subscriptionRazorpayPaymentByOrderId(merchantOrderId: any): Promise<GenericResponseCode<any>> {
        try {
            const result = await getOrderPaymentStatus(merchantOrderId);
            if (!result) return createResponseStatus(500, null, "order id not found");

            let statusArray = await paymentStatusArray();
            let paymentstatus = "failed";
            if (statusArray.includes(result.status)) {
                paymentstatus = result.status;
                if (paymentstatus == "captured") {
                    await subscription_plan_added(merchantOrderId);
                } else {
                    await subscription_plan_pending(merchantOrderId);
                }
            } else {
                await subscription_plan_failed(merchantOrderId);
            }

            let getPendingMessage = await pendingMessages();
            let pendingMessage = result?.reason || result?.message || getPendingMessage;

            await Promise.all([
                // Update Wallet
                UserSubscription.findOneAndUpdate(
                    { merchantOrderId },
                    {
                        $set: {
                            status: "failed",
                            "razorpayObj.particular": pendingMessage,
                            "razorpayObj.status": result.status,
                        },
                    },
                    { new: true }
                ),
                // Update Transactions
                Transaction.updateMany(
                    { merchantOrderId },
                    {
                        $set: {
                            particular: pendingMessage,
                            paymentStatus: paymentstatus,
                        },
                    }
                ),
            ]);
            return createResponseStatus(200, { result }, `${pendingMessage}`);
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching payment status by order id`);
            return createResponseStatus(500, null, error.message || "Error when fetching payment status by order id");
        }
    }


    static async checkEmail(): Promise<GenericResponseCode<any>> {
        try {
            const data = {
                email: "workerbharat69@gmail.com",  // neelesh03101981@gmail.com 
                name: "Mahesh Billore",
                amount: 500,
                transactionId: "pay_RuZlq7z78McK8n",
                orderId: "order_RuZlgjfS3hjL91",
                invoiceNo: "rcpt_1766388746420",
                paymentMethod: "UPI"
            }

            const response = await welcome(
                {
                    name: "Mahesh Billore",
                    email: "workerbharat69@gmail.com"
                }
            );
            const response1 = await wallet_recharge_successfully({
                email: "workerbharat69@gmail.com",
                name: "Mahesh Billore",
                amount: 500,
                orderId: "order_RuZlgjfS3hjL91",
                invoiceNo: "rcpt_1766388746420",
                transactionId: "rzp_dfsdldslj799",
                paymentMethod: "UPI",
            });
            const response2 = await wallet_recharge_pending({
                email: "workerbharat69@gmail.com",
                name: "Mahesh Billore",
                amount: 500,
                orderId: "order_RuZlgjfS3hjL91",
                invoiceNo: "rcpt_1766388746420",
            });
            const response3 = await wallet_recharge_failed({
                email: "workerbharat69@gmail.com",
                name: "Mahesh Billore",
                amount: 500,
                orderId: "order_RuZlgjfS3hjL91",
                invoiceNo: "rcpt_1766388746420",
            });
            const response4 = await subscription_plan_pending({
                email: "workerbharat69@gmail.com",
                name: "Mahesh Billore",
                amount: 500,
                orderId: "order_RuZlgjfS3hjL91",
                invoiceNo: "rcpt_1766388746420",
            });
            const response5 = await subscription_plan_failed({
                email: "workerbharat69@gmail.com",
                name: "Mahesh Billore",
                amount: 500,
                orderId: "order_RuZlgjfS3hjL91",
                invoiceNo: "rcpt_1766388746420",
            });
            const response6 = await subscription_plan_expire(
                {
                    email: "workerbharat69@gmail.com",
                    name: "Mahesh",
                    plan_name: "Free Plan",
                    subscription_id: "68e8ade2ee56eb39ae50dbc7",
                    start_date: "2025-10-10",
                    end_date: "2026-10-10",
                    remainingDays: 30
                }
            );
            const response7 = await subscription_plan_added({
                email: "workerbharat69@gmail.com",
                name: "Mahesh",
                plan_name: "Free Plan",
                subscription_id: "68e8ade2ee56eb39ae50dbc7",
                start_date: "2026-09-10",
                end_date: "2026-10-10",
            });
            const response8 = await job_complete_partner({
                email: "workerbharat69@gmail.com",
                name: "Mahesh",
                amount: 500,
                job_id: "68e8b53c008c4dc2f8bed1f4",
                job_title: "Switch replacement",
            });
            return createResponseStatus(200, { response }, "Email Send successfully");
        } catch (error: any) {
            return createResponseStatus(500, null, error.message || "Error when sending email");
        }
    }

    static async getReferralPointsDetails(userId: any): Promise<GenericResponseCode<any>> {
        try {

            const result = await referralPointDetails(userId);

            return createResponseStatus(200, { result }, "Referral details fetching successfully");
        } catch (error: any) {
            return createResponseStatus(500, null, error.message || "Error when fetching referral Details");
        }
    } 
    static async redeemPoints(payload: any, userId: any): Promise<GenericResponseCode<any>> {
        try {
            const { redeem_points } = payload;
            let latest_avilable = 0;
            const result = await referralPointDetails(userId);
            if (redeem_points > result?.avilable)
                return createResponseStatus(400, null, "You don’t have enough referral points to redeem yet.");



            latest_avilable = result?.avilable - redeem_points;
            const redeemRate: any = await Setting.findOne({ type: "redeem_rate", status: "active" });
            if (!redeemRate)
                return createResponseStatus(400, null, "Redeem rate not set by admin");

            let checkPoints = await convertReferralPoints(redeem_points,redeemRate?.redeem_rate); 
            if (checkPoints?.remainingPoints !== 0)
                return createResponseStatus(400, null, `Redeem points should be multiples of ${redeemRate?.redeem_rate * 100}`);

            const amount = (parseInt(redeem_points) * parseFloat(redeemRate?.redeem_rate));
            // const response = await 

            const adminId = await getAdminId();
            if (!adminId) {
                throw new Error("Admin not found");
            }


            const merchantOrderId = "BW_WALORD" + Date.now();
            const walletObj = await Wallet.create({
                partnerId: userId,
                adminId,
                paymentMethod: "redeem_points",
                paymentStatus: "COMPLETED",
                particular: "Received! wallet amount",
                merchantOrderId,
                orderId: `ORD${Date.now()}`,
                invoiceNo: `INV${Date.now()}`,
                transactionId: `REDEEM${Date.now()}`,
                transactionDate: new Date(),
                amount: amount,
                referral_points_redeemed: redeem_points,
                redeemRateId: redeemRate?._id,
                walletType: "added"
            });


            const adminTransactionPayload = {
                adminId: adminId,
                walletPayment: walletObj._id,
                // customerId: walletObj.customerId, 
                amount: walletObj.amount,
                invoiceNo: walletObj.invoiceNo,
                merchantOrderId: walletObj.merchantOrderId,
                transactionId: walletObj.transactionId,
                paymentMethod: walletObj.paymentMethod,
                paymentStatus: walletObj.paymentStatus,
                transactionDate: walletObj.transactionDate,
                paymentBy: "partner",
                paymentFor: "wallet",
                particular: "Referral points redeemed successfully",
                transactionType: "debited",
            };

            await Transaction.create(adminTransactionPayload);

            // Prepare transaction payload
            const partnerTransactionPayload = {
                // adminId: adminId,
                walletPayment: walletObj._id,
                partnerId: walletObj.partnerId,
                amount: walletObj.amount,
                invoiceNo: walletObj.invoiceNo,
                merchantOrderId: walletObj.merchantOrderId,
                transactionId: walletObj.transactionId,
                paymentMethod: walletObj.paymentMethod,
                paymentStatus: walletObj.paymentStatus,
                transactionDate: walletObj.transactionDate,
                paymentBy: "partner",
                paymentFor: "wallet",
                particular: "Received! added wallet",
                transactionType: "credited",
            };
            await Transaction.create(partnerTransactionPayload);

            await Partner.findOneAndUpdate(
                { user: userId },
                { $set: { referralPoints: latest_avilable } }
            )

            // const walletTransaction = await addPartnerWalletPendingTrasncation(merchantOrderId);

            return createResponseStatus(200, { result: walletObj }, "Referral points redeem successfully");
        } catch (error: any) {
            return createResponseStatus(500, null, error.message || "Error when referral points redeem");
        }
    }


}
