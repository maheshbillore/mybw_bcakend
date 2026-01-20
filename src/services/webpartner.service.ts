import Partner from "../models/partner.model.js";
import { GenericResponse } from "../shared/type.js";
import { upload } from "../config/multer.config.js";
import { getBaseUrl } from "../utils/gertBaseUrl.js";
import { Request } from "express";
import mongoose, { Types } from "mongoose";
import { generateOTP } from "../utils/otp.util.js";
import jwt from "jsonwebtoken";
import ContactModel from '../models/contectus.model.js'
import User from "../models/user.model.js";
import Booking from "../models/booking.model.js";
import fs from "fs";
import path from "path";
import Category from "../models/category.model.js";
import SubCategory from "../models/sub.category.model.js";
import { createResponse, generateReferralCode, getDobFormate, getPlansDuration, getProfile, getYearsExperience, isValidAadhaar, isValidPan, partnerSubscriptionPaymentCompleted, partnerSubscriptionPaymentFaild, removeCountryCode, removeOldFile, validateFields } from "../utils/helper.js";

import { verifyUserWithFirebase } from "../utils/firebase.js";
import { updateProfileCompletion } from "../utils/helper.js";
import subscriptionPlansModel from "../models/subscriptionPlans.model.js";
import _, { update } from "lodash";
import Categorytype from "../models/categorytype.model.js";
import Service from "../models/service.model.js";
import UserSubscription from "../models/user.subscription.model.js";
import Customer from "../models/customer.model.js";
import { fetchPaymentStatus, generateWebPhonePePaymentLink, getPhonePeAccessToken } from "../utils/phonepe.js";

export { upload };

export class WebPartnerService {
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
                    .skip(skip)
                    .limit(pageSize)
                    .sort({ _id: -1 }),
                Partner.countDocuments({ kycStatus: "approved" }),
            ]);


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
                    partners,
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
            return {
                success: false,
                data: null,
                message: error?.message || "Error during updating skill",
            };
        }
    }

    static async getPartnerById(id: string): Promise<GenericResponse<any>> {
        try {
            const response = await Partner.findOne({ _id: id })
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
                    },
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


            return {
                success: true,
                data: response,
                message: "Partner found successfully",
            };
        } catch (error: any) {
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
            return {
                success: false,
                data: null,
                message: error?.message || "Error during registration",
            };
        } finally {
            session.endSession();
        }
    }


    // ========================== web otp =========================

    static async webotpVerificationservice(phone?: string, email?: string): Promise<GenericResponse<any>> {
        try {
            let user;

            if (phone) {
                user = await User.findOne({ phone });
                if (!user) {
                    user = await User.create({ phone, role: 'partner', isActive: true });
                    await Partner.create({ user: user._id });
                }
            } else if (email) {
                user = await User.findOne({ email });
                if (!user) {
                    user = await User.create({ email, role: 'partner', isActive: true });
                    await Partner.create({ user: user._id });
                }
            }

            if (!user) {
                return {
                    success: false,
                    data: null,
                    message: "User creation failed",
                };
            }

            const token = jwt.sign(
                { id: user._id, role: user.role },
                process.env.JWT_SECRET!,
                { expiresIn: "7d" }
            );

            return {
                success: true,
                data: { token, user },
                message: "OTP verified & user registered",
            };
        } catch (error: any) {
            return {
                success: false,
                data: null,
                message: error.message || "Internal server error",
            };
        }
    }



    // ===========================


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
            return {
                success: false,
                data: null,
                message: error?.message || "Error during registration",
            };
        }
    }
    // ================================ contect us form

    static async submitContactForm(data: {
        name: string;
        email: string;
        phone: string;
        service: string;
        message: string;
    }) {
        try {
            const contact = new ContactModel(data);
            await contact.save();

            return {
                success: true,
                message: "Your message has been received! We’ll contact you soon.",
            };
        } catch (error) {
            console.error("Error saving contact form:", error);
            throw new Error("Failed to submit contact form.");
        }
    }

    // ================================= validate Email
    static async validateEmailForRegistration(email: string) {
        try {
            if (!email) {
                return {
                    success: false,
                    data: null,
                    message: "Email is required",
                    emailExists: false
                };
            }

            const cleanedEmail = email.trim().toLowerCase();

            // Basic regex check
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(cleanedEmail)) {
                return {
                    success: false,
                    data: null,
                    message: "Invalid email format",
                    emailExists: false
                };
            }

          

            // Check if email already exists in User collection
            /* const existingUser = await User.findOne({ email: cleanedEmail }); 
             if (existingUser) {
                 return {
                     success: false,
                     data: null,
                     message:
                         "This email address is already registered. Please use a different email or try to login.",
                     emailExists: true
                 };
             } */

            // Email is available
            return {
                success: true,
                data: {
                    emailAvailable: true,
                    formattedEmail: cleanedEmail
                },
                message: "Email is available for registration",
                emailExists: false
            };
        } catch (error: any) {
            console.error("Error in validateEmailForRegistration:", error);
            return {
                success: false,
                data: null,
                message: error?.message || "Error during email validation",
                emailExists: false
            };
        }
    }

    // ========================================== validate  Phone 

    static async validatePhoneForRegistration(phone: string) {
        try {
            if (!phone) {
                return {
                    success: false,
                    data: null,
                    message: "Phone number is required",
                    phoneExists: false
                };
            }

            // Clean and format phone number
            const cleanedPhone = phone.trim();

            // Ensure phone starts with + for consistency
            const formattedPhone = cleanedPhone.startsWith('+')
                ? cleanedPhone
                : `+${cleanedPhone}`;

            // Basic phone number format validation
            const phoneRegex = /^\+[1-9]\d{1,14}$/; // E.164 format
            if (!phoneRegex.test(formattedPhone)) {
                return {
                    success: false,
                    data: null,
                    message: "Invalid phone number format. Please include country code.",
                    phoneExists: false
                };
            }
            // Check if phone number already exists in User collection
            /*  const existingUser = await User.findOne({
      $or: [
        { phone: formattedPhone },
        { phone: formattedPhone.replace('+', '') }
      ]
    }); 
                if (existingUser) {
                    return {
                        success: false,
                        data: null,
                        message: "This phone number is already registered. Please use a different number or try to login.",
                        phoneExists: true
                    };
                } */

            // Phone number is available for registration
            return {
                success: true,
                data: {
                    phoneAvailable: true,
                    formattedPhone: formattedPhone
                },
                message: "Phone number is available for registration",
                phoneExists: false
            };

        } catch (error: any) {
            console.error('Error in validatePhoneForRegistration:', error);
            return {
                success: false,
                data: null,
                message: error?.message || "Error during phone validation",
                phoneExists: false
            };
        }
    }


    // ========================== step form service function========

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

            const { name, email, dob, phone } = req.body || {};
            const olduser = await User.findOne({ _id: partnerId });

            if (!olduser) {
                return {
                    success: false,
                    data: null,
                    message: "User not found",
                };
            }

            // Email validation for phone-joined users
            if (olduser?.joinVia === "Phone" && email) {
                const checkEmailExist = await User.findOne({
                    email: email,
                    _id: { $ne: partnerId }
                });
                if (checkEmailExist) {
                    return createResponse(false, null, "Email is already in use with another user");
                }
            }

            // Phone validation for Google-joined users
            if (olduser?.joinVia === "Google" && phone) {
                const checkPhoneExist = await User.findOne({
                    phone,
                    _id: { $ne: partnerId }
                });
                if (checkPhoneExist) {
                    return createResponse(false, null, "Phone is already in use with another user");
                }
            }

            // Prepare partial user update
            const userUpdateData: any = {};
            if (name) userUpdateData.name = name;
            if (email && olduser.joinVia !== "Google") userUpdateData.email = email;
            if (dob) userUpdateData.dob = dob;
            if (phone && olduser.joinVia !== "Phone") userUpdateData.phone = phone;

            const updateUser = await User.findOneAndUpdate(
                { _id: partnerId },
                { $set: userUpdateData },
                { new: true }
            );

            const oldPartner = await Partner.findOne({ user: olduser._id });

            // Delete old profile image if a new one is uploaded
            if (files.profile && files.profile[0]) {
                const oldProfileFilename = oldPartner?.profile;
                if (oldProfileFilename) {
                    const oldProfilePath = path.join("uploads/profile/", oldProfileFilename);
                    if (fs.existsSync(oldProfilePath)) {
                        fs.unlinkSync(oldProfilePath);
                    }
                }
            }

            // Prepare partial partner update
            // Prepare partial partner update
            const partnerUpdateData: any = {};
            if (dob) partnerUpdateData.dob = new Date(dob);
            if (req.body?.data?.partner?.category) {
                partnerUpdateData.category = req.body.data.partner.category;
            }
            if (req.body?.data?.partner?.services && Array.isArray(req.body.data.partner.services)) {
                partnerUpdateData.services = req.body.data.partner.services.map((s: { _id: string | Types.ObjectId }) => s._id);
            }
            // Category Type

            if (req.body?.data?.partner?.categoryType && Array.isArray(req.body.data.partner.categoryType)) {
                partnerUpdateData.categoryType = req.body.data.partner.categoryType.map(
                    (ct: string | Types.ObjectId) => ct
                );
            }

            if (files.profile && files.profile[0]) {
                partnerUpdateData.profile = files.profile[0].filename;
            }

            // Skills
            if (req.body.skills) {
                try {
                    partnerUpdateData.skills = typeof req.body.skills === 'string'
                        ? JSON.parse(req.body.skills)
                        : req.body.skills;
                } catch (err) {
                    console.error("Invalid skills payload:", err);
                }
            }
            // Set referral code if missing
            if (updateUser?.phone && (!oldPartner?.referralCode || oldPartner.referralCode === "")) {
                partnerUpdateData.referralCode = await removeCountryCode(updateUser.phone);
            }

            const updatePartner = await Partner.findOneAndUpdate(
                { user: olduser._id },
                { $set: partnerUpdateData },
                { new: true }
            );

            if (updatePartner) {
                await updateProfileCompletion(updatePartner._id);
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

        } catch (error: any) {
            return {
                success: false,
                data: null,
                message: error?.message || "Error during profile update",
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
                if (Array.isArray(payload.yearOfExprence)) {
                    partner.totalExperience = Math.max(...payload.yearOfExprence);
                }
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
            const user = await User.findOne({ phone: result.phone_number });
            if (!user) {
                return {
                    success: false,
                    data: null,
                    message: "User not found please signup first",
                };
            }
            const partner = await Partner.findOne({ user: user._id });
            if (!partner) {
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
            return {
                success: false,
                data: null,
                message: error?.message || "Error during login",
            };
        }
    }

    static async partnerSignup(token: any) {
        try {
            const result = await verifyUserWithFirebase(token) as any;
            if (result.error && result.error === "Invalid token") {
                return {
                    success: false,
                    data: null,
                    message: result.error,
                };
            }
            const user = await User.findOne({ phone: result.phone_number });

            if (!user) {
                const newUser = await User.create({
                    phone: result?.phone_number,
                    role: "partner",
                    isActive: false,
                });
                const partner = await Partner.create({
                    user: newUser._id,
                    profilePendingScreens: 1, // 1 pending for profile update 
                    profileCompletion: 0,
                });




                const token = jwt.sign(
                    { id: newUser._id, role: newUser.role },
                    process.env.JWT_SECRET!,
                    { expiresIn: "7d" }
                );

                if (partner) {
                    await updateProfileCompletion(partner._id);
                }

                const profile = await getProfile(newUser._id.toString());


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

                if (partner) {
                    await updateProfileCompletion(partner._id);
                }

                const profile = await getProfile(user._id.toString());

                const token = jwt.sign(
                    { id: user._id, role: user.role },
                    process.env.JWT_SECRET!,
                    { expiresIn: "7d" }
                );
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
            return {
                success: false,
                data: null,
                message: error?.message || "Error during partner signup",
            };
        }
    }

    static async getSubscriptionPlans() {
        try {
            const subscriptionPlans = await subscriptionPlansModel.find({ status: "active" });
            return {
                success: true,
                data: subscriptionPlans,
                message: "Subscription plans fetched successfully",
            };
        } catch (error: any) {
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
                    .sort({ _id: -1 }),
                Partner.countDocuments({ kycStatus: "pending", waitingForApproval: true }),
            ]);

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
                    partners,
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

            let user = await User.findOne({ email: payload.email });

            if (!user) {
                const newUser = await User.create({
                    email: payload?.email,
                    name: payload?.name,
                    phone: payload?.phone,
                    joinVia: "Google",
                    role: "partner",
                    isActive: false,
                });
                const partner = await Partner.create({
                    user: newUser._id,
                    profilePendingScreens: 1, // 1 pending for profile update 
                    profileCompletion: 0,
                });

                await updateProfileCompletion(partner._id);

                const token = jwt.sign(
                    { id: newUser._id, role: newUser.role },
                    process.env.JWT_SECRET!,
                    { expiresIn: "7d" }
                );
                const profile = await getProfile(newUser?._id?.toString());
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


                const profile = await getProfile(user?._id?.toString());

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
                    .sort({ _id: -1 }),
                Partner.countDocuments({ kycStatus: "rejected" }),
            ]);

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
                    partners,
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
                    .sort({ _id: -1 }),
                Partner.countDocuments({ kycStatus: "pending", waitingForApproval: false }),
            ]);

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
                    partners,
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
            }
            const merchantOrderId = "BW_ORDSUB" + Date.now();
            const userSubscription = await UserSubscription.create({
                userId: partnerId,
                subscriptionPlans: data.subscriptionplans,
                codeType: data.codeType,
                couponCodeId: data.couponCodeId,
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

            // update parter subscritions and referred by 
            const updatePartnerSubscription = await Partner.findOneAndUpdate(
                { user: partnerId },
                { $push: { subscriptionPlans: userSubscription._id }, referredBy: referrerId },
                { new: true }
            )
            // update referral history
            if (data.codeType == "referral code") {
                const updateReferralHistory = await Partner.findOneAndUpdate(
                    { user: referrerId },
                    { $push: { referralHistory: partnerId } },
                    { new: true }
                )
            }
            session.commitTransaction();

            const token = await getPhonePeAccessToken();

            return await createResponse(true, { merchantOrderId, amount: userSubscription?.payableAmount, phonepeToken: token?.access_token }, "Your subscription is ready. Please complete the payment to reserve it");

        } catch (error: any) {
            return await createResponse(false, null, error?.message || "Error when purchaseing subscription plans by Partners");
        } finally {
            session.endSession();
        }
    }

    static async bookedCustomers(partnerId: any): Promise<GenericResponse<any>> {
        try {
            // condition are remaing
            const bookedCustomer = await Customer.find().populate('user');
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

            const plansDuration = await getPlansDuration(subscriptionDetails, partnerId);



            const merchantOrderId = "BW_ORDSUB" + Date.now();
            const userSubscription = await UserSubscription.create({
                userId: partnerId,
                subscriptionPlans: data.subscriptionplans,
                price: subscriptionDetails.mrp,
                discountAmount: subscriptionDetails.flat_discount,
                discountType: "flat",
                payableAmount: subscriptionDetails.price,
                merchantOrderId: merchantOrderId,
                startDate: plansDuration?.startDate,
                endDate: plansDuration?.endDate,
                status: 'pending'
            });

            // update parter subscritions and referred by 
            const updatePartnerSubscription = await Partner.findOneAndUpdate(
                { user: partnerId },
                { $push: { subscriptionPlans: userSubscription._id } },
                { new: true }
            )

            const token = await getPhonePeAccessToken();

            return await createResponse(true, { merchantOrderId, amount: userSubscription?.payableAmount, phonepeToken: token?.access_token }, "Your subscription is ready. Please complete the payment to reserve it");
        } catch (error: any) {
            return createResponse(false, null, error?.message || "Error when purchaseing subscription plans by Partners")
        }
    }

    static async fetchSubscriptionPaymentstatus(data: any, partnerId: any): Promise<GenericResponse<any>> {
        try {
            const { merchantOrderId } = data;
          
            // fetchPaymentStatus
            const token = await getPhonePeAccessToken(); 
            if (!token?.access_token)
                return createResponse(false, null, "Failed to fetch PhonePe access token. Please try again later");

            const result = await fetchPaymentStatus(token?.access_token, merchantOrderId);
           
            if (result?.state == "COMPLETED") {
                const updateResponse = await partnerSubscriptionPaymentCompleted(merchantOrderId, result);
                return createResponse(true, { status: result?.state, details: updateResponse }, "payment status fetch successfully!");
            }

            if ((result?.state == "FAILED") || (result?.state == "PENDING")) {
                const updateResponse = await partnerSubscriptionPaymentFaild(merchantOrderId, result);
                return createResponse(true, { status: result?.state, details: updateResponse }, "payment status fetch successfully!");
            }

            return createResponse(true, { status: result?.state, details: result }, "payment status fetch successfully!");

        } catch (error: any) {
            return createResponse(false, null, error?.message || "Error when fetching payment status!");
        }
    }


    static async partnerWebSubscriptionPayNow(data: any, partnerId: any): Promise<GenericResponse<any>> {
        try {

            const { amount, merchantOrderId, phonepeToken } = data;
            const checkRequest = await UserSubscription.findOne({ merchantOrderId: merchantOrderId, status: "pending", userId: partnerId, payableAmount: amount });
            if (!checkRequest)
                return createResponse(false, null, "Request is not valid");
            const createPayment = await generateWebPhonePePaymentLink(phonepeToken, merchantOrderId, amount);
            return {
                success: true,
                data: {
                    "redirectLink": createPayment
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
