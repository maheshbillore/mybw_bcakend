import express, { RequestHandler, Request, Response } from "express";
import { authMiddleware, authorize } from "../middlewares/auth.middleware.js";
import { CustomerController } from "../controllers/customer.controller.js";
import { upload, uploadSingle } from "../config/multer.config.js";
import { validate } from "../middlewares/validate.js";
import { jobValidationSchema } from "../validators/job.validator.js";
import authService from "../services/auth.service.js";
const router = express.Router();

router.get(
    "/getCustomers",
    authMiddleware as RequestHandler,
    authorize("admin") as RequestHandler,
    CustomerController.getAllCustomers
);

router.get(
    "/getCustomer/:id",
    authMiddleware as RequestHandler,
    authorize("admin") as RequestHandler,
    CustomerController.getCustomerInfo
);

router.post("/sign-up",
    CustomerController.signUp
)

router.post("/login",
    CustomerController.login
)

router.post("/profile-update",
    authMiddleware as RequestHandler,
    authorize("customer", "admin") as RequestHandler,
    uploadSingle.single('profile') as RequestHandler,
    CustomerController.profileUpdate as RequestHandler
)

router.post("/address-update",
    authMiddleware as RequestHandler,
    authorize("customer", "admin") as RequestHandler,
    CustomerController.addressUpdate as RequestHandler
)

router.get("/booked-partners",
    authMiddleware as RequestHandler,
    authorize("customer", "admin") as RequestHandler,
    CustomerController.bookedPartners as RequestHandler
)

router.get("/get-category",
    authMiddleware as RequestHandler,
    authorize("customer", "admin") as RequestHandler,
    CustomerController.getCategorys as RequestHandler
)

router.get("/get-category-wise-services/:categoryId",
    authMiddleware as RequestHandler,
    authorize("customer", "admin") as RequestHandler,
    CustomerController.categoryServices as RequestHandler
)

router.get("/get-sub-category/:categoryId",
    authMiddleware as RequestHandler,
    authorize("customer", "admin") as RequestHandler,
    CustomerController.getSubCategory as RequestHandler
)


router.get("/get-services/:subcategoryId",
    authMiddleware as RequestHandler,
    authorize("customer", "admin") as RequestHandler,
    CustomerController.getServices as RequestHandler
)

router.get("/get-service-detail/:serviceId",
    authMiddleware as RequestHandler,
    authorize("customer", "admin") as RequestHandler,
    CustomerController.getSericeDetail as RequestHandler
)

router.post("/job-basic-detail",
    authMiddleware as RequestHandler,
    authorize("customer", "admin") as RequestHandler,
    upload,
    validate(jobValidationSchema),
    CustomerController.addJobBasicDetail as RequestHandler
)

router.post("/job-contact-detail",
    authMiddleware as RequestHandler,
    authorize("customer", "admin") as RequestHandler,
    CustomerController.jobContactDetail as RequestHandler
)

router.post("/job-confirmatrion",
    authMiddleware as RequestHandler,
    authorize("customer", "admin") as RequestHandler,
    CustomerController.jobConfirmation as RequestHandler
)

router.post("/add-wallet-amount",
    authMiddleware as RequestHandler,
    authorize("customer", "admin") as RequestHandler,
    CustomerController.addWalletAmount as RequestHandler
)

router.post("/add-wallet-confirm",
    authMiddleware as RequestHandler,
    authorize("customer", "admin") as RequestHandler,
    CustomerController.addWalletConfirm
)

router.post("/add-wallet-amount-status",
    authMiddleware as RequestHandler,
    authorize("customer", "admin") as RequestHandler,
    CustomerController.walletAmountStatus
)

/*
router.post("/sleep", (req: Request, res: Response) => {
    const seconds = parseInt(req.query.seconds as string, 10) || 0;
    setTimeout(() => {
        res.send(`Slept for ${seconds} seconds.`);
    }, seconds * 1000);
}); */

router.get("/get-profile",
    authMiddleware as RequestHandler,
    authorize("customer", "admin") as RequestHandler,
    CustomerController.getProfile
)

router.get("/get-upcomming-jobs",
    authMiddleware as RequestHandler,
    authorize("customer", "admin") as RequestHandler,
    CustomerController.upcommingJobs
)

router.get("/get-job-bid-details/:jobId",
    authMiddleware as RequestHandler,
    authorize("customer", "admin") as RequestHandler,
    CustomerController.getJobAndBidDetails
)

router.get("/get-bid-partner-details/:jobId/:partnerId",
    authMiddleware as RequestHandler,
    authorize("customer", "admin") as RequestHandler,
    CustomerController.getJobBidPartnerDetails
)

router.put("/job-biding-partner-booked/:jobId/:partnerId",
    authMiddleware as RequestHandler,
    authorize("customer", "admin") as RequestHandler,
    CustomerController.jobBindPartner
)

router.get("/get-preview-booking-details/:bookingId",
    authMiddleware as RequestHandler,
    authorize("customer", "admin") as RequestHandler,
    CustomerController.getPreviewBookingDetails
)

router.post("/job-booking-confirme",
    authMiddleware as RequestHandler,
    authorize("customer", "admin") as RequestHandler,
    CustomerController.jobBookingConfirme
)
router.get("/get-booking-payment-status/:merchantOrderId",
    authMiddleware as RequestHandler,
    authorize("customer", "admin") as RequestHandler,
    CustomerController.bookingPaymentStatus
)

router.get("/get-booking-payment-details/:bookingId",
    authMiddleware as RequestHandler,
    authorize("customer", "admin") as RequestHandler,
    CustomerController.getBookingPaymentDetails
)

router.get("/cancel-job-booking/:jobId",
    authMiddleware as RequestHandler,
    authorize("customer", "admin") as RequestHandler,
    CustomerController.cancelJobBooking
)

router.get("/get-ongoing-jobs",
    authMiddleware as RequestHandler,
    authorize("customer", "admin") as RequestHandler,
    CustomerController.ongoingJobs
)

router.get("/get-previous-jobs",
    authMiddleware as RequestHandler,
    authorize("customer", "admin") as RequestHandler,
    CustomerController.previousJobs
)

router.get("/get-language/:languageType",
    CustomerController.getLanguages
)

router.get("/get-language-list",
    CustomerController.getLanguageList
)

router.post("/update-language-code",
    authMiddleware as RequestHandler,
    authorize("admin", "customer") as RequestHandler,
    CustomerController.updateLanguageCode
)

router.get("/get-notifications",
    authMiddleware as RequestHandler,
    authorize("admin", "customer") as RequestHandler,
    CustomerController.getNotifications
)

router.get("/read-notification/:id",
    authMiddleware as RequestHandler,
    authorize("admin", "customer") as RequestHandler,
    CustomerController.readNotifications
)

router.get("/get-notification-details/:id",
    authMiddleware as RequestHandler,
    authorize("admin", "customer") as RequestHandler,
    CustomerController.getNotificationDetails
)

router.post("/review-rating",
    authMiddleware as RequestHandler,
    authorize("admin", "customer") as RequestHandler,
    CustomerController.reviewAndRating
)

router.get("/near-me-done-jobs",
    authMiddleware as RequestHandler,
    authorize("admin", "customer") as RequestHandler,
    CustomerController.nearMeDoneJobs
)

router.get("/filter-services",
    authMiddleware as RequestHandler,
    authorize("admin", "customer") as RequestHandler,
    CustomerController.filterServices
)

router.post("/bookmark",
    authMiddleware as RequestHandler,
    authorize("admin", "customer") as RequestHandler,
    CustomerController.bookmark
)

router.get("/bookmark",
    authMiddleware as RequestHandler,
    authorize("admin", "customer") as RequestHandler,
    CustomerController.getbookmark
)

router.get("/banners",
    authMiddleware as RequestHandler,
    authorize("admin", "customer") as RequestHandler,
    CustomerController.getBanners
)

router.get("/transaction-history",
    authMiddleware as RequestHandler,
    authorize("admin", "customer") as RequestHandler,
    CustomerController.transactionHistory
)


router.get("/get-subscription-plans",
    authMiddleware as RequestHandler,
    authorize("admin", "customer") as RequestHandler,
    CustomerController.getSubscriptionPlans as RequestHandler
)

router.post("/subscription-without-code",
    authMiddleware as RequestHandler,
    authorize("admin", "customer") as RequestHandler,
    CustomerController.subscriptionWithoutCode
)

router.post("/partner-subscription-payment-status",
    authMiddleware as RequestHandler,
    authorize("admin", "customer") as RequestHandler,
    CustomerController.fetchSubscriptionPaymentstatus
)
 

router.get("/get-subscription-plan-status",
    authMiddleware as RequestHandler,
    authorize("admin", "customer") as RequestHandler,
    CustomerController.getSubscriptionPlanStatus
)

router.post("/check-job-surge-pricing",
    authMiddleware as RequestHandler,
    authorize("admin", "customer") as RequestHandler,
    CustomerController.checkJobSurgePricing
)

router.post("/apply-coupon-code",
    authMiddleware as RequestHandler,
    authorize("admin", "customer") as RequestHandler,
    CustomerController.checkCouponCode
)

router.get("/get-support-url",
    CustomerController.getStaticWebUrls
)

router.get("/share-link",
    authMiddleware as RequestHandler,
    authorize("admin", "customer") as RequestHandler,
    CustomerController.shareLink
)


router.get("/voccational-banners",
    authMiddleware as RequestHandler,
    authorize("admin", "customer") as RequestHandler,
    CustomerController.getVoccationalBanners
)


router.get("/get-current-bookings",
    authMiddleware as RequestHandler,
    authorize("customer", "admin") as RequestHandler,
    CustomerController.currentBooking
)

router.get("/get-users-and-rating",
    authMiddleware as RequestHandler,
    authorize("customer", "admin") as RequestHandler,
    CustomerController.getTotalPartnerAndCustomer
)

router.get("/get-notifications-count",
    authMiddleware as RequestHandler,
    authorize("customer", "admin") as RequestHandler,
    CustomerController.getNotificationsCount
)


router.post("/add-withdraw-request",
    authMiddleware as RequestHandler,
    authorize("admin", "customer") as RequestHandler,
    CustomerController.addWithdrawRequest
)

router.get("/transaction-details/:id",
    authMiddleware as RequestHandler,
    authorize("admin", "customer") as RequestHandler,
    CustomerController.transactionDetails
)

router.get("/app-review-list",
    authMiddleware as RequestHandler,
    authorize("admin", "customer") as RequestHandler,
    CustomerController.appReviewList
)

router.post("/app-review",
    authMiddleware as RequestHandler,
    authorize("admin", "customer") as RequestHandler,
    CustomerController.appReview
)



router.post("/notification-setting",
    authMiddleware as RequestHandler,
    authorize("admin", "customer") as RequestHandler,
    CustomerController.notificationSetting
)

router.get("/notification-setting",
    authMiddleware as RequestHandler,
    authorize("admin", "customer") as RequestHandler,
    CustomerController.getNotificationSetting
)

router.get("/share-services-link/:serviceId",
    authMiddleware as RequestHandler,
    authorize("admin", "customer") as RequestHandler,
    CustomerController.shareServicesLink
)


router.post("/payment-method",
    authMiddleware as RequestHandler,
    authorize("admin", "customer") as RequestHandler,
    CustomerController.addPaymentmethod
)

router.get("/payment-method",
    authMiddleware as RequestHandler,
    authorize("admin", "customer") as RequestHandler,
    CustomerController.getPaymentMethod
)


router.get("/set-primary-payment/:methodId",
    authMiddleware as RequestHandler,
    authorize("admin", "customer") as RequestHandler,
    CustomerController.setPrimaryPaymentMethod
)

router.post("/razorpay-verify-wallet-amount",
    authMiddleware as RequestHandler,
    authorize("admin", "customer") as RequestHandler,
    CustomerController.addWalletAmountRazorpayVerify
)

router.get("/razorpay-wallet-payment-status/:paymentId",
    authMiddleware as RequestHandler,
    authorize("admin","customer") as RequestHandler,
    CustomerController.getRazorpayWalletPaymentStatus
)

router.post("/verify-razorpay-subscription-payment",
    authMiddleware as RequestHandler,
    authorize("admin","customer") as RequestHandler, 
    CustomerController.verifyRazorpaySubscriptionPayment
)

router.get("/get-razorpay-subscription-payment-status/:paymentId",
    authMiddleware as RequestHandler,
    authorize("admin","customer") as RequestHandler,
    CustomerController.getRazorpaySubscriptionPaymentStatus
)


/**
 * @swagger
 * /customer/job-basic-detail:
 *   post:
 *     summary: Create job basic detail
 *     description: Register a new job request with details like service, schedule, address and images.
 *     tags:
 *       - Customer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               serviceId:
 *                 type: string
 *                 example: "68d11d29ffeb4fef47c1c12e"
 *               title:
 *                 type: string
 *                 example: "Leak Fixes6"
 *               description:
 *                 type: string
 *                 example: "Leak Fixes"
 *               job_date:
 *                 type: string
 *                 format: date
 *                 example: "2025-11-04"
 *               job_time:
 *                 type: string
 *                 example: "13:00"
 *               estimated_time:
 *                 type: number
 *                 example: 1
 *               full_address:
 *                 type: string
 *                 example: "555 Bhopal, Madhya Pradesh 462022"
 *               latitude:
 *                 type: number
 *                 example: 22.7359479
 *               longitude:
 *                 type: number
 *                 example: 75.8821943
 *               price:
 *                 type: number
 *                 example: 500
 *               couponCode:
 *                 type: string
 *                 example: ""
 *               isEmergencyService:
 *                 type: boolean
 *                 example: false
 *               isVocationalBannerService:
 *                 type: boolean
 *                 example: false
 *               vocationalBannerServiceId:
 *                 type: string
 *                 example: "69159731bea39c5ad239969f"
 *               jobImages:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Job related images
 *     responses:
 *       200:
 *         description: Job created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Job created successfully"
 *                 data:
 *                   type: object
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /customer/job-contact-detail:
 *   post:
 *     tags:
 *       - Customer
 *     summary: Add job contact details
 *     description: Stores the contact details related to a job.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - jobId
 *               - contact_name
 *               - contact_number
 *             properties:
 *               jobId:
 *                 type: string
 *                 example: "690b2075ce4861f33416a05e"
 *               contact_name:
 *                 type: string
 *                 example: "dinesh"
 *               contact_number:
 *                 type: string
 *                 example: "8435671991"
 *               contact_email:
 *                 type: string
 *                 example: "suresh@gmail.com"
 *     responses:
 *       200:
 *         description: Contact details saved successfully
 *       400:
 *         description: Bad Request
 *       500:
 *         description: Server Error
 */


/**
 * @swagger
 * /customer/job-confirmation:
 *   post:
 *     summary: Confirm a job by jobId
 *     tags:
 *       - Customer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               jobId:
 *                 type: string
 *                 example: "690b2075ce4861f33416a05e"
 *             required:
 *               - jobId
 *     responses:
 *       200:
 *         description: Job confirmed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Job confirmed successfully"
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid jobId or bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid jobId"
 */


router.get("/wallet-razorpay-by-orderid/:orderId",
    authMiddleware as RequestHandler,
    authorize("admin","customer") as RequestHandler, 
    CustomerController.walletRazorpayPaymentByOrderId
)


router.get("/subsription-razorpay-by-orderid/:orderId",
    authMiddleware as RequestHandler,
    authorize("admin","customer") as RequestHandler, 
    CustomerController.subscriptionRazorpayPaymentByOrderId
)

router.get("/check-email",
    authMiddleware as RequestHandler,
    authorize("admin","customer","partner") as RequestHandler,
    CustomerController.checkEmail
)

router.post("/check-coupon-referral", 
    authMiddleware as RequestHandler,
    authorize("admin","customer") as RequestHandler, 
    CustomerController.checkCouponReferral
)

router.post("/apply-referral-code",
    authMiddleware as RequestHandler,
    authorize("admin","customer") as RequestHandler,
    CustomerController.applyReferralCode
)

router.post("/add-subscriptionplans-with-code",
    authMiddleware as RequestHandler,
    authorize("admin","customer") as RequestHandler,
    CustomerController.addSubscriptionplans
)


router.get("/referral-points-details",
    authMiddleware as RequestHandler,
    authorize("admin","customer") as RequestHandler,
    CustomerController.getReferralPointsDetails
)

router.post("/redeem-points",
    authMiddleware as RequestHandler,
    authorize("admin","customer") as RequestHandler,
    CustomerController.redeemPoints
)

router.get("/get-referral-history",
    authMiddleware as RequestHandler,
    authorize("admin", "customer") as RequestHandler,
    CustomerController.getReferralHistory
)

export default router;
