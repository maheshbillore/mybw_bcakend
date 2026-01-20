import Customer from "../models/customer.model.js";
import { GenericResponse, GenericResponseCode } from "../shared/type.js";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import {
    addCustomerWalletAmountFailed,
    addCustomerWalletAmountSuccess,
    addCustomerWalletPendingTrasncation,
    addSubscriptionPaymentPending,
    bookingPaymentDetails,
    bulkBidingPaymentReturn,
    calculateCouponWithSubscriptionPlanDiscount,
    calculatePortalCharge,
    checkBookingCancelRequest,
    checkCustomerType,
    checkIsValidPhoneNumber,
    checkOTPDisplay,
    checkReferralDetails,
    convertReferralPoints,
    createResponse, createResponseStatus, displayJobDateTime, fetchingSubscriptionPlans, filterServices, formatDateOrDay, getAdminId, getApplicateDetails, getBookingDetails, getBookingTransaction, getCustomer, getCustomerJobDetailsList, getJobBidingPartnerDetails, getJobDetails, getNearMeDoneJobs, getPlansDuration, getProfile, getRatingDetails, getReferralHistory, getRoleId, getStatusDisplayName, holdWalletAmount4Job, jobAndBidCancel, jobBookingCancel, jobBookingPaymentPending, jobPartnerBookedByWallet, languagesList, preparePushNotification, referralPointDetails, serviceRatingDetails, serviceWisePartnerCount, serviceWiseRatingDetails, timeRange, updateWalletAmount,
    validateFields,

} from "../utils/helper.js";
import { verifyCustomerWithFirebase } from "../utils/firebase.customer.js";
import Partner from "../models/partner.model.js";
import Category from "../models/category.model.js";
import Service from "../models/service.model.js";
import Categorytype from "../models/categorytype.model.js";
import Job from "../models/job.model.js";
import Wallet from "../models/wallet.model.js";
import { fetchPaymentStatus, generatePhonePePaymentLink, getPhonePeAccessToken } from "../utils/phonepe.js";

import Bid from "../models/bids.model.js";
import { format } from "timeago.js";
import mongoose, { Mongoose } from "mongoose";

import Booking from "../models/booking.model.js";
import { getJsonData } from "../utils/readJson.js";
import Notification from "../models/notification.model.js";
import { generateOTP } from "../utils/otp.util.js";
import Rating from "../models/rating.model.js";
import Bookmark from "../models/bookmark.model.js";
import Banner from "../models/banner.model.js";
import subscriptionPlansModel from "../models/subscriptionPlans.model.js";
import { activeGateway, activeGatewayId, addCustomerSubscriptionPaymentPending, bannerExireyDate, checkAccountNumber, checkCustomerSubscriptionPlans, checkIFSCCode, checkSurgePricing, customerCouponCodeCalculation, customerRefferalCode, customerSubscriptionPaymentCompleted, customerSubscriptionPaymentFaild, customerSubscriptionPlanType, customerTotalService, customerTotalWithdraw, customerWithdrawRequest, fetchingCustomerSubscriptionPlans, formatTime12Hr, getAppReviewList, getBankDetailsByIFSC, getBookingPaymentDetails, getPaymentMethod, getSocialLink, getSubscriptionTransactionDetail, getTopTenServices, getWalletTransaction, getWalletTransactionDetails, isValidUPIFormat } from "../utils/comman.js";
import UserSubscription from "../models/user.subscription.model.js";
import Setting from "../models/setting.model.js";
import CouponCode from "../models/coupon.code.model.js";
import logger from "../utils/logger.js";
import { info } from "console";
import Transaction from "../models/transaction.model.js";
import PaymentMethod from "../models/paymentMethod.model.js";
import { increaseCustomer, increasePartner, increaseServicePartnerAvl } from "../utils/seo_helper.js";
import { addCustomerRazorpayWalletAmountSuccess, addInitiateRazorpaySubscriptionOrder, addInitiateRazorpayWalletOrder, checkRazorpayPaymentStatus, customerRazorpaySubscriptionPaymentCompleted, getOrderPaymentStatus, initiateRazorpayOrder, paymentStatusArray, pendingMessages, rzp_auth, verifyRazorpayPayment } from "../utils/razorpay.js";
import { job_complete, subscription_plan_added, subscription_plan_expire, subscription_plan_failed, subscription_plan_pending, wallet_recharge_failed, wallet_recharge_pending, wallet_recharge_successfully, welcome } from "../utils/mail/customer.js";
import ReferralCode from "../models/referral.code.model.js";


export class CustomerService {
    static async getAllCustomers(
        currentPage: number,
        pageSize: number
    ): Promise<GenericResponse<any>> {
        try {
            const skip = (currentPage - 1) * pageSize;
            const [customers, totalItems] = await Promise.all([
                Customer.find({})
                    .populate({
                        path: "user",
                        select: "name email phone role isActive",
                    })
                    .sort({ _id: -1 })
                    .skip(skip)
                    .limit(pageSize)
                    .lean()
                    .sort({ createdAt: -1 }),
                Customer.countDocuments({}),
            ]);

            const totalPages = Math.ceil(totalItems / pageSize);

            if (!customers) {
                return {
                    success: false,
                    data: null,
                    message: "No customers found",
                };
            }

            return {
                success: true,
                data: {
                    customers,
                    pagination: {
                        currentPage,
                        pageSize,
                        totalItems,
                        totalPages,
                    },
                },
                message: "Customers fetched successfully",
            };
        } catch (error: any) {
            logger.error(`${error.message} Error fetching customers`);
            // console.error("Error in getAllCustomers:", error);
            throw new Error(
                error instanceof Error
                    ? error.message
                    : "Error fetching customers"
            );
        }
    }

    static async getACustomer(id: string): Promise<GenericResponse<any>> {
        try {
            const response = await Customer.findOne({ user: id }).populate([
                {
                    path: "user",
                    select: "name email phone isActive picture roleId",
                },
                {
                    path: "bookingHistory",
                    select: "partner service status timeSlot location paymentStatus createdAt totalAmount",
                    populate: [
                        {
                            path: "partner",
                            select: "name email role isActive phone",
                            populate: {
                                path: "user",
                                select: "name email phone role isActive",
                            },
                        },
                        {
                            path: "service",
                            select: "name description",
                        },
                    ],
                },
            ]);

            if (!response) {
                return {
                    success: false,
                    data: null,
                    message: "No customer found with id",
                };
            }
            return {
                success: true,
                data: response,
                message: "Customer fetched successfully",
            };
        } catch (error: any) {
            logger.error(`${error?.message} Error fetching customer by their customer id`);
            console.error(
                "Error fetching customer by their customer id",
                error
            );
            return {
                success: false,
                data: null,
                message: error?.response?.data?.message || error?.message,
            };
        }
    }

    static async signUp(data: any): Promise<GenericResponse<any>> {
        try {
            const { joinVia, fcm_token, latitude, longitude } = data;
            if (!joinVia) {
                return {
                    success: false,
                    data: null,
                    message: "Please mention join via google or phone"
                }
            }

            if (joinVia == "Phone") {
                const { idToken } = data;

                const token_result = await verifyCustomerWithFirebase(idToken) as any;
                if (token_result.error && token_result.error === "Invalid token") {
                    logger.info("Invalid token");
                    return {
                        success: false,
                        data: null,
                        message: token_result.error,
                    };
                }
                const checkPartner = await User.findOne({ phone: token_result.phone_number, role: "partner" });

                if (checkPartner) {
                    logger.info(`${token_result.phone_number} is already use with other Role user`);
                    return createResponse(false, null, "Phone is already use with other Role user");
                }


                const customer = await User.findOne({ phone: token_result.phone_number, role: "customer" });
                if (customer) {

                    const updatedUser = await User.findOneAndUpdate(
                        { _id: customer._id },  // Find condition
                        { $set: { fcm_token } },          // Update data
                        { new: true }                   // Return updated document
                    );

                    const updatedCustomer1 = await Customer.findOneAndUpdate(
                        { user: customer._id },  // Find condition
                        {
                            $set: {
                                latitude,
                                longitude,
                                location: {
                                    type: "Point",
                                    coordinates: [longitude, latitude], // [longitude, latitude]
                                }
                            }
                        },          // Update data
                        { new: true }                   // Return updated document
                    );

                    const tokens = jwt.sign(
                        { id: customer._id, role: customer.role },
                        process.env.JWT_SECRET!,
                        { expiresIn: "7d" }
                    );
                    const result: any = await getCustomer(customer?._id);
                    let customerName = result?.user?.name;
                    logger.info(`${customerName} have logged in successfully`);

                    return {
                        success: true,
                        data: {
                            token: tokens,
                            customer: result
                        },
                        message: "You have logged in successfully"
                    }
                }

                if (!customer) {
                    const user = await User.create({
                        uid: token_result?.uid,
                        phone: token_result?.phone_number,
                        joinVia: data?.joinVia,
                        role: "customer",
                        roleId: await getRoleId("customer"),
                        fcm_token,
                        isActive: true
                    });

                    const newCustomer = await Customer.create({
                        user: user._id,
                        profilePendingScreens: 1,
                        latitude,
                        longitude,
                        location: {
                            type: "Point",
                            coordinates: [longitude, latitude], // [longitude, latitude]
                        },
                    });


                    const tokens = jwt.sign(
                        { id: user._id, role: user.role },
                        process.env.JWT_SECRET!,
                        { expiresIn: "7d" }
                    );

                    const result: any = await getCustomer(user?._id);
                    let customerName = result?.user?.name;
                    logger.info(`${customerName} have registered successfully`);
                    return {
                        success: true,
                        data: {
                            token: tokens,
                            customer: result
                        },
                        message: "Customer registered successfully"
                    }

                }
            }

            if (joinVia == "Google") {
                const { email, phone } = data;
                if (!email) {
                    logger.info(`Email are required `);
                    return {
                        success: false,
                        data: null,
                        message: "Email are required !"
                    }
                }


                const checkPartner = await User.findOne({ email: email, role: "partner" });
                if (checkPartner) {
                    logger.info(`${email} is already use with other user`);
                    return createResponse(false, null, "Email is already use with other user");
                }

                const checkUser = await User.findOne({ email: email, role: "customer" });
                if (checkUser) {

                    const updatedUser = await User.findOneAndUpdate(
                        { _id: checkUser._id },  // Find condition
                        { $set: { fcm_token } },          // Update data
                        { new: true }                   // Return updated document
                    );

                    const updatedCustomer = await Customer.findOneAndUpdate(
                        { user: checkUser._id },  // Find condition
                        {
                            $set: {
                                latitude,
                                longitude,
                                location: {
                                    type: "Point",
                                    coordinates: [longitude, latitude], // [longitude, latitude]
                                }
                            }
                        },          // Update data
                        { new: true }                   // Return updated document
                    );

                    const tokens = jwt.sign(
                        { id: checkUser._id, role: checkUser.role },
                        process.env.JWT_SECRET!,
                        { expiresIn: "7d" }
                    );
                    const result: any = await getCustomer(checkUser?._id);
                    logger.info(`${result?.user?.name} have logged in successfully`);
                    return {
                        success: true,
                        data: {
                            token: tokens,
                            customer: result
                        },
                        message: "You have logged in successfully"
                    }
                }

                if (!checkUser) {
                    if (phone) {
                        let checkPartnerPhone = await User.findOne({ phone: phone, role: "partner" });
                        if (checkPartnerPhone) {
                            logger.info(`${phone} is already use with other user`);
                            return createResponse(false, null, "Phone is already use with other user");
                        }

                    }

                    let user = await User.create({
                        email: email,
                        role: "customer",
                        joinVia: data?.joinVia,
                        roleId: await getRoleId("customer"),
                        phone: phone,
                        fcm_token
                    })
                    let customer = await Customer.create({
                        user: user._id,
                        profilePendingScreens: 1,
                        latitude,
                        longitude,
                        location: {
                            type: "Point",
                            coordinates: [longitude, latitude], // [longitude, latitude]
                        },
                    });

                    let result: any = await getCustomer(user._id);

                    const tokens = jwt.sign(
                        { id: user._id, role: user.role },
                        process.env.JWT_SECRET!,
                        { expiresIn: "7d" }
                    );
                    logger.info(`${result?.user?.name} registered successfully`);
                    return {
                        success: true,
                        data: {
                            token: tokens,
                            customer: result
                        },
                        message: "Customer registered successfully"
                    }

                }

            }

            return {
                success: false,
                data: null,
                message: "Please mention join via google or phone"
            }


        } catch (error: any) {
            logger.error(`${error?.message} Error when customer ragistration`);
            return {
                success: false,
                data: null,
                message: error?.message ?? "Oops! Something went wrong. Please try again."
            }
        }
    }


    static async login(data: any): Promise<GenericResponse<any>> {
        try {
            const { joinVia, fcm_token } = data;
            if (!joinVia) {
                return {
                    success: false,
                    data: null,
                    message: "Join with your phone or email."
                }
            }

            if (joinVia == "Phone") {
                const { idToken } = data;
                const token_result = await verifyCustomerWithFirebase(idToken) as any;

                if (token_result.error && token_result.error === "Invalid token") {
                    return {
                        success: false,
                        data: null,
                        message: token_result.error,
                    };
                }


                let user = await User.findOne({ phone: token_result.phone_number, role: "customer" });
                if (!user) {
                    logger.info(`${token_result.phone_number} You are not registered`);
                    return {
                        success: false,
                        data: null,
                        message: "You are not registered. Please sign up and try again"
                    }
                }


                const updatedUser = await User.findOneAndUpdate(
                    { _id: user._id },  // Find condition
                    { $set: { fcm_token } },          // Update data
                    { new: true }                   // Return updated document
                );


                const token = jwt.sign(
                    { id: user._id, role: user.role },
                    process.env.JWT_SECRET!,
                    { expiresIn: "7d" }
                )
                const result = await getCustomer(user._id);
                logger.info(`${updatedUser?.phone} have logged in successfully`);
                return {
                    success: true,
                    data: {
                        token: token,
                        customer: result
                    },
                    message: "You have logged in successfully"
                }
            }

            if (joinVia == "Google") {
                const { email } = data;
                let user = await User.findOne({ email: email, role: "customer" });

                if (!user) {
                    logger.info(`${email} are not registered. Please sign up and try again`);
                    return {
                        success: false,
                        data: null,
                        message: "You are not registered. Please sign up and try again"
                    }
                }


                const updatedUser = await User.findOneAndUpdate(
                    { _id: user._id },  // Find condition
                    { $set: { fcm_token } },          // Update data
                    { new: true }                   // Return updated document
                );

                const token = jwt.sign(
                    { id: user._id, role: user.role },
                    process.env.JWT_SECRET!,
                    { expiresIn: "7d" }
                )

                const result = await getCustomer(user._id);
                logger.info(`${updatedUser?.email} have logged in successfully`);
                return {
                    success: true,
                    data: {
                        token: token,
                        customer: result
                    },
                    message: "You have logged in successfully"
                }
            }

            logger.error(`Error when customer try to login`);
            return {
                success: false,
                data: null,
                message: "Oops! Something went wrong. Please try again."
            }


        } catch (error: any) {
            logger.error(`${error?.message} Error when customer try to login`);
            return {
                success: false,
                data: null,
                message: "Oops! Something went wrong. Please try again."
            }
        }
    }

    static async profileUpdate(data: any, file: any, customerId: any): Promise<GenericResponse<any>> {
        try {
            const { name, email, dob, phone, isGuest } = data;

            if (isGuest === "true") {
                const customer = await Customer.findOne({ user: customerId });

                if (customer) {
                    customer.profilePendingScreens = 0;
                    customer.isGuest = isGuest;

                    if (!customer.referralCode) {
                        customer.referralCode = await customerRefferalCode("GUEST");
                    }
                    await customer.save();
                }

                const result = await getCustomer(customerId);

                logger.info(`customerId-${customerId} logged in as guest`);
                return createResponse(true, { customer: result }, "You are logged in as a guest");
            }

            if (!email || !phone) {
                return createResponse(false, null, "Customer Email and Phone are required!");
            }

            const isValidPhone = await checkIsValidPhoneNumber(phone);
            if (!isValidPhone) {
                logger.info(`Invalid phone: ${phone}`);
                return createResponse(false, null, "Invalid phone number, please try again");
            }

            const user = await User.findById(customerId);
            if (!user) return createResponse(false, null, "User not found");

            const customer = await Customer.findOne({ user: customerId });
            if (!customer) return createResponse(false, null, "Customer not found");

            if (name) user.name = name;

            if (user.joinVia === "Phone") {
                const emailExists = await User.findOne({ email, _id: { $ne: customerId } });
                if (emailExists) return createResponse(false, null, "Email is already used by another user");
                user.email = email;

            } else if (user.joinVia === "Google") {
                const phoneExists = await User.findOne({ phone, _id: { $ne: customerId } });
                if (phoneExists) return createResponse(false, null, "Phone is already used by another user");
                user.phone = phone;
            }

            if (dob) {
                user.dob = dob as string;
            }
            await user.save();

            const customerUpdate: any = {
                isGuest: isGuest ?? customer.isGuest,
            };

            if (file) customerUpdate.profile = file.filename;
            let getProfilePendingScreens = customer.profilePendingScreens || 0;
            if (customer.profilePendingScreens === 1) {
                customerUpdate.profilePendingScreens = 0;
            }

            if (!customer.referralCode) {
                customerUpdate.referralCode = await customerRefferalCode(user?.name as string);
            }

            if (dob) {
                customerUpdate.dob = new Date(dob);
            }

            await Customer.updateOne({ user: user._id }, { $set: customerUpdate });
            const result = await getCustomer(customerId);
            if (getProfilePendingScreens > 0) {
                await welcome({ email: result?.user?.email, name: result?.user?.name });
            }
            return createResponse(true, { customer: result }, "Your profile has been successfully updated");

        } catch (error: any) {
            logger.error(`${error.message} Error updating user profile`);
            return createResponse(false, null, error.message || "Oops! Something went wrong.");
        }
    }


    static async addressUpdate(data: any, file: any, customerId: any): Promise<GenericResponse<any>> {
        try {

            const { address, latitude, longitude, city, state, country, pincode } = data;

            if (!state || !city || !address || !latitude || !longitude || !country || !pincode) {
                return {
                    success: false,
                    data: null,
                    message: "All field are required"
                }
            }

            const customer = await Customer.findOne({ user: customerId });
            if (customer) {
                customer.address = address;
                customer.city = city;
                customer.state = state;
                customer.country = country;
                customer.pincode = pincode;
                customer.latitude = latitude;
                customer.longitude = longitude;
                if (customer.profilePendingScreens == 2) {
                    customer.profilePendingScreens = 0;
                }
                await customer.save();
                const result = await getCustomer(customerId);
                return {
                    success: true,
                    data: {
                        customer: result
                    },
                    message: "Your address has been updated successfully"
                }

            }

            return {
                success: false,
                data: null,
                message: "Oops! Something went wrong. Please try again."
            }
        } catch (error) {
            return {
                success: false,
                data: null,
                message: "Oops! Something went wrong. Please try again."
            }
        }
    }

    static async bookedPartners(customerId: any): Promise<GenericResponse<any>> {
        try {
            const activePartnerIds = await Booking.find({
                customerId,
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
            }).distinct("partnerId");


            const bookedPartners = await Partner.find({ user: { $in: activePartnerIds } }).populate('user');
            if (bookedPartners) {
                bookedPartners.map((partner) => {
                    if (partner?.profile) {
                        partner.profile = `${process.env.BASE_URL}/uploads/profile/${partner.profile}`;
                    }
                })
            }
            return createResponse(true, { bookedPartners }, "partner list fetched succssfully");
        } catch (error: any) {
            logger.error(`${error.messages} Error when fetching partners`);
            return createResponse(false, null, "Error when fetching partners");
        }
    }
    static async getCategorys(customerId: any): Promise<GenericResponse<any>> {
        try {
            const [allCategories, topCategories] = await Promise.all([
                Category.find({ status: "active" }).select("name image description"),
                Category.find({ status: "active" })
                    .sort({ _id: -1 })
                    .limit(4)
                    .select('name image description')
            ])


            allCategories.forEach((category: any) => {
                category.image = category.image
                    ? `${process.env.BASE_URL}/uploads/categories/${category.image}`
                    : null;
            });

            const nearMeCategories = [...allCategories];

            topCategories.forEach((category: any) => {
                category.image = category.image
                    ? `${process.env.BASE_URL}/uploads/categories/${category.image}`
                    : null;
            });

            return createResponse(true, { allCategories, topCategories, nearMeCategories }, "Category fetched successfully");
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching category`);
            return createResponse(false, null, "Error when fetching category");
        }
    }

    static async categoryServices(customerId: any, categoryId: any): Promise<GenericResponse<any>> {
        try {

            const [category, services] = await Promise.all([
                Category.findById({ _id: categoryId }, 'name'),
                Service.find({ category: categoryId }, 'name pricingTiers')
            ]);

            const serviceRating = services.map(service => ({
                ...service.toObject(), // convert Mongoose doc to plain object
                rating: 4.5,           // static or calculated value
                totalRating: 90,
                working: "50 workers available"          // static or dynamic
            }));

            return createResponse(true, { category, "services": serviceRating }, "Services fetched successfully !")
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching category services`);
            return createResponse(false, null, "Error when fetching category services");
        }
    }
    static async getSubCategory(categoryId: any): Promise<GenericResponse<any>> {
        try {
            if (!categoryId)
                createResponse(false, null, "Category Id not found");
            const category = await Category.findOne({ _id: categoryId }).lean();
            if (category) {
                category.image = category?.image
                    ? `${process.env.BASE_URL}/uploads/categories/${category?.image}`
                    : "";
            }
            const subacategory = await Categorytype.find({ category: categoryId, status: "active" });
            subacategory.forEach((sub: any) => {
                sub.image = sub.image
                    ? `${process.env.BASE_URL}/uploads/sub-categories/${sub.image}`
                    : null;
            });

            return createResponse(true, { category, subacategory }, "fetch sub category successfully");
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching subcategory`);
            return createResponse(false, null, "Error when fetching subcategory");
        }
    }


    static async getServices(subcategoryId: any, customerId: any): Promise<GenericResponse<any>> {
        try {
            const subacategory = await Categorytype.findOne({ _id: subcategoryId });

            if (subacategory) {
                subacategory.image = subacategory?.image
                    ? `${process.env.BASE_URL}/uploads/sub-categories/${subacategory?.image}`
                    : "";
            }

            const bookmarkIds = (await Bookmark.find({ customerId }).lean().distinct("serviceId"))
                .map(id => id.toString());

            const services: any = await Service.find({ categorytype: subcategoryId, status: "active" }, { surgePricing: 0, ratingDetails: 0 }).lean();
            const servicesIds = services.map((element: any) => {
                return element?._id.toString();
            });

            const serviceRating = await serviceWiseRatingDetails(servicesIds);
            const serviceWorker = await serviceWisePartnerCount(servicesIds, customerId);

            let pricingTiersType = await customerSubscriptionPlanType(customerId);
            const checkprisingtype = await checkCustomerSubscriptionPlans(customerId);
            const increaseServicePartner = await increaseServicePartnerAvl();
            const updateServices = await Promise.all(
                services.map(async (service: any) => {
                    const isBookmarked = bookmarkIds.includes(service._id.toString());
                    const ratingCount = serviceRating[service._id.toString()] ? serviceRating[service._id.toString()]?.averageRating : 0;
                    const workerCount = serviceWorker[service._id.toString()] ? serviceWorker[service._id.toString()]?.totalPartners : 0;
                    const price = await checkCustomerType(service, customerId, pricingTiersType);

                    return {
                        ...service,
                        price,
                        bookmarkStatus: isBookmarked,
                        workerAvl: (workerCount + increaseServicePartner),
                        averageRating: ratingCount,
                        image: service.image
                            ? `${process.env.BASE_URL}/uploads/servicesImage/${service.image}`
                            : null
                    };
                })
            )
            return createResponse(true, { subacategory, services: updateServices }, "Fetch services successfully !");
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching services`);
            return createResponse(false, null, "Error when fetching services");
        }
    }

    static async getServiceDetail(serviceId: any, customerId: any): Promise<GenericResponse<any>> {
        try {
            if (!serviceId)
                return createResponse(false, null, "Service Id is not found");
            const bookmark = await Bookmark.findOne({ serviceId, customerId });
            const partnerServiceCount = await serviceWisePartnerCount([serviceId], customerId);
            const ratingObj = await serviceRatingDetails(serviceId);
            let pricingTiersType = await customerSubscriptionPlanType(customerId);
            const service: any = await Service.findOne({ _id: serviceId }).select("-surgePricing");
            if (!service)
                return createResponse(false, null, "service is not found");

            const countCoupon = await CouponCode.countDocuments({ status: "active", target: "customer" });
            const increaseServicePartner = await increaseServicePartnerAvl();
            service.isCouponActive = countCoupon > 0 ? true : false;
            service.bookmarkStatus = bookmark ? true : false;
            service.image = service.image ? `${process.env.BASE_URL}/uploads/servicesImage/${service.image}` : "";
            service.price = await checkCustomerType(service, customerId, pricingTiersType);
            service.ratingDetails = ratingObj //await serviceRatingDetails(serviceId); 
            service.workerAvl = partnerServiceCount[serviceId] ? (partnerServiceCount[serviceId]?.totalPartners + increaseServicePartner) : 0;
            const relatedService = await Service.find({ category: service?.category, _id: { $ne: service?._id } }, { surgePricing: 0 });
            relatedService.forEach((relatedService: any) => {
                relatedService.image = relatedService.image
                    ? `${process.env.BASE_URL}/uploads/servicesImage/${relatedService.image}`
                    : null;
            });

            const previousDetails = await Customer.findOne({ user: customerId }).select("previousAddressDetails previousContactDetails");

            return createResponse(true, { service, relatedService, previousDetails }, "service details fetched successfully!");
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching service details`);
            return createResponse(false, null, "Error when fetching service details");
        }
    }

    static async addJobBasicDetails(data: any, customerId: any, files: { [fieldname: string]: Express.Multer.File[] }): Promise<GenericResponse<any>> {
        try {

            const { serviceId, title, description, job_date, job_time, estimated_time, full_address, latitude, longitude, price, couponCode, isEmergencyService, isVocationalBannerService, vocationalBannerServiceId } = data;
            const requiredFields = {
                serviceId: "Service Id is required",
                title: "Title is required",
                job_date: "Job date is required",
                job_time: "Job time is required",
                full_address: "Full address is required",
                price: "Price is required",
            };

            for (const [field, message] of Object.entries(requiredFields)) {
                if (!data[field]) {
                    return createResponse(false, null, message);
                }
            }

            let images: string[] = [];
            if (files?.jobImages) {
                images = files.jobImages.map(file => file.filename);
            }

            const resSurgePricing = await checkSurgePricing({ serviceId, job_date, job_time }, customerId);
            const couponResponse = await CouponCode.findOne({ couponCode, target: "customer", status: "active" });
            let couponObj = {};
            if (couponResponse?.couponCode && couponCode) {
                const couponDetails = await customerCouponCodeCalculation(couponResponse, resSurgePricing?.price);

                couponObj = {
                    isCouponApply: true,
                    couponCodeDetails: {
                        couponCodeId: couponDetails?.couponCodeId,
                        code: couponDetails?.couponCode,
                        discount: couponDetails?.discount,
                        type: couponDetails?.discountType,
                        beforePrice: couponDetails?.service_price,
                        afterPrice: couponDetails?.totalPayable,
                    }
                }
                resSurgePricing.price = couponDetails?.totalPayable;
                logger.info(`${customerId} coupon code applyed`);
            }

            let createJob = {
                serviceId,
                customerId,
                title,
                description,
                job_date,
                job_time,
                estimated_time,
                full_address,
                latitude,
                longitude,
                isEmergencyService,
                isVocationalBannerService,
                location: {
                    type: "Point",
                    coordinates: [longitude, latitude], // [longitude, latitude]
                },
                image: images,
                price: resSurgePricing?.price,
                inSurgePrice: resSurgePricing?.inSurgePrice,
                vocationalBannerServiceId
            };

            if (resSurgePricing?.inSurgePrice) {
                logger.info(`CID-${customerId} SID-${serviceId} surge price apply`);
            }

            createJob = {
                ...createJob,
                ...couponObj
            }


            await Customer.findOneAndUpdate(
                {
                    user: customerId
                },
                {
                    $set: {
                        latitude,
                        longitude,
                        location: {
                            type: "Point",
                            coordinates: [longitude, latitude], // [longitude, latitude]
                        },
                    }
                }, // update with new data
                { upsert: true, new: true } // create if not exist, return updated doc
            );



            const response = await Job.findOneAndUpdate(
                {
                    serviceId,
                    customerId,
                    title,
                    job_date,
                    status: "pending"
                },
                { $set: createJob }, // update with new data
                { upsert: true, new: true } // create if not exist, return updated doc
            );


            const customerRes = await Customer.findOneAndUpdate(
                { user: customerId, "previousAddressDetails.fullAddress": full_address },
                {
                    $set: {
                        "previousAddressDetails.$.latitude": latitude,
                        "previousAddressDetails.$.longitude": longitude,
                    },
                },
                { new: true }
            );

            if (!customerRes) {
                // No matching address found → push new one
                await Customer.findOneAndUpdate(
                    { user: customerId },
                    {
                        $push: {
                            previousAddressDetails: {
                                fullAddress: full_address,
                                latitude,
                                longitude,
                            },
                        },
                    },
                    { new: true }
                );
            }

            return createResponse(true, { job: response }, "Job basic details add successfully");
        } catch (error: any) {
            logger.error(`${error?.message} Error when adding job basic details`);
            return createResponse(false, null, error?.message || "Error when adding job basic details");
        }
    }

    static async jobContactDetail(data: any, customerId: any): Promise<GenericResponse<any>> {
        try {
            const { jobId, contact_name, contact_number, contact_email } = data;
            if (!jobId)
                return createResponse(false, null, "Job Id is required");
            if (!contact_name)
                return createResponse(false, null, "contact name is required");
            if (!contact_number)
                return createResponse(false, null, "contact number is required");

            await Job.findByIdAndUpdate(jobId, {
                contact_name,
                contact_number,
                contact_email,
            }
            );


            const customerRes = await Customer.findOneAndUpdate(
                { user: customerId, "previousContactDetails.contactName": contact_name },
                {
                    $set: {
                        "previousContactDetails.$.contactNumber": contact_number,
                        "previousContactDetails.$.contactEmail": contact_email,
                    },
                },
                { new: true }
            );

            if (!customerRes) {
                // No matching address found → push new one
                await Customer.findOneAndUpdate(
                    { user: customerId },
                    {
                        $push: {
                            previousContactDetails: {
                                contactName: contact_name,
                                contactNumber: contact_number,
                                contactEmail: contact_email,
                            },
                        },
                    },
                    { new: true }
                );
            }

            const updateJob = await getJobDetails(jobId);
            if (!updateJob)
                return createResponse(true, null, "Job details Not found");


            return createResponse(true, { job: updateJob }, "Job Contact Details add successfully");
        } catch (error: any) {
            logger.error(`${error?.message} Error when adding job contact details`);
            return createResponse(false, null, error?.message || "Error when adding job contact details");
        }
    }

    static async jobConfirmation(data: any, customerId: any): Promise<GenericResponse<any>> {
        try {
            const { jobId } = data;
            if (!jobId)
                return createResponse(false, null, "Jobid is not found");
            /*
            const [checkJob, checkWallet] = await Promise.all([
                Job.findById(jobId, "price"),
                Customer.findOne({ user: customerId }, "wallet_amount"),
            ]);

            if (!checkJob || !checkWallet) {
                return createResponse(false, null, "Job or Wallet not found.");
            }

            if (checkJob.price > checkWallet.wallet_amount) {
                return createResponse(false, null, "Insufficient funds. Please recharge and try again.");
            }

            const holdAmount = await holdWalletAmount4Job(checkJob, customerId);
            await updateWalletAmount(customerId); */
            await Job.findByIdAndUpdate(jobId, { status: "open" });
            const updateJob: any = await getJobDetails(jobId);
            const notification_res = await preparePushNotification("CUSTOMER_JOB_POST", "RELATED_PARTNERS", jobId);
            logger.info(`CustomerId-${customerId} job(${updateJob?.title}) is post successfully`);
            return createResponse(true, { job: updateJob }, "Your Job is post successfully");
        } catch (error: any) {
            logger.error(`${error?.message} Error when job confirmation`);
            return createResponse(false, null, error?.message || "Error when job confirmation");
        }
    }

    static async addWalletAmount(data: any, customerId: any): Promise<GenericResponse<any>> {
        try {
            if (!customerId)
                return createResponse(false, null, "Customer Id is required");
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
                    User.findById(customerId).select("name email phone").lean(),
                ]);
                if (!razorpayOrder?.amount)
                    return createResponse(false, null, "Something went wronge");

                await addInitiateRazorpayWalletOrder(razorpayOrder, customerId);
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
                customerId,
                adminId,
                gatewayId,
                paymentStatus: "PENDING",
                paymentGateway: "PHONEPE",
                merchantOrderId,
                invoiceNo: `INV${Date.now()}`,
                amount: data?.amount,
                walletType: "added"
            });
            const walletTransaction = await addCustomerWalletPendingTrasncation(merchantOrderId);

            const token = await getPhonePeAccessToken();
            if (!token?.access_token)
                return createResponse(false, null, "Failed to fetch PhonePe access token. Please try again later");

            logger.info(`${merchantOrderId} Your wallet amount is ready. Please complete the payment to add it`);
            return await createResponse(true, { paymentGateway: "PHONEPE", result: { merchantOrderId, amount: amount, phonepeToken: token?.access_token } }, "Your wallet amount is ready. Please complete the payment to add it");

        } catch (error: any) {
            logger.error(`${error?.message} Error when adding wallet amount`);
            return createResponse(false, null, error?.message || "Error when adding wallet amount")
        }
    }

    static async addWalletConfirm(data: any, customerId: any): Promise<GenericResponse<any>> {
        try {
            const { amount, merchantOrderId, phonepeToken } = data;
            const checkRequest = await Wallet.findOne({ merchantOrderId, paymentStatus: "PENDING", customerId, amount });
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
            logger.error(`${data?.merchantOrderId} Payment link not generate`);
            return {
                success: false,
                data: null,
                message: error
            }
        }
    }

    static async walletAmountStatus(data: any, customerId: any): Promise<GenericResponse<any>> {
        try {
            const { merchantOrderId, phonepeToken } = data;
            if (!merchantOrderId)
                return createResponse(false, null, "merchantOrderId is required");
            if (!phonepeToken)
                return createResponse(false, null, "token is missing");

            const result = await fetchPaymentStatus(phonepeToken, merchantOrderId);
            if (result?.state == "COMPLETED") {
                const response = await addCustomerWalletAmountSuccess(merchantOrderId, result);
                await wallet_recharge_successfully(merchantOrderId);
                return createResponse(true, { response }, "wallet amount added successfully !");
            }

            if ((result?.state == "FAILED") || (result?.state == "PENDING")) {
                const response = await addCustomerWalletAmountFailed(merchantOrderId, result);
                if (result?.state == "PENDING") {
                    await wallet_recharge_pending(merchantOrderId);
                } else {
                    await wallet_recharge_failed(merchantOrderId);
                }
                return createResponse(false, { response }, `Wallet amount is ${result?.state}`);
            }


            return createResponse(false, { result }, `Wallet transaction has been ${result?.state}`);
        } catch (error: any) {
            logger.error(`${error?.message} Error when check payment status`);
            return createResponse(false, null, error?.message || "Error when fetching wallet payment status");
        }
    }

    static async getProfile(customerId: any): Promise<GenericResponse<any>> {
        try {
            const customer = await getCustomer(customerId);
            return createResponse(true, { customer }, "Customer profile get successfully !")
        } catch (error: any) {
            logger.error(`${error?.message}-customerId ${customerId} Error when fetching customer details`);
            return createResponse(false, null, error?.message || "Error when fetching customer details")
        }
    }

    static async upcommingJobs(customerId: any, lastId: any, limit: string, searchtext: string): Promise<GenericResponse<any>> {
        try {
            if (!customerId)
                return createResponse(true, null, "Customer id is not found");


            const query: any = { status: { $in: ["open", "confirmation_Pending", "confirmed"] }, customerId };
            if (lastId) {
                query._id = { $lt: lastId }; // get jobs older than last loaded one
            }

            const allJobsDetails: any = await getCustomerJobDetailsList(query, limit, searchtext);


            return createResponse(true, { upcommingJobs: allJobsDetails?.allJobs, lastId: allJobsDetails?.lastId }, "fetch upcomming jobs successfully !");
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching upcomming jobs`);
            return createResponse(false, null, error?.message || "Error when fetching upcomming jobs")
        }
    }

    static async getJobAndBidDetails(customerId: any, jobId: any): Promise<GenericResponse<any>> {
        try {
            if (!customerId)
                return createResponse(false, null, "Customer Id is required");
            if (!jobId)
                return createResponse(false, null, "Job id is requred");

            const checkJob = await Job.findOne({ _id: jobId });
            if (!checkJob)
                return createResponse(false, null, "Job not found");

            const randomOTP = await generateOTP();
            const resUpdate = await Job.findByIdAndUpdate(
                jobId,
                { $set: { otp: randomOTP } },
                { new: true, lean: true } // return updated doc, skip mongoose overhead
            );

            let jobDetails = await getJobDetails(jobId);
            let DupjobDetails: any = {
                ...jobDetails,
                specialInstruction: "Bring all required tools and replacement tab",
                cancellationPolicy: "Free cancellation up to 2 hours before the scheduled time."
            };

            const bidDetails = await getApplicateDetails(jobId);
            let job_booking_slot = await timeRange(DupjobDetails?.job_time);
            let bookingday = await formatDateOrDay(DupjobDetails?.job_date);
            const bookingSlot = await Booking.findOne({ _id: DupjobDetails?.bookingId }).select("partner_availability_time basePrice extraWorkAmount totalAmount").populate("extraWorkHistory");
            let partner_scheduled_slot: string = "";
            if (bookingSlot) {
                partner_scheduled_slot = await timeRange(bookingSlot?.partner_availability_time);
                DupjobDetails.price = bookingSlot?.basePrice;
                DupjobDetails.extraWorkAmount = bookingSlot?.extraWorkAmount;
                DupjobDetails.totalAmount = bookingSlot?.totalAmount;
                DupjobDetails.extraWorkHistory = bookingSlot?.extraWorkHistory;
            }

            const checkOTPstatus = await checkOTPDisplay(DupjobDetails.status);
            if (checkOTPstatus == false) {
                DupjobDetails.otp = null;
            }


            return createResponse(true, { jobDetails: DupjobDetails, bidDetails, bookingday, job_booking_slot, partner_scheduled_slot }, "Get Job details successfully!");
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching job details`);
            return createResponse(false, null, error?.message || "Error when fetching job details");
        }
    }

    static async getJobBidPartnerDetails(jobId: any, partnerId: any): Promise<GenericResponse<any>> {
        try {
            let checkBooking = await Job.findOne({ _id: jobId });
            const biddetails = await Bid.findOne({ jobId, partnerId });
            if (!checkBooking || !biddetails)
                return createResponse(false, null, "Your Job or bid is not found");

            let getpartner: any = await getJobBidingPartnerDetails(jobId, partnerId);

            return createResponse(true, { user: getpartner }, "Bit Partner details fetch successfully !");
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching partner details`);
            return createResponse(false, null, error?.message || "Error when fetching partner details");
        }
    }

    static async jobBindPartner(jobId: any, partnerId: any): Promise<GenericResponse<any>> {
        const session = await mongoose.startSession();
        try {
            await session.startTransaction();
            const jobDetails: any = await Bid.findOne({ jobId, partnerId })
                .select("availableTime price message partnerId customerId job_date")
                .populate("jobId", "job_date job_time full_address latitude longitude serviceId").session(session);
            if (!jobDetails)
                return createResponse(false, null, "Job or Partner details not found");
            const partnerLocation = await Partner.findOne({ user: partnerId }).select("latitude longitude").session(session);

            const getPortalFeePercentage = await Service.findOne({ _id: jobDetails?.jobId?.serviceId }).select("partnerCommissionRate isPrepaidService");
            const servicePortalPercentage = getPortalFeePercentage?.partnerCommissionRate as number || 0;
            const calculatedPortalfee = await calculatePortalCharge(servicePortalPercentage, jobDetails?.price);

            const BookingObj = {
                portalFeePercentage: servicePortalPercentage,
                portalFee: calculatedPortalfee?.portalFee,
                getNetAmount: calculatedPortalfee?.getNetAmount,
                customerId: jobDetails?.customerId,
                partnerId: jobDetails?.partnerId,
                serviceId: jobDetails?.jobId?.serviceId,
                jobId: jobDetails?.jobId?._id,
                partner_availability_time: jobDetails?.availableTime,
                job_startAt: null,
                job_endAt: null,
                booking_date: jobDetails?.jobId?.job_date,
                job_time: jobDetails?.jobId?.job_time,
                location: jobDetails?.jobId?.full_address,
                partner_current_latitude: partnerLocation?.latitude,
                partner_current_longitude: partnerLocation?.longitude,
                job_latitude: jobDetails?.jobId?.latitude,
                job_longitude: jobDetails?.jobId?.longitude,
                basePrice: jobDetails?.price,
                totalAmount: jobDetails?.price,
            };

            const checkIfExist = await Booking.findOne({
                customerId: jobDetails?.customerId,
                partnerId: jobDetails?.partnerId,
                serviceId: jobDetails?.jobId?.serviceId,
                jobId: jobDetails?.jobId?._id,
                booking_date: jobDetails?.jobId?.job_date,
                job_time: jobDetails?.jobId?.job_time,
            }).session(session);

            // ✅ Single upsert instead of check + create/update
            const response = await Booking.findOneAndUpdate(
                {
                    customerId: jobDetails.customerId,
                    serviceId: jobDetails.jobId?.serviceId,
                    jobId: jobDetails.jobId?._id,
                    booking_date: jobDetails.jobId?.job_date,
                    job_time: jobDetails.jobId?.job_time,
                },
                { $set: BookingObj },
                { upsert: true, new: true, session }
            );


            let updateJobStatus = getPortalFeePercentage?.isPrepaidService ? "confirmation_Pending" : "confirmation_Pending";
            await Job.updateOne({ _id: jobId }, { $set: { bookingId: response?._id, status: updateJobStatus } }).session(session);

            await session.commitTransaction();

            const [bookingDetails, getpartner] = await Promise.all([
                getBookingDetails(response?._id),
                getJobBidingPartnerDetails(jobId, partnerId)
            ]);

            return createResponse(true, { bookingDetails, partnerDetails: getpartner }, "Partner booked with job successfully");
        } catch (error: any) {
            await session.abortTransaction();

            logger.error(`${error?.message} Error when booked partner with job`);
            return createResponse(false, null, error?.message || "Error when booked partner with job");
        } finally {
            await session.endSession();
        }
    }

    static async getPreviewBookingDetails(bookingId: any): Promise<GenericResponse<any>> {
        try {
            let checkBooking = await Booking.findOne({ _id: bookingId });
            if (!checkBooking)
                return createResponse(false, null, "Your Booking is not found");
            const bookingDetails = await getBookingDetails(bookingId);
            if (!bookingDetails)
                return createResponse(false, null, "Job details not found");
            let getpartner: any = await getJobBidingPartnerDetails(bookingDetails?.jobId, bookingDetails?.partnerId);

            let job_booking_slot = await timeRange(bookingDetails?.job_time);
            let bookingday = await formatDateOrDay(bookingDetails?.booking_date);
            let partner_scheduled_slot: string = "";
            if (bookingDetails) {
                partner_scheduled_slot = await timeRange(bookingDetails?.partner_availability_time);
            }

            return createResponse(true, { bookingDetails, partnerDetail: getpartner, bookingday, job_booking_slot, partner_scheduled_slot }, "Booking details fetch successfully !");
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching booking details`);
            return createResponse(false, null, error?.message || "Error when fetching booking details");
        }
    }

    static async jobBookingConfirme(customerId: any, data: any): Promise<GenericResponse<any>> {

        try {
            const checkbookingId = await Booking.findOne({ _id: data?.bookingId });

            if (!checkbookingId)
                return createResponse(false, null, "Booking details not found");

            const [bidDeclined, bidAcceept] = await Promise.all([
                Bid.updateMany(
                    { jobId: checkbookingId?.jobId, status: "pending" },
                    { status: "declined" }
                ),
                Bid.updateOne({ jobId: checkbookingId?.jobId, partnerId: checkbookingId?.partnerId }, { $set: { status: "accepted" } })
            ]);

            const [acceptedPartner, declinedPartners, bulkDeclinedReturn] = await Promise.all([
                preparePushNotification("accepted", checkbookingId?.partnerId?.toString()!, checkbookingId?.jobId.toString()!),
                preparePushNotification("declined", "JOB_REACTED_PARTNERS", checkbookingId?.jobId.toString()),
                bulkBidingPaymentReturn(checkbookingId?.jobId, ["declined"], "Declined job")
            ])

            const response = await Job.updateOne({ bookingId: data?.bookingId }, { $set: { status: "confirmed" } });
            const bookingDetails = await getBookingDetails({ _id: data?.bookingId });
            logger.info(`BookingId-${checkbookingId?._id} Job Booking confimred with PartnerId- ${checkbookingId?.partnerId} successfully`);
            return createResponse(true, { bookingDetails: bookingDetails }, "Your job booking has been successfully confirmed");
        } catch (error: any) {
            logger.error(`${error?.message} Error when booking confirm`);
            return createResponse(false, null, error?.message || "something went wronge");
        }

    }

    static async jobBookingConfirmeOld(customerId: any, data: any): Promise<GenericResponse<any>> {

        try {
            const checkbookingId = await Booking.findOne({ _id: data?.bookingId });
            if (!checkbookingId)
                return createResponse(false, null, "Booking details not found");

            const [checkBooking, checkWallet] = await Promise.all([
                Booking.findById(data?.bookingId, "totalAmount status"),
                Customer.findOne({ user: customerId }, "wallet_amount"),
            ]);

            if (!checkBooking || !checkWallet) {
                return createResponse(false, null, "Booking or Wallet not found.");
            }

            if (checkBooking?.status == "confirmed") {
                return createResponse(false, null, "Your job worker is already booked");
            }
            if (checkBooking.totalAmount <= checkWallet.wallet_amount) {
                const bookedByWallet = await jobPartnerBookedByWallet(data?.bookingId);
                return createResponse(bookedByWallet?.success, { paymentBy: "wallet" }, bookedByWallet?.message);
            }


            const transactionRes = await jobBookingPaymentPending(data?.bookingId);
            if (transactionRes?.success == true) {
                let merchantOrderId = transactionRes?.data?.merchantOrderId;
                let amount = transactionRes?.data?.amount;
                let access_token = transactionRes?.data?.access_token;
                const createPayment = await generatePhonePePaymentLink(access_token, merchantOrderId, amount);

                return createResponse(true, { paymentBy: "upi", merchantOrderId, "redirectLink": createPayment }, "Payment link is generate successfuly !");
            } else {
                return createResponse(transactionRes?.success, transactionRes?.data, transactionRes?.message);
            }


        } catch (error: any) {
            return createResponse(false, null, error?.message || "Error when booking confired");
        } finally {
        }
    }

    static async bookingPaymentStatus(merchantOrderId: string): Promise<GenericResponse<any>> {
        try {
            const token = await getPhonePeAccessToken();
            if (!token?.access_token)
                return createResponse(false, null, "Failed to fetch PhonePe access token. Please try again later");

            const checkBooking = await Wallet.findOne({ merchantOrderId }).select("bookingId status paymentStatus");
            if (!checkBooking)
                return createResponse(false, null, "Invalid required please check your merchantOrderId");

            if (checkBooking.paymentStatus == "COMPLETED")
                return createResponse(false, "null", "Your booking payment is already done");

            const result = await fetchPaymentStatus(token?.access_token, merchantOrderId);
            if (result?.state == "COMPLETED") {
                const response = await addCustomerWalletAmountSuccess(merchantOrderId, result);
                if (response?.success == true) {
                    const bookedByWallet = await jobPartnerBookedByWallet(checkBooking?.bookingId);
                    return createResponse(bookedByWallet?.success, bookedByWallet?.data, bookedByWallet?.message);
                }
                return createResponse(response?.success, response?.data, response?.message);
            }

            if ((result?.state == "FAILED") || (result?.state == "PENDING")) {
                const response = await addCustomerWalletAmountFailed(merchantOrderId, result);
                return createResponse(response?.success, response?.data, response?.message);
            }

            return createResponse(true, { result }, "fetch booking payment status successfully");
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching booking payment status`);
            return createResponse(false, null, error?.message || "Error when fetching booking payment status");
        }
    }

    static async getBookingPaymentDetails(bookingId: any, customerId: any): Promise<GenericResponse<any>> {
        try {
            await updateWalletAmount(customerId);
            const [walletAmountDetails, bookingDetails] = await Promise.all([
                Customer.findOne({ user: customerId }).select("wallet_amount"),
                Booking.findOne({ _id: bookingId }).select("totalAmount")
            ]);
            if (!walletAmountDetails || !bookingDetails)
                return createResponse(false, null, "booking or wallet details not found");
            const paymentDetails = await bookingPaymentDetails(bookingId, customerId);

            return createResponse(true, paymentDetails, "fetch booking details successfully!");
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching booking payment details`);
            return createResponse(false, null, error?.message || "Error when fetching booking payment details")
        }
    }

    static async cancelJobBooking(jobId: any): Promise<GenericResponseCode<any>> {
        try {
            const jobDetails = await Job.findOne({ _id: jobId });
            if (!jobDetails)
                return createResponseStatus(400, null, "Job details not found");

            if (jobDetails?.status == "cancelled")
                return createResponseStatus(409, null, "job already cancelled");

            if (["pending", "open", "confirmation_Pending"].includes(jobDetails?.status)) {
                const [refundWallet, jobAndBid, canceledPartner] = await Promise.all([
                    bulkBidingPaymentReturn(jobId, ["accepted", "pending"], "Cancelled job"),
                    jobAndBidCancel(jobId),
                    preparePushNotification("cancelled", "JOB_REACTED_PARTNERS", jobId)
                ]);


                return createResponseStatus(jobAndBid?.status, jobAndBid?.data, jobAndBid?.message);
            }

            if (jobDetails?.status == "confirmed") {
                const bookingObj = await Booking.findOne({ jobId: jobId, status: "confirmed" });
                if (!bookingObj)
                    return createResponseStatus(400, null, "Job Booking details not found");

                const checkBookingCancel = await checkBookingCancelRequest(jobDetails);
                if (checkBookingCancel == false)
                    return createResponseStatus(400, null, "Cancellations are allowed up to 2 hours before the scheduled booking time.");



                const bookingCancle = await jobBookingCancel(bookingObj?._id);
                if ((bookingObj?.customerId !== undefined) && bookingObj?.customerId!) {
                    await updateWalletAmount(bookingObj?.customerId?.toString());
                }
                return createResponseStatus(bookingCancle?.status, bookingCancle?.data, bookingCancle?.message);
            }

            if (["in_progress", "completed"].includes(jobDetails?.status))
                return createResponseStatus(400, null, "This booking cannot be canceled. Please contact the admin for assistance");

            return createResponseStatus(200, { jobDetails }, "job canceled successfully !");
        } catch (error: any) {
            logger.error(`${error?.message} Error when cancel job`);
            return createResponseStatus(404, null, error?.message || "Error when cancel job");
        }
    }


    static async ongoingJobs(customerId: any, lastId: any, limit: any, searchtext: string): Promise<GenericResponse<any>> {
        try {
            if (!customerId)
                return createResponse(true, null, "Customer id is not found");

            const query: any = { status: { $in: ["on_the_Way", "arrived", "paused", "awaiting_material", "awaiting_payment", "in_progress"] }, customerId };
            if (lastId) {
                query._id = { $lt: lastId }; // get jobs older than last loaded one
            }
            const allJobsDetails: any = await getCustomerJobDetailsList(query, limit, searchtext);

            return createResponse(true, { ongoingJobs: allJobsDetails?.allJobs, lastId: allJobsDetails?.lastId }, "fetch ongoing jobs successfully !");
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching ongoing jobs`);
            return createResponse(false, null, error?.message || "Error when fetching ongoing jobs")
        }
    }

    static async previousJobs(customerId: any, lastId: any, limit: any, searchtext: string): Promise<GenericResponse<any>> {
        try {
            if (!customerId)
                return createResponse(true, null, "Customer id is not found");

            const query: any = { status: { $in: ["completed", "cancelled", "expired"] }, customerId };
            if (lastId) {
                query._id = { $lt: lastId }; // get jobs older than last loaded one
            }
            const allJobsDetails: any = await getCustomerJobDetailsList(query, limit, searchtext);


            return createResponse(true, { previousJobs: allJobsDetails?.allJobs, lastId: allJobsDetails?.lastId }, "fetch previous jobs successfully !");
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching previous jobs`);
            return createResponse(false, null, error?.message || "Error when fetching previous jobs")
        }
    }

    static async getLanguages(type: string): Promise<GenericResponseCode<any>> {
        try {
            const language = await getJsonData(type, "customer");
            return createResponseStatus(200, { [type]: language }, "fetching language successfully");
        } catch (error: any) {
            logger.error(`${error?.message} Failed to fetching language`);
            return createResponseStatus(500, null, error.message || "Failed to fetching language")
        }
    }

    static async getLanguageList(): Promise<GenericResponseCode<any>> {
        try {
            const data = await languagesList();
            return createResponseStatus(200, data, "fetching language list successfully");
        } catch (error: any) {
            logger.error(`${error?.message} Failed to fetching language list`);
            return createResponseStatus(500, null, error.message || "Failed to update partner");
        }
    }

    static async updateLanguageCode(customerId: any, languageCode: string): Promise<GenericResponseCode<any>> {
        try {
            const data = await languagesList();
            const exists = data.some(item => item.code === languageCode);
            if (!exists)
                return createResponseStatus(400, null, "language not found");

            const update = await Customer.findOneAndUpdate({ user: customerId }, { $set: { languageCode } });
            const getpartner = await getCustomer(customerId);

            return createResponseStatus(200, { user: getpartner }, "language update successfully ! ");
        } catch (error: any) {
            logger.error(`${error?.message} Failed to update language`);
            return createResponseStatus(500, null, error.message || "Failed to update language");
        }
    }


    static async getNotifications(customerId: any): Promise<GenericResponseCode<any>> {
        try {
            const result = await Notification.aggregate([
                { $match: { userId: customerId } },
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

            return createResponseStatus(200, {
                total: notifications.length,
                readCount,
                unreadCount,
                notifications
            }, "fetch notifications successfully");
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching notifications`);
            return createResponseStatus(500, null, error.message || "Error when fetching notifications")
        }
    }

    static async readNotifications(notificationId: any): Promise<GenericResponseCode<any>> {
        try {
            const update = await Notification.findByIdAndUpdate(notificationId,
                { $set: { isRead: true } },
                { new: true })
            return createResponseStatus(200, { notification: update }, "Notification read status updated successfully");
        } catch (error: any) {
            logger.error(`${error?.message} Error when update read status`);
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
            logger.error(`${error?.message} Error when update read status`);
            return createResponseStatus(500, null, error.message || "Error when update read status");
        }
    }

    static async reviewAndRating(data: any): Promise<GenericResponseCode<any>> {
        try {
            const job: any = await Job.findOne({ _id: data?.jobId })
                .select("bookingId")
                .populate("bookingId", "jobId serviceId customerId partnerId");

            if (!job?.bookingId) {
                return createResponseStatus(200, null, "Job booking details not found");
            }
            // Extract and prepare review data
            const { jobId, serviceId, customerId, partnerId } = job.bookingId;
            const updateData = {
                jobId,
                serviceId,
                customerId,
                partnerId,
                description: data?.description,
                rating: data?.rating,
            };
            // Upsert (update if exists, else create new)
            const result = await Rating.findOneAndUpdate(
                { jobId, serviceId, customerId, partnerId },
                updateData,
                { new: true, upsert: true, setDefaultsOnInsert: true }
            );

            if (job) {
                job.ratingId = result?._id;
                const jobUpdate = await job.save();
            }
            return createResponseStatus(200, { result }, "Thank you so much for your valuable feedback");
        } catch (error: any) {
            logger.error(`${error?.message} Error when adding review`);
            return createResponseStatus(500, null, error.message || "Error when adding review");
        }
    }

    static async nearMeDoneJobs(customerId: any, payload: any): Promise<GenericResponseCode<any>> {
        try {
            const { lastId, limit, categoryId, latitude, longitude, page } = payload;
            const query: any = {
                status: { $in: ["active"] },
            };

            const result = await getTopTenServices(query, limit, customerId, categoryId, latitude, longitude, lastId);
            // const result = await getNearMeDoneJobs(query, limit, customerId, categoryId, latitude, longitude);
            return createResponseStatus(result?.status, result?.data, result?.message);
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching job`);
            return createResponseStatus(500, null, error.message || "Error when fetching job")
        }
    }
    static async filterServices(payload: any, customerId: any): Promise<GenericResponseCode<any>> {
        try {
            // const category = await Category.find({ status: "active" }).select("name");
            const { lastId, limit, categoryId, searchtext } = payload;

            const query: any = { status: "active" };
            // Handle pagination
            if (lastId) {
                query._id = { $lt: new mongoose.Types.ObjectId(lastId) };
            }


            // Handle category filter
            let categoryIds: string[] = [];
            if (categoryId) {
                if (typeof categoryId === "string") {
                    try {
                        categoryIds = JSON.parse(categoryId);
                    } catch {
                        categoryIds = categoryId.split(",");
                    }
                } else if (Array.isArray(categoryId)) {
                    categoryIds = categoryId;
                }
            }

            const services = await filterServices(query, limit, searchtext, categoryIds, customerId);

            return createResponseStatus(200, { service: services?.allJobs, lastId: services?.lastId }, "service fetching successfully done");
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching job`);
            return createResponseStatus(500, null, error.message || "Error when fetching job");
        }
    }

    static async bookmark(data: any, customerId: any): Promise<GenericResponseCode<any>> {
        try {
            if (!customerId)
                return createResponseStatus(400, null, "user is not round");

            if ((!data.serviceId) || (!data.operation))
                return createResponseStatus(400, null, "Job id or operation is required");

            const services = await Service.findOne({ _id: data?.serviceId });
            if (!services)
                return createResponseStatus(400, null, "The provided service ID is invalid");

            const checkBookmark = await Bookmark.findOne({
                customerId,
                serviceId: data.serviceId
            });
            if ((data.operation == "remove") && (!checkBookmark))
                return createResponseStatus(409, null, "This job is not bookmarked or has been removed");

            if ((data.operation == "add") && (checkBookmark))
                return createResponseStatus(409, null, "You’ve already bookmarked this job.");

            let response: any = "";
            if (data.operation == "add") {
                response = await Bookmark.create({
                    customerId,
                    serviceId: data.serviceId
                });
            } else {
                response = await Bookmark.deleteOne({
                    customerId,
                    serviceId: data.serviceId
                });
            }

            return createResponseStatus(200, null, `service bookmark ${data.operation} successfully`);
        } catch (error: any) {
            logger.error(`${error?.message} Error when bookmark service`);
            return createResponseStatus(500, null, error.message || "Error when bookmark service");
        }
    }

    static async getbookmark(customerId: any, payload: any): Promise<GenericResponseCode<any>> {
        try {
            const { limit, lastId } = payload;
            const filter: any = { customerId };

            if (lastId && mongoose.Types.ObjectId.isValid(lastId)) {
                filter.serviceId = { $lt: new mongoose.Types.ObjectId(lastId) };
            }

            let services = await Bookmark.find(filter)
                .limit(Number(limit) || 10)
                .populate("serviceId", "_id name description image pricingTiers")
                .sort({ _id: -1 })
                .lean();

            const serviceIds = services.map((value) => {
                return value?.serviceId?._id.toString()
            });

            const serviceRating = await serviceWiseRatingDetails(serviceIds);
            const serviceWorker = await serviceWisePartnerCount(serviceIds, customerId);
            let pricingTiersType = await customerSubscriptionPlanType(customerId);

            const bookmarkService: any = await Promise.all(
                services.map((service: any) => {

                    if (pricingTiersType == "Premium") {
                        service.serviceId.price = service.serviceId?.pricingTiers?.[2]?.price;
                    } else if (pricingTiersType == "Standard") {
                        service.serviceId.price = service.serviceId?.pricingTiers?.[1]?.price;
                    } else {
                        service.serviceId.price = service.serviceId?.pricingTiers?.[0]?.price;
                    }


                    if (service?.serviceId?.image) {
                        service.serviceId.image = `${process.env.BASE_URL}/uploads/servicesImage/${service.serviceId.image}`;
                    } else {
                        service.serviceId.image = null;
                    }

                    if (service.serviceId && service.serviceId.pricingTiers) {
                        delete service.serviceId.pricingTiers;
                    }
                    const serviceRatingReview = serviceRating[service?.serviceId?._id] ? serviceRating[service?.serviceId?._id].averageRating : 0;
                    const workerAvl = serviceWorker[service?.serviceId?._id] ? serviceWorker[service?.serviceId?._id].totalPartners : 0;
                    return { ...service.serviceId, workerAvailable: workerAvl, rating: serviceRatingReview, bookmarkStatus: true };
                })
            );


            const newlastId = bookmarkService.length > 0 ? bookmarkService[bookmarkService.length - 1]._id : null;
            return createResponseStatus(200, { bookmarkService, lastId: newlastId }, "bookmark service fetch successfully");
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching bookmark service`);
            return createResponseStatus(500, null, error.message || "Error when fetching bookmark service");
        }
    }

    static async getBanners(): Promise<GenericResponseCode<any>> {
        try {
            const res = await Banner.find({ status: "active", bannerType: "customer", vocationalBanner: false });
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
            logger.error(`${error?.message} Error when fetching banners`);
            return createResponseStatus(500, null, error.message || "Error when fetching banners")
        }
    }

    static async transactionHistory(customerId: any, payload: any): Promise<GenericResponseCode<any>> {
        try {
            const { lastId, limit, tab, fromDate, toDate } = payload;
            const startDate = new Date(fromDate || "2025-01-15");
            const endDate = new Date(toDate || Date.now());
            endDate.setHours(23, 59, 59, 999);

            let result: any = {};
            if (["wallet", "subscription", "withdraw", "all"].includes(tab)) {

                const query: any = { customerId, createdAt: { $gte: startDate, $lte: endDate } };
                if (tab != "all") {
                    query.paymentFor = tab
                }
                if (lastId) {
                    query._id = { $lt: lastId };
                }

                result = await getWalletTransaction(query, limit);
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
                    customerId,
                    createdAt: { $gte: startDate, $lte: endDate }
                };
                if (lastId) {
                    query._id = { $lt: new mongoose.Types.ObjectId(lastId) }; // ensure ObjectId
                }

                result = await getBookingTransaction(query, limit);
            }

            const services_amount = await customerTotalService(customerId);
            const total_withdraw = await customerTotalWithdraw(customerId);
            return createResponseStatus(200, { services_amount, total_withdraw, bookingPayment: result?.allTransaction, lastId: result?.lastId }, "fetch transaction history done");
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching transaction history`);
            return createResponseStatus(500, null, error.message || "Error when fetching transaction history");
        }
    }

    static async getSubscriptionPlans() {
        try {
            const subscriptionPlans = await subscriptionPlansModel.find({ status: "active", target: "customer" }, { pricingTiers: 0, target: 0 });
            return {
                success: true,
                data: subscriptionPlans,
                message: "Subscription plans fetched successfully",
            };
        } catch (error: any) {
            logger.error(`${error?.message} Error during getting subscription plans`);
            return {
                success: false,
                data: null,
                message: error?.message || "Error during getting subscription plans",
            };
        }
    }


    static async subscriptionWithoutCode(data: any, customerId: any): Promise<GenericResponse<any>> {
        try {
            const { subscriptionplans } = data;
            const subscriptionDetails = await subscriptionPlansModel.findOne({ _id: subscriptionplans });
            if (!subscriptionDetails)
                return createResponse(false, null, "subscription plan not found");

            const partner = await User.findOne({ _id: customerId });
            if (!partner)
                return createResponse(false, null, "User is not found");

            // razorpay code start
            const checkActiveGateway = await activeGateway();
            if (checkActiveGateway === "RAZORPAY") {
                const [razorpayOrder, userInfo] = await Promise.all([
                    initiateRazorpayOrder(subscriptionDetails.price),
                    User.findById(customerId).select("name email phone").lean(),
                ]);
                if (!razorpayOrder?.amount)
                    return createResponse(false, null, "Something went wronge");

                await addInitiateRazorpaySubscriptionOrder(subscriptionDetails, customerId, data, razorpayOrder);

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

            const plansDuration = await getPlansDuration(subscriptionDetails, customerId);
            const invoiceNo = `INV${Date.now()}`;
            const merchantOrderId = "BW_SUBORD" + Date.now();
            const gatewayId = await activeGatewayId();
            const userSubscription = await UserSubscription.create({
                userId: customerId,
                subscriptionPlans: data.subscriptionplans,
                price: subscriptionDetails.mrp,
                invoiceNo,
                gatewayId,
                paymentGateway: "PHONEPE",
                discountAmount: subscriptionDetails.flat_discount,
                discountType: "flat",
                payableAmount: subscriptionDetails.price,
                merchantOrderId: merchantOrderId,
                startDate: plansDuration?.startDate,
                endDate: plansDuration?.endDate,
                status: 'pending'
            });


            await addCustomerSubscriptionPaymentPending(merchantOrderId, userSubscription);
            // update parter subscritions and referred by  
            await Customer.findOneAndUpdate(
                { user: customerId },
                { $push: { subscriptionPlans: userSubscription._id } },
                { new: true }
            )

            const token = await getPhonePeAccessToken();

            if (!token)
                return createResponse(false, null, "Failed to fetch PhonePe access token. Please try again later");

            return createResponse(true, { paymentGateway: "PHONEPE", result: { merchantOrderId, amount: userSubscription?.payableAmount, phonepeToken: token?.access_token } }, "Your subscription is ready. Please complete the payment to reserve it");
        } catch (error: any) {
            logger.error(`${error?.message} Error when purchaseing subscription plans by Partners`);
            return createResponse(false, null, error?.message || "Error when purchaseing subscription plans by Partners")
        }
    }

    static async fetchSubscriptionPaymentstatus(data: any, partnerId: any): Promise<GenericResponse<any>> {
        try {
            const { merchantOrderId, phonepeToken } = data;
            const result = await fetchPaymentStatus(phonepeToken, merchantOrderId);

            if (result?.state == "COMPLETED") {
                const updateResponse = await customerSubscriptionPaymentCompleted(merchantOrderId, result);
                await subscription_plan_added(merchantOrderId);
                return createResponse(true, { status: result?.state, details: updateResponse }, "payment status fetch successfully!");
            }

            if ((result?.state == "FAILED") || (result?.state == "PENDING")) {
                const updateResponse = await customerSubscriptionPaymentFaild(merchantOrderId, result);
                if (result?.state == "PENDING") {
                    await subscription_plan_pending(merchantOrderId);
                } else {
                    await subscription_plan_failed(merchantOrderId);
                }
                return createResponse(false, { status: result?.state, details: updateResponse }, "payment status fetch successfully!");
            }

            return createResponse(true, { status: result?.state, details: result }, "payment status fetch successfully!");

        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching payment status!`);
            return createResponse(false, null, error?.message || "Error when fetching payment status!");
        }
    }

    static async applyReferralCode(referralCode: any, customerId: any): Promise<GenericResponseCode<any>> {
        try {
            // 1️⃣ Validate referral code (exclude self)
            const checkReferrer = await Customer.findOne({
                referralCode,
                user: { $ne: customerId }
            }).select("_id referralCode referralPoints user");

            if (!checkReferrer) {
                return createResponseStatus(400, null, "Invalid referral code");
            }

            // 2️⃣ Get referral settings
            const referralDetails = await Setting.findOne({
                type: "referral",
                target: "customer",
                status: "active"
            });

            if (!referralDetails) {
                return createResponseStatus(400, null, "Referral settings not found");
            }
            // 3️⃣ Get current (new) customer (the one applying the code)
            const referee = await Customer.findOne({ user: customerId });
            if (!referee) {
                return createResponseStatus(400, null, "Customer details not found");
            }

            // 4️⃣ Calculate points
            const referrerPoints = referralDetails.referrerPoints || 0;
            const refereePoints = referralDetails.refereePoints || 0;

            // --- Update referee (new customer)
            const totalRefereePoints = (referee.referralPoints as number || 0) + refereePoints;
            const refereeUpdate = {
                referredBy: checkReferrer.user,
                referralPoints: totalRefereePoints
            };

            const updatedReferee = await Customer.findByIdAndUpdate(
                referee._id,
                { $set: refereeUpdate },
                { new: true }
            );

            // --- Update referrer (existing customer who shared the code)
            const totalReferrerPoints = (checkReferrer.referralPoints as number || 0) + referrerPoints;
            const referrerUpdate = {
                $set: { referralPoints: totalReferrerPoints },
                $push: { referralHistory: referee.user }
            };

            await Customer.findByIdAndUpdate(checkReferrer._id, referrerUpdate, { new: true });

            const message = `Referral code applied successfully — ${refereePoints} points have been credited to your account.`;

            return createResponseStatus(200, { customer: updatedReferee }, message);

        } catch (error: any) {
            logger.error(`${error?.message} Error while applying referral code`);
            return createResponseStatus(
                500,
                null,
                error.message || "Error while applying referral code"
            );
        }

    }

    static async getSubscriptionPlanStatus(customerId: any): Promise<GenericResponse<any>> {
        try {
            const result = await fetchingCustomerSubscriptionPlans(customerId);
            return createResponse(true, result, "Subscription plans fetch successfuly");
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching subscription plan details`);
            return createResponse(false, null, "Error when fetching subscription plan details");
        }
    }


    static async checkJobSurgePricing(payload: any, customerId: any): Promise<GenericResponseCode<any>> {
        try {
            const { serviceId, job_date, job_time, couponCode } = payload;
            const checkService = await Service.findOne({ _id: serviceId });
            if (!checkService)
                return createResponseStatus(400, null, "serviceId is not found");

            if (!job_date || !job_time)
                return createResponseStatus(400, null, "job date or job time is required");

            const resSurgePricing = await checkSurgePricing(payload, customerId);
            // coupon code
            const couponResponse = await CouponCode.findOne({ couponCode, target: "customer", status: "active" });

            if (couponResponse?.couponCode && couponCode) {
                const couponDetails = await customerCouponCodeCalculation(couponResponse, resSurgePricing?.price);
                resSurgePricing.price = couponDetails?.totalPayable;
                logger.info(`${customerId} coupon code check and verify`);
            }



            let message = "";
            if (resSurgePricing?.inSurgePrice) {
                const surgeSlot = resSurgePricing?.surgeHours || {};
                message = `Your job at ${payload?.job_time} falls in surge hours. Due to high demand, the price ₹${resSurgePricing?.price} is multiply by ${resSurgePricing?.surgeMultiplier}. Change time/date to get the normal price ₹${resSurgePricing?.price / resSurgePricing?.surgeMultiplier!}.`;
            } else {
                message = `Your job time (${payload?.job_time}) is outside surge hours. You will be charged at the normal rate ₹${resSurgePricing?.price}.`
            }
            return createResponseStatus(200, { inSurgePrice: resSurgePricing?.inSurgePrice, price: resSurgePricing?.price }, message);
        } catch (error: any) {
            logger.error(`${error?.message} Error when checkong job serge pricing`);
            return createResponseStatus(500, null, error.message || "Error when checkong job serge pricing");
        }
    }

    static async checkCouponCode(payload: any, customerId: any): Promise<GenericResponseCode<any>> {
        try {
            const { couponCode, serviceId } = payload;
            const result = await CouponCode.findOne({ couponCode, target: "customer", status: "active" }).select("_id couponCode discountAmount discountType");
            if (!result)
                return createResponseStatus(409, null, "Coupon code not found");

            const service = await Service.findOne({ _id: serviceId }).select("pricingTiers");
            if (!service)
                return createResponseStatus(409, null, "Service not found");

            const pricingTiersType = await customerSubscriptionPlanType(customerId);
            const price = await checkCustomerType(service, customerId, pricingTiersType);

            const jobPrice = await customerCouponCodeCalculation(result, price);

            return createResponseStatus(200, { ...jobPrice }, "Coupon applied! Proceed to checkout?");
        } catch (error: any) {
            logger.error(`${error?.message} Error when apply coupon code`);
            return createResponseStatus(500, null, error?.message || "Error when apply coupon code");
        }
    }

    static async getStaticWebUrls(): Promise<GenericResponseCode<any>> {
        try {
            let urls = {
                legal_policy: "https://bharatworker.com/privacy-policy",
                help_support: "https://bharatworker.com/contact",
                security_policy: "https://bharatworker.com/privacy-policy"
            }
            return createResponseStatus(200, urls, "Static policy urls for both customer and partner");
        } catch (error: any) {
            return createResponseStatus(500, null, error?.message || "Error when fetching static urls");
        }
    }

    static async shareLink(customerId: any): Promise<GenericResponseCode<any>> {
        try {
            const result: any = await Customer.findOne({ user: customerId }).select("referralCode").lean();
            const referral_code = result?.referralCode;
            const baseUrl = "https://play.google.com/store/apps/details?id=com.alina.bharat.customer";
            const message = encodeURIComponent(`Use Referral Code ${referral_code} and get a referral points!`);
            const shareLinks = {
                whatsapp: `https://api.whatsapp.com/send?text=${message}%20${baseUrl}`,
                facebook: `https://www.facebook.com/sharer/sharer.php?u=${baseUrl}`,
                twitter: `https://twitter.com/intent/tweet?text=${message}%20${baseUrl}`,
                linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${baseUrl}`,
            };
            logger.info(`Customer share refferal code ${referral_code}`);
            return createResponseStatus(200, shareLinks, "share link gernate successfully");
        } catch (error: any) {
            logger.error(`${error?.message} Error when generate link share on social`);
            return createResponseStatus(500, null, "Error when share app link on social media");
        }
    }

    static async getVoccationalBanners(): Promise<GenericResponseCode<any>> {
        try {
            const res = await Banner.find({ status: "active", bannerType: "customer", vocationalBanner: true });
            const banners = await Promise.all(
                res.map(async (bannerObj: any) => {
                    const bannerUrl = bannerObj?.banner
                        ? `${process.env.BASE_URL}/uploads/banner/${bannerObj.banner}`
                        : null;

                    const expired = await bannerExireyDate(bannerObj?.validity);


                    return {
                        ...(bannerObj.toObject?.() || bannerObj), // ensure plain object if it's a Mongoose doc
                        banner: bannerUrl,
                        expired,
                    };
                })
            );

            return createResponseStatus(200, { banner: banners }, "Banners fetch successfully done");
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching banners`);
            return createResponseStatus(500, null, error.message || "Error when fetching banners")
        }
    }



    static async currentBooking(customerId: any, lastId: any, limit: string, searchtext: string): Promise<GenericResponse<any>> {
        try {
            if (!customerId)
                return createResponse(true, null, "Customer id is not found");

            const statusOrder = [
                "pending",
                "open",
                "confirmation_Pending",
                "confirmed",
                "on_the_Way",
                "arrived",
                "paused",
                "awaiting_material",
                "awaiting_payment",
                "in_progress",
                "completed",
                "cancelled",
                "expired"
            ];


            const query: any = { status: { $in: statusOrder }, customerId };
            if (lastId) {
                query._id = { $lt: lastId }; // get jobs older than last loaded one
            }

            const allJobsDetails: any = await getCustomerJobDetailsList(query, limit, searchtext);


            // your jobs array
            const sortedJobs = allJobsDetails?.allJobs.sort((a: any, b: any) => {
                const orderA = statusOrder.indexOf(a.status);
                const orderB = statusOrder.indexOf(b.status);
                return orderA - orderB;
            });

            const filterData = await Promise.all(sortedJobs.map(async (job: any) => {
                let status_name = await getStatusDisplayName(job?.status);
                return {
                    title: job?.title,
                    job_date: job?.job_date,
                    job_time: job?.job_time,
                    status: job?.status,
                    service_name: job?.serviceId?.name,
                    serviceId: job?.serviceId?._id,
                    service_image: job?.serviceId?.image,
                    applicants: job?.applicants,
                    price: job?.price,
                    jobCreatedAt: job?.jobCreatedAt,
                    partnerDetails: job?.partnerDetails,
                    inSurgePrice: job?.inSurgePrice,
                    bookmarkStatus: job?.bookmarkStatus,
                    status_name
                }
            }))

            const totalJob = await Job.countDocuments({ customerId });

            return createResponse(true, { currentBooking: filterData, lastId: allJobsDetails?.lastId, totalJob }, "fetch upcomming jobs successfully !");
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching current bookings`);
            return createResponse(false, null, error?.message || "Error when fetching current bookings")
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


    static async getNotificationsCount(customerId: any): Promise<GenericResponseCode<any>> {
        try {
            const count = await Notification.countDocuments({ userId: customerId, isRead: false });
            return createResponseStatus(200, { count }, "fetch notification count successfully");
        } catch (error: any) {
            logger.error(`${error?.message} Error when fetching unread notification count`);
            return createResponseStatus(500, null, error?.message || "Error when fetching unread notification count");
        }
    }

    static async addWithdrawRequest(customerId: any, payload: any): Promise<GenericResponseCode<any>> {
        try {
            const { requested_money, settlementAccountId } = payload;
            if (!requested_money && !settlementAccountId)
                return createResponseStatus(400, null, "requested_money and settlementAccountId are required");


            const checkWalletAmount = await Customer.findOne({ user: customerId }).select("wallet_amount");

            if (checkWalletAmount?.wallet_amount! < requested_money)
                return createResponseStatus(400, null, "Withdrawal amount exceeds your wallet balance");

            const res = await customerWithdrawRequest(customerId, requested_money, settlementAccountId);

            return createResponseStatus(200, { withdraw: res?.data?.withdraw }, "withdraw request added successfully");
        } catch (error: any) {
            logger.error(`${error.message} Error when adding withdraw request`);
            return createResponseStatus(500, null, error.message || "Error when adding withdraw money request")
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
                delete detailObj?.details?.customerId;
            }

            return createResponseStatus(200, { detailsType: detailObj?.detailsType, details: detailObj?.details }, "fetch transaction detail successfully");
        } catch (error: any) {
            logger.error(`${error.message} Error when fetching transaction details`);
            return createResponseStatus(500, null, error.message || "Error when fetching transaction details")
        }
    }

    static async appReview(payload: any, customerId: any): Promise<GenericResponseCode<any>> {
        try {

            const result = await Rating.findOneAndUpdate(
                { customerId, isAppReview: true },
                {
                    description: payload?.description,
                    rating: payload?.rating,
                    appReview: "customer"
                },
                { new: true, upsert: true, setDefaultsOnInsert: true }
            );
            const response = await getAppReviewList(customerId, 10, { isAppReview: true, appReview: "customer" });
            return createResponseStatus(200, { ...response }, "app review add successfully");
        } catch (error: any) {
            return createResponseStatus(500, null, error.message || "Error when adding app review");
        }
    }
    static async appReviewList(payload: any, customerId: any): Promise<GenericResponseCode<any>> {
        try {
            const { lastId, limit } = payload;
            let query: any = { isAppReview: true, appReview: "customer" };
            if (lastId) {
                query._id = { $lt: new mongoose.Types.ObjectId(lastId) };
            }
            const result = await getAppReviewList(customerId, limit, query);
            return createResponseStatus(200, { ...result }, "Fetching app review list successfully");
        } catch (error: any) {
            return createResponseStatus(500, null, error.message || "Error when fetching app review list");
        }
    }

    static async notificationSetting(customerId: any, payload: any): Promise<GenericResponseCode<any>> {
        try {
            const { job, wallet, payment, service_tips } = payload;
            const res = await Setting.findOneAndUpdate(
                { customerId, type: "notification" },   // filter
                {
                    $set: {
                        job,
                        wallet,
                        payment,
                        service_tips,
                        type: "notification",
                        customerId
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


    static async getNotificationSetting(customerId: any): Promise<GenericResponseCode<any>> {
        try {
            let result: any = await Setting.findOne({ customerId, type: "notification" }).select("-partnerId");

            if (!result) {
                result = await Setting.findOneAndUpdate(
                    { customerId, type: "notification" },   // filter
                    {
                        $set: {
                            job: true,
                            wallet: true,
                            payment: true,
                            service_tips: true,
                            type: "notification",
                            customerId
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


    static async shareServicesLink(customerId: any, serviceId: any): Promise<GenericResponseCode<any>> {
        try {
            const result: any = await Service.findOne({ _id: serviceId })
                .select("name description slug")
                .lean();
            const shareLinks = await getSocialLink(result?.slug);
            logger.info(`${result?.name} service share successfully`);
            return createResponseStatus(200, shareLinks, "share link gernate successfully");
        } catch (error: any) {
            logger.error(`${error?.message} Error when generate link share on social`);
            return createResponseStatus(500, null, "Error when share app link on social media");
        }
    }


    static async addPaymentmethod(payload: any, customerId: any): Promise<GenericResponseCode<any>> {
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
                user: customerId,
                isPrimary: true
            }));

            let insertObj: any = {
                userType: "customer",
                user: customerId,
                method,
                isPrimary: hasPrimary ? false : true
            };

            let condtionObj: any = {
                user: customerId
            }



            if (method === "BANK") {
                let isVerifiedAccountNumber = await checkAccountNumber(accountNumber);
                if (!isVerifiedAccountNumber) {
                    return createResponseStatus(409, null, "Account number is not valid");
                }

                let checkExistingAccount = await PaymentMethod.findOne({ accountNumber, user: { $ne: customerId } });
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

                let checkExistingupiId = await PaymentMethod.findOne({ upiId, user: { $ne: customerId } });
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

    static async getPaymentMethod(customerId: any): Promise<GenericResponseCode<any>> {
        try {
            let res = await getPaymentMethod(customerId);
            return createResponseStatus(200, { primary: res?.primary, result: res?.result }, "fetch payment method successfully");
        } catch (error: any) {
            return createResponseStatus(500, null, error.message || "Error when fetching payment method")
        }
    }

    static async setPrimaryPaymentMethod(customerId: any, methodId: any): Promise<GenericResponseCode<any>> {
        try {
            const checkPaymentMethod = await PaymentMethod.findOne({ user: customerId, _id: methodId });
            if (!checkPaymentMethod)
                return createResponseStatus(400, null, "Payment method not found");

            checkPaymentMethod.isPrimary = true;
            await checkPaymentMethod.save();

            await PaymentMethod.updateMany(
                {
                    user: customerId,
                    _id: { $ne: methodId }
                },
                { $set: { isPrimary: false } }
            );
            let res = await getPaymentMethod(customerId);
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
                const response = await addCustomerRazorpayWalletAmountSuccess(result?.order_id, result);
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
                const updateResponse = await customerRazorpaySubscriptionPaymentCompleted(result?.order_id, result);
                await wallet_recharge_successfully(result?.order_id);
                return createResponseStatus(200, { result, customerId }, "payment status fetch successfully!");
            } else {
                await wallet_recharge_pending(result?.order_id);
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
                    await customerRazorpaySubscriptionPaymentCompleted(merchantOrderId, result);
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
            const response8 = await job_complete({
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


    static async checkCouponReferral(data: any, customerId: any): Promise<GenericResponse<any>> {
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
                const coupon = await CouponCode.findOne({ couponCode: referralOrCoupon, status: "active", target: "customer" });
                if (coupon) {
                    const result = await calculateCouponWithSubscriptionPlanDiscount(coupon, subscriptionDetails);
                    return createResponse(true, result, `Congrats! ${codeType} code applied: Rs. ${result?.discount} OFF`);
                }
            }

            // Handle Referral Code
            const referralCustomer = await Customer.findOne({ referralCode: referralOrCoupon, user: { $ne: customerId } });
            if (!referralCustomer)
                return createResponse(false, null, "Invalid Coupon or Referral Code");

            /*
            const checkPartnterSubscriptionStatus: any = await UserSubscription.findOne({
                userId: referralCustomer?.user?.toString(),
                status: { $in: ["active", "in_queue", "expired"] }
            });

            if (!checkPartnterSubscriptionStatus)
                return createResponse(false, null, "The referral code you entered is not active at the moment.");
            */

            let referralCodeDetails: any = await ReferralCode.findOne({ status: "active", target: "customer" });
            if (!referralCodeDetails) {
                return createResponse(false, null, "No referral code details are available");
            }
            const referralResult = await checkReferralDetails(subscriptionDetails, referralCodeDetails);

            /*
           if (referralResult?.codeType == "referral code") {
               referralResult.referralOrCoupon = referralOrCoupon;
               const checkReferralUsed = await Partner.findOne({ user: customerId, referredBy: null });
               if (!checkReferralUsed)
                   return createResponse(false, null, "Referral code can be applied only once per user.");
           } */

            return createResponse(
                true,
                { ...referralResult, referralOrCoupon },
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


    static async addSubscriptionPlans(data: any, customerId: any): Promise<GenericResponse<any>> {
        const session = await mongoose.startSession();

        try {
            if (!customerId)
                return await createResponse(false, null, "User not found");
            const { referralOrCoupon, subscriptionplans } = data;

            const codeDetails: any = await CustomerService.checkCouponReferral(data, customerId);
            if (codeDetails?.success === false)
                return createResponse(false, null, "Invalid code plz try again");

            const subscriptionDetails = await subscriptionPlansModel.findOne({ _id: new mongoose.Types.ObjectId(subscriptionplans) });

            if (!subscriptionDetails)
                return createResponse(false, null, "subscription plans not found");

            session.startTransaction();

            const plansDuration = await getPlansDuration(subscriptionDetails, customerId);

            let referrerId: any = null;
            let referralcodeid: any = null;
            let coouponCodeId: any = null;
            if (codeDetails?.data?.codeType === "referral code") {
                const referrer = await Customer.findOne(
                    {
                        referralCode: codeDetails?.data?.referralOrCoupon,
                        user: { $ne: customerId }
                    }
                ).select('user');
                if (!referrer)
                    return createResponse(false, null, "Invalid referral code");
                referrerId = referrer?.user;

                const referalDetails = await ReferralCode.findOne({
                    target: "customer",
                    status: "active"
                });

                if (!referalDetails)
                    return createResponse(false, null, "Invalid referral code");
                referralcodeid = referalDetails?._id;
            } else if (codeDetails.codeType == "coupon code") {
                coouponCodeId = await CouponCode.findOne({ couponCode: codeDetails?.data?.referralOrCoupon, status: "active", target: "customer" });
            }


            // razorpay code start 
            const checkActiveGateway = await activeGateway();
            if (checkActiveGateway === "RAZORPAY") {
                const [razorpayOrder, userInfo] = await Promise.all([
                    initiateRazorpayOrder(subscriptionDetails.price),
                    User.findById(customerId).select("name email phone").lean(),
                ]);
                if (!razorpayOrder?.amount)
                    return createResponse(false, null, "Something went wronge");

                await addInitiateRazorpaySubscriptionOrder(subscriptionDetails, customerId, { ...data, ...codeDetails?.data }, razorpayOrder, referralcodeid, referrerId);

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
                    "Your Subscription amount is ready. Please complete the payment to add it"
                );
            }
            // razorpay code end 
            const invoiceNo = `INV${Date.now()}`;
            const merchantOrderId = "BW_SUBORD" + Date.now();
            const gatewayId = await activeGatewayId();
            const userSubscription = await UserSubscription.create({
                userId: customerId,
                subscriptionPlans: data.subscriptionplans,
                price: subscriptionDetails.mrp,
                couponCodeId: codeDetails?.data?.couponCodeId,
                codeType: codeDetails?.data?.codeType,
                referralOrCoupon: codeDetails?.data?.referralOrCoupon,
                referralcodeId: referralcodeid,
                referrerBy: referrerId,
                invoiceNo,
                gatewayId,
                paymentGateway: "PHONEPE",
                discountAmount: subscriptionDetails.flat_discount,
                discountType: "flat",
                payableAmount: subscriptionDetails.price,
                merchantOrderId: merchantOrderId,
                startDate: plansDuration?.startDate,
                endDate: plansDuration?.endDate,
                status: 'pending'
            });


            await addCustomerSubscriptionPaymentPending(merchantOrderId, userSubscription);
            // update parter subscritions and referred by  
            await Customer.findOneAndUpdate(
                { user: customerId },
                { $push: { subscriptionPlans: userSubscription._id } },
                { new: true }
            )

            const token = await getPhonePeAccessToken();

            if (!token)
                return createResponse(false, null, "Failed to fetch PhonePe access token. Please try again later");

            return createResponse(true, { paymentGateway: "PHONEPE", result: { merchantOrderId, amount: userSubscription?.payableAmount, phonepeToken: token?.access_token } }, "Your subscription is ready. Please complete the payment to reserve it");
        } catch (error: any) {
            logger.error(`${error?.message} Error when purchasing subscription plan`);
            return await createResponse(false, null, error?.message || "Error when purchaseing subscription plans by Partners");
        } finally {
            session.endSession();
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

            let checkPoints = await convertReferralPoints(redeem_points, redeemRate?.redeem_rate);
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
                customerId: userId,
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
                paymentBy: "customer",
                paymentFor: "wallet",
                particular: "Referral points redeemed successfully",
                transactionType: "debited",
            };

            await Transaction.create(adminTransactionPayload);

            // Prepare transaction payload
            const customerTransactionPayload = {
                // adminId: adminId,
                walletPayment: walletObj._id,
                customerId: walletObj.customerId,
                amount: walletObj.amount,
                invoiceNo: walletObj.invoiceNo,
                merchantOrderId: walletObj.merchantOrderId,
                transactionId: walletObj.transactionId,
                paymentMethod: walletObj.paymentMethod,
                paymentStatus: walletObj.paymentStatus,
                transactionDate: walletObj.transactionDate,
                paymentBy: "customer",
                paymentFor: "wallet",
                particular: "Received! added wallet",
                transactionType: "credited",
            };
            await Transaction.create(customerTransactionPayload);

            await Customer.findOneAndUpdate(
                { user: userId },
                { $set: { referralPoints: latest_avilable } }
            )


            return createResponseStatus(200, { result: walletObj }, "Referral points redeem successfully");
        } catch (error: any) {
            return createResponseStatus(500, null, error.message || "Error when referral points redeem");
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


}
