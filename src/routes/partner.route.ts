import express, { RequestHandler } from "express";
import { authMiddleware, authorize } from "../middlewares/auth.middleware.js";
import { PartnerController } from "../controllers/partner.controller.js";
import { upload, uploadAny, uploadSingle } from "../config/multer.config.js";
import multer from "multer";
import { auth } from "google-auth-library";
import Partner from "../models/partner.model.js";

const router = express.Router();

router.get(
    "/getPartners",
    authMiddleware as RequestHandler,
    authorize("admin", "volunteer") as RequestHandler,
    PartnerController.getPartners
);

router.post(
    "/upload-docs",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    (req, res, next) => {
        upload(req, res, (err: any) => {
            if (err instanceof multer.MulterError) {
                return res.status(400).json({
                    success: false,
                    message: `Upload error: ${err.message}`,
                });
            } else if (err) {
                return res.status(400).json({
                    success: false,
                    message: err.message,
                });
            }
            next();
        });
    },
    PartnerController.uploadDocs as RequestHandler
);

router.put(
    "/updateSkills/partnerId/:partnerId/skillId/:skillId",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.updatePartnersSkill as RequestHandler
);

router.get(
    "/getPartner/:id",
    authMiddleware as RequestHandler,
    authorize("admin", "partner", "volunteer") as RequestHandler,
    PartnerController.getPartner as RequestHandler
);


router.post("/signUpByNumber",
    PartnerController.signUpByNumber as RequestHandler
)

router.post("/otpVerification",
    PartnerController.otpVerification as RequestHandler
)


router.post("/profileUpdate",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    uploadSingle.single('profile') as RequestHandler,
    PartnerController.profileUpdate as RequestHandler
)

router.post("/workLocationUpdate",
    authMiddleware as RequestHandler,
    authorize("admin", "partner",) as RequestHandler,
    PartnerController.workLocationUpdate as RequestHandler
)

router.post("/update-today-working-Status",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.updateOnlineStatus as RequestHandler
)

router.post("/updateLiveLocation",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.updateLiveLocation as RequestHandler
)

router.post("/partnerSkills",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    (req, res, next) => {
        uploadAny(req, res, (err: any) => {
            if (err instanceof multer.MulterError) {
                return res.status(400).json({
                    success: false,
                    message: `Upload error: ${err.message}`,
                });
            } else if (err) {
                return res.status(400).json({
                    success: false,
                    message: err.message,
                });
            }
            next();
        });
    },
    PartnerController.partnerSkills as RequestHandler
)

router.get("/getPartnerSkills",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.getPartnerSkills as RequestHandler
)

router.get("/matchingJobs",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.matchingJobs as RequestHandler
)

router.get("/getServices",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.getServices as RequestHandler
)

router.post("/getServicesByCategory",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.getServicesByCategory as RequestHandler
)

router.post("/uploadPartnerDocuments",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    (req, res, next) => {
        upload(req, res, (err: any) => {
            if (err instanceof multer.MulterError) {
                return res.status(400).json({
                    success: false,
                    message: `Upload error: ${err.message}`,
                });
            } else if (err) {
                return res.status(400).json({
                    success: false,
                    message: err.message,
                });
            }
            next();
        });
    },
    PartnerController.uploadPartnerDocuments as RequestHandler
)

router.post("/userVerifyWithFirebase",
    PartnerController.verifyUser as RequestHandler
)

router.post("/login",
    PartnerController.login as RequestHandler
)

router.post("/partnerSignup",
    PartnerController.partnerSignup as RequestHandler
)

router.get("/get-subscription-plans",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.getSubscriptionPlans as RequestHandler
)

router.get("/get-years-experience",
    authMiddleware as RequestHandler,
    authorize("admin", "partner", "volunteer") as RequestHandler,
    PartnerController.getYearsExperience as RequestHandler
)

router.get(
    "/get-pending-partners",
    authMiddleware as RequestHandler,
    authorize("admin", "volunteer") as RequestHandler,
    PartnerController.getPendingPartners
);

router.post(
    "/partner-kyc-status",
    authMiddleware as RequestHandler,
    authorize("admin") as RequestHandler,
    PartnerController.partnerKycStatus,
);

router.post("/partner-google-auth",
    PartnerController.googleVerification as RequestHandler,
)

router.get("/get-kyc-faild-partners",
    authMiddleware as RequestHandler,
    authorize("admin", "volunteer") as RequestHandler,
    PartnerController.getKycFaildPartner

)

router.get("/get-profile",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.getProfile
)

router.get("/waiting-for-approval",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.waitingForApproval
)
router.get("/get-incoming-requests",
    authMiddleware as RequestHandler,
    authorize("admin", "volunteer") as RequestHandler,
    PartnerController.incomingRequests
)

router.post("/add-subscription-plan",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.addSubscriptionPlans
)

router.get("/booked-customers",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.bookedCustomers
)

router.post("/subscription-without-code",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.subscriptionWithoutCode
)

router.post("/partner-subscription-payment-status",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.fetchSubscriptionPaymentstatus
)

router.get("/fetch-transaction-history",
    authMiddleware as RequestHandler,
    authorize("admin", "partner","customer") as RequestHandler,
    PartnerController.transactionHistory
)

router.get("/get-referral-history",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.getReferralHistory
)

router.get("/fetch-subscription-details",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.getSubscriptionPlanStatus
)


router.get("/refresh-subscription-payment-status/:merchantOrderId",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.refreshSubscriptionPaymentStatus
)

router.post("/update-cateogry-subcategory-service",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.updateCategorySubcategoryAndService
)

router.get("/get-active-jobs",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.activeJobs
)

router.post("/add-job-bid",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.addJobBid
)

router.get("/get-job-details/:jobId",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.getJobDetails
)

router.post("/bid-cancel",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.bidCancel
)

router.get("/job-start-verifications-phone/:jobId",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.getJobStartVerificationPhone
)

router.post("/job-start-verifications-status",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.updateJobStartVerificationStatus
)

router.post("/add-extra-work",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.addExtraWork
)

router.get("/get-ongoing-jobs",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.ongoingJobs
)

router.get("/get-previous-jobs",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.previousJobs
)

router.get("/get-bid-jobs",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.bidingJobs
)

router.get("/update-identity-confirmation",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.updateIdentityConfiramtionStatus
)

router.put("/cancel-extra-work/:workId",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.cancelExtraWork
)

router.get("/verify-extra-work-payment/:bookingId",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.verifyExtraWorkPayment
)

router.get("/get-matching-jobs",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.getMatchingJobs
)


router.get("/get-language/:languageType",
    PartnerController.getLanguages
)

router.get("/get-language-list",
    PartnerController.getLanguageList
)


router.post("/update-language-code",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.updateLanguageCode
)

router.post("/update-booking-status",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    uploadSingle.single('paymentImage') as RequestHandler,
    PartnerController.updateBookingStatus
)

router.post("/job-bookmark",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.jobBookmark
)

router.get("/get-bookmark-list",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.getBookmarklist
)

router.get("/get-all-jobs",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.getAllJobs
)

router.get("/get-all-filters",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.getFilters
)

router.get("/get-wallet-amount",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.getWalletAmount
)

router.get("/get-wallet-transaction-history",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.walletTransactionHistory
)

router.post("/add-withdraw-request",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.addWithdrawRequest
)

router.get("/today-summary",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.todaySummary
)

router.get("/get-notifications",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.getNotifications
)

router.get("/read-notification/:id",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.readNotifications
)
router.get("/get-notification-details/:id",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.getNotificationDetails
)


router.post("/add-wallet-amount",
    authMiddleware as RequestHandler,
    authorize("partner", "admin") as RequestHandler,
    PartnerController.addWalletAmount as RequestHandler
)

router.post("/add-wallet-confirm",
    authMiddleware as RequestHandler,
    authorize("partner", "admin") as RequestHandler,
    PartnerController.addWalletConfirm
)

router.post("/add-wallet-amount-status",
    authMiddleware as RequestHandler,
    authorize("partner", "admin") as RequestHandler,
    PartnerController.walletAmountStatus
)

router.get("/transactions-by-tab",
    authMiddleware as RequestHandler,
    authorize("partner", "admin") as RequestHandler,
    PartnerController.transactionsByTab
)

router.get("/banners",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.getBanners
)

router.post("/notification-setting",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.notificationSetting
)

router.get("/notification-setting",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.getNotificationSetting
)

router.get("/share-link",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.shareLink
)


router.get("/get-notifications-count",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.getNotificationsCount
)


router.get("/transaction-details/:id",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.transactionDetails
)


router.get("/app-review-list",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.appReviewList
)

router.post("/app-review",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.appReview
)

router.get("/get-users-and-rating",
    authMiddleware as RequestHandler,
    authorize("partner", "admin") as RequestHandler,
    PartnerController.getTotalPartnerAndCustomer
)


router.post("/payment-method",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.addPaymentmethod
)

router.get("/payment-method",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.getPaymentMethod
)

router.get("/set-primary-payment/:methodId",
    authMiddleware as RequestHandler,
    authorize("admin","partner") as RequestHandler,
    PartnerController.setPrimaryPaymentMethod
)


router.post("/verify-razorpay-wallet-amount",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    PartnerController.addWalletAmountRazorpayVerify
)

router.get("/get-razorpay-wallet-payment-status/:paymentId",
    authMiddleware as RequestHandler,
    authorize("admin","partner") as RequestHandler,
    PartnerController.getRazorpayWalletPaymentStatus
)


router.post("/verify-razorpay-subscription-payment",
    authMiddleware as RequestHandler,
    authorize("admin","partner") as RequestHandler, 
    PartnerController.verifyRazorpaySubscriptionPayment
)

router.get("/get-razorpay-subscription-payment-status/:paymentId",
    authMiddleware as RequestHandler,
    authorize("admin","partner") as RequestHandler,
    PartnerController.getRazorpaySubscriptionPaymentStatus
)


router.get("/wallet-razorpay-by-orderid/:orderId",
    authMiddleware as RequestHandler,
    authorize("admin","partner") as RequestHandler, 
    PartnerController.walletRazorpayPaymentByOrderId
)


router.get("/subsription-razorpay-by-orderid/:orderId",
    authMiddleware as RequestHandler,
    authorize("admin","partner") as RequestHandler, 
    PartnerController.subscriptionRazorpayPaymentByOrderId
)

router.get("/check-email",
    authMiddleware as RequestHandler,
    authorize("admin","partner") as RequestHandler,
    PartnerController.checkEmail
)

router.get("/referral-points-details",
    authMiddleware as RequestHandler,
    authorize("admin","partner") as RequestHandler,
    PartnerController.getReferralPointsDetails
)

router.post("/redeem-points",
    authMiddleware as RequestHandler,
    authorize("admin","partner") as RequestHandler,
    PartnerController.redeemPoints
)

export default router;
