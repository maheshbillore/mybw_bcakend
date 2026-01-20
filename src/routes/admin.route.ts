import express, { RequestHandler } from "express";
import { AdminController } from "../controllers/admin.controller.js";
import { authMiddleware, authorize } from "../middlewares/auth.middleware.js";
import { upload, uploadAny, uploadSingle } from "../config/multer.config.js";
import multer from "multer";

const router = express.Router();

router.get(
  "/allUsers",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.getAllUsers
);

router.put(
  "/update-partner/:id",
  upload,
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.updatePartnerDetails
);

router.put(
  "/update/:id",
  uploadSingle.single("picture"),
  authMiddleware as RequestHandler,
  authorize("admin", "volunteer") as RequestHandler,
  AdminController.updateCustomer
);

router.put(
  "/deactivate/:id",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.deactivateUser
);

router.post(
  "/complaint",
  authMiddleware as RequestHandler,
  authorize("admin", "customer") as RequestHandler,
  AdminController.createComplaint as RequestHandler
);

router.put(
  "/updateComplaint/:id",
  authMiddleware as RequestHandler,
  authorize("admin", "customer") as RequestHandler,
  AdminController.updateComplaint as RequestHandler
);

router.get(
  "/get-transaction-list",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.getTransactionList as RequestHandler
);

router.post(
  "/banner",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  uploadSingle.single("banner") as RequestHandler,
  AdminController.banner
);

router.put(
  "/banner/:id",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  uploadSingle.single("banner") as RequestHandler,
  AdminController.updateBanner
);

router.patch(
  "/banner/:id",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.updateBannerStatus
);

router.post(
  "/add-referral-code",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.addReferralCode
);

router.get(
  "/logs/:type",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.logs
);

router.post(
  "/vocational-banner",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  uploadSingle.single("banner") as RequestHandler,
  AdminController.vocationalBanner
);

router.put(
  "/vocational-banner/:id",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  uploadSingle.single("banner") as RequestHandler,
  AdminController.updateBanner
);

router.get(
  "/vocational-banner",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.getVocationalBanner
);

router.get(
  "/dashboard-masters",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.dashboardMaster
);

router.get(
  "/dashboard-partners",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.dashboardPartner
);

router.post(
  "/partner/profile/createUpdate",
  authMiddleware as RequestHandler,
  authorize("admin", "volunteer") as RequestHandler,
  uploadSingle.single("profile") as RequestHandler,
  AdminController.partnerProfileCreateUpdate
);

router.post(
  "/partner/Skills/createUpdate",
  authMiddleware as RequestHandler,
  authorize("admin", "volunteer") as RequestHandler,
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
  AdminController.partnerSkillsCreateUpdate
);

router.post(
  "/partner/location/createUpdate",
  authMiddleware as RequestHandler,
  authorize("admin", "volunteer") as RequestHandler,
  AdminController.partnerLocationCreateUpdate
);

router.post(
  "/partner/document/createUpdate",
  authMiddleware as RequestHandler,
  authorize("admin", "volunteer") as RequestHandler,
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
  AdminController.partnerDocumentCreateUpdate
);

router.post(
  "/partner/profile/createUpdate",
  authMiddleware as RequestHandler,
  authorize("admin", "volunteer") as RequestHandler,
  uploadSingle.single("profile") as RequestHandler,
  AdminController.partnerProfileCreateUpdate
);

router.post(
  "/partner/Skills/createUpdate",
  authMiddleware as RequestHandler,
  authorize("admin", "volunteer") as RequestHandler,
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
  AdminController.partnerSkillsCreateUpdate
);

router.post(
  "/partner/location/createUpdate",
  authMiddleware as RequestHandler,
  authorize("admin", "volunteer") as RequestHandler,
  AdminController.partnerLocationCreateUpdate
);

router.post(
  "/partner/document/createUpdate",
  authMiddleware as RequestHandler,
  authorize("admin", "volunteer") as RequestHandler,
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
  AdminController.partnerDocumentCreateUpdate
);

/**
 * @swagger
 * /admin/dashboard-partners:
 *   get:
 *     summary: Status wise partners list
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs from this start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs up to this end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.get(
  "/dashboard-partners-search",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.dashboardPartnersSearch
);

/**
 * @swagger
 * /admin/dashboard-partners-search:
 *   get:
 *     summary: status wise partners list
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs from this start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs up to this end date (YYYY-MM-DD)
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *         required: false
 *         description: page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         required: false
 *         description: limit
 *       - in: query
 *         name: searchText
 *         schema:
 *           type: string
 *         required: false
 *         description: search by name description category name descption subcategory and descriptin
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [All, incoming, kyc_failed, pending_approval, all_partners]
 *           default: All
 *         required: false
 *         description: sort by job count asc or desc
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.get(
  "/plan-wise-customers",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.planWiseCustomers
);

/**
 * @swagger
 * /admin/plan-wise-customers:
 *   get:
 *     summary: Plan wise customer list
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs from this start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs up to this end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.get(
  "/dashboard-search-plan-wise-customer",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.planWiseCustomersSearch
);

/**
 * @swagger
 * /admin/dashboard-search-plan-wise-customer:
 *   get:
 *     summary: plan wise customer search
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs from this start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs up to this end date (YYYY-MM-DD)
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *         required: false
 *         description: page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         required: false
 *         description: limit
 *       - in: query
 *         name: searchText
 *         schema:
 *           type: string
 *         required: false
 *         description: search by name description category name descption subcategory and descriptin
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [All, plan name dynamic]
 *           default: All
 *         required: false
 *         description: sort by job count asc or desc
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.get(
  "/plan-wise-partner-count",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.planWisePartnerCount
);

/**
 * @swagger
 * /admin/plan-wise-partner-count:
 *   get:
 *     summary: plan wise partners
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs from this start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs up to this end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.get(
  "/plan-wise-partner-search",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.planWisePartnerSearch
);

/**
 * @swagger
 * /admin/plan-wise-partner-search:
 *   get:
 *     summary: plan wise partner search
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs from this start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs up to this end date (YYYY-MM-DD)
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *         required: false
 *         description: page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         required: false
 *         description: limit
 *       - in: query
 *         name: searchText
 *         schema:
 *           type: string
 *         required: false
 *         description: search by name description category name descption subcategory and descriptin
 *       - in: query
 *         name: plan
 *         schema:
 *           type: string
 *         required: false
 *         description: sort by job count asc or desc
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.get(
  "/referral-customer-count",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.referralCustomerCount
);

/**
 * @swagger
 * /admin/referral-customer-count:
 *   get:
 *     summary: total referral customer list
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs from this start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs up to this end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.get(
  "/dashboard-jobs-status-wise",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.dashboardAllJobStatusWise
);

/**
 * @swagger
 * /admin/dashboard-jobs-status-wise:
 *   get:
 *     summary: all jobs status wise
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs from this start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs up to this end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.get(
  "/all-job-search-status-wise",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.dashboardAllJobSearch
);

/**
 * @swagger
 * /admin/all-job-search-status-wise:
 *   get:
 *     summary: all job seach
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs from this start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs up to this end date (YYYY-MM-DD)
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *         required: false
 *         description: page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         required: false
 *         description: limit
 *       - in: query
 *         name: searchText
 *         schema:
 *           type: string
 *         required: false
 *         description: search by name description category name descption subcategory and descriptin
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: ["All","pending", "open", "confirmation_Pending", "confirmed", "on_the_Way", "arrived", "paused", "awaiting_material", "awaiting_payment", "in_progress", "completed", "cancelled", "expired"]
 *         required: false
 *         description: sort by job count asc or desc
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.get(
  "/dashboard-surge-pricing-wise-job",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.dashboardSurgePricingWiseJobs
);

/**
 * @swagger
 * /admin/dashboard-surge-pricing-wise-job:
 *   get:
 *     summary: dashboard-surge-pricing-wise-job
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs from this start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs up to this end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.get(
  "/surge-pricing-wise-job-search",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.dashboardSurgePricingWiseSearch
);

/**
 * @swagger
 * /admin/all-job-search-status-wise:
 *   get:
 *     summary: all job seach
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs from this start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs up to this end date (YYYY-MM-DD)
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *         required: false
 *         description: page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         required: false
 *         description: limit
 *       - in: query
 *         name: searchText
 *         schema:
 *           type: string
 *         required: false
 *         description: search by name description category name descption subcategory and descriptin
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: ["All","pending", "open", "confirmation_Pending", "confirmed", "on_the_Way", "arrived", "paused", "awaiting_material", "awaiting_payment", "in_progress", "completed", "cancelled", "expired"]
 *         required: false
 *         description: sort by job count asc or desc
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.get(
  "/get-jobs-grouped-by-subscription-plan",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.getJobsGroupedBySubscriptionPlan
);

/**
 * @swagger
 * /admin/get-jobs-grouped-by-subscription-plan:
 *   get:
 *     summary: get-jobs-grouped-by-subscription-plan
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs from this start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs up to this end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.get(
  "/emergency-service-wise-job",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.dashboardEmergencyServiceWiseJobs
);

/**
 * @swagger
 * /admin/emergency-service-wise-job:
 *   get:
 *     summary: Emergency service wise job list
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs from this start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs up to this end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.get(
  "/emergency-service-wise-job-search",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.dashboardEmergencyServiceWiseSearch
);

/**
 * @swagger
 * /admin/emergency-service-wise-job-search:
 *   get:
 *     summary: emergency service job details
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs from this start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs up to this end date (YYYY-MM-DD)
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *         required: false
 *         description: page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         required: false
 *         description: limit
 *       - in: query
 *         name: searchText
 *         schema:
 *           type: string
 *         required: false
 *         description: search by name description category name descption subcategory and descriptin
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         required: false
 *         description: sort by job count asc or desc
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /admin/get-jobs-grouped-by-subscription-plan:
 *   get:
 *     summary: get-jobs-grouped-by-subscription-plan
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs from this start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs up to this end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.get(
  "/services-wise-jobs",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.servicesWiseJobs
);

/**
 * @swagger
 * /admin/services-wise-jobs:
 *   get:
 *     summary: get services wise job details
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs from this start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs up to this end date (YYYY-MM-DD)
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *         required: false
 *         description: page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         required: false
 *         description: limit
 *       - in: query
 *         name: searchText
 *         schema:
 *           type: string
 *         required: false
 *         description: search by name description category name descption subcategory and descriptin
 *       - in: query
 *         name: sortedByJobCount
 *         schema:
 *           type: string
 *         required: false
 *         description: sort by job count asc or desc
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.get(
  "/job-wise-customer",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.jobWiseCustomer
);

/**
 * @swagger
 * /admin/job-wise-customer:
 *   get:
 *     summary: job wise top customers
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs from this start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs up to this end date (YYYY-MM-DD)
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *         required: false
 *         description: page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         required: false
 *         description: limit
 *       - in: query
 *         name: searchText
 *         schema:
 *           type: string
 *         required: false
 *         description: name email phone , referralCode etc
 *       - in: query
 *         name: sortedByJobCount
 *         schema:
 *           type: string
 *         required: false
 *         description: sort by job count asc or desc
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.get(
  "/booking-wise-partners",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.bookingWisePartners
);

/**
 * @swagger
 * /admin/booking-wise-partners:
 *   get:
 *     summary: Booking wise partners list
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs from this start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs up to this end date (YYYY-MM-DD)
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *         required: false
 *         description: page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         required: false
 *         description: limit
 *       - in: query
 *         name: searchText
 *         schema:
 *           type: string
 *         required: false
 *         description: name email phone , referralCode etc
 *       - in: query
 *         name: sortedByJobCount
 *         schema:
 *           type: string
 *         required: false
 *         description: sort by job count asc or desc
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /admin/dashboard-partners:
 *   get:
 *     summary: Status wise partners list
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs from this start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs up to this end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.get(
  "/dashboard-partners-search",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.dashboardPartnersSearch
);

/**
 * @swagger
 * /admin/dashboard-partners-search:
 *   get:
 *     summary: status wise partners list
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs from this start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs up to this end date (YYYY-MM-DD)
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *         required: false
 *         description: page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         required: false
 *         description: limit
 *       - in: query
 *         name: searchText
 *         schema:
 *           type: string
 *         required: false
 *         description: search by name description category name descption subcategory and descriptin
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [All, incoming, kyc_failed, pending_approval, all_partners]
 *           default: All
 *         required: false
 *         description: sort by job count asc or desc
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.get(
  "/plan-wise-customers",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.planWiseCustomers
);

/**
 * @swagger
 * /admin/plan-wise-customers:
 *   get:
 *     summary: Plan wise customer list
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs from this start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs up to this end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.get(
  "/dashboard-search-plan-wise-customer",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.planWiseCustomersSearch
);

/**
 * @swagger
 * /admin/dashboard-search-plan-wise-customer:
 *   get:
 *     summary: plan wise customer search
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs from this start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs up to this end date (YYYY-MM-DD)
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *         required: false
 *         description: page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         required: false
 *         description: limit
 *       - in: query
 *         name: searchText
 *         schema:
 *           type: string
 *         required: false
 *         description: search by name description category name descption subcategory and descriptin
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [All, plan name dynamic]
 *           default: All
 *         required: false
 *         description: sort by job count asc or desc
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.get(
  "/plan-wise-partner-count",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.planWisePartnerCount
);

/**
 * @swagger
 * /admin/plan-wise-partner-count:
 *   get:
 *     summary: plan wise partners
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs from this start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs up to this end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.get(
  "/plan-wise-partner-search",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.planWisePartnerSearch
);

/**
 * @swagger
 * /admin/plan-wise-partner-search:
 *   get:
 *     summary: plan wise partner search
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs from this start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs up to this end date (YYYY-MM-DD)
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *         required: false
 *         description: page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         required: false
 *         description: limit
 *       - in: query
 *         name: searchText
 *         schema:
 *           type: string
 *         required: false
 *         description: search by name description category name descption subcategory and descriptin
 *       - in: query
 *         name: plan
 *         schema:
 *           type: string
 *         required: false
 *         description: sort by job count asc or desc
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.get(
  "/referral-customer-count",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.referralCustomerCount
);

/**
 * @swagger
 * /admin/referral-customer-count:
 *   get:
 *     summary: total referral customer list
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs from this start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs up to this end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.get(
  "/dashboard-jobs-status-wise",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.dashboardAllJobStatusWise
);

/**
 * @swagger
 * /admin/dashboard-jobs-status-wise:
 *   get:
 *     summary: all jobs status wise
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs from this start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs up to this end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.get(
  "/all-job-search-status-wise",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.dashboardAllJobSearch
);

/**
 * @swagger
 * /admin/all-job-search-status-wise:
 *   get:
 *     summary: all job seach
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs from this start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs up to this end date (YYYY-MM-DD)
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *         required: false
 *         description: page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         required: false
 *         description: limit
 *       - in: query
 *         name: searchText
 *         schema:
 *           type: string
 *         required: false
 *         description: search by name description category name descption subcategory and descriptin
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: ["All","pending", "open", "confirmation_Pending", "confirmed", "on_the_Way", "arrived", "paused", "awaiting_material", "awaiting_payment", "in_progress", "completed", "cancelled", "expired"]
 *         required: false
 *         description: sort by job count asc or desc
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.get(
  "/dashboard-surge-pricing-wise-job",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.dashboardSurgePricingWiseJobs
);

/**
 * @swagger
 * /admin/dashboard-surge-pricing-wise-job:
 *   get:
 *     summary: dashboard-surge-pricing-wise-job
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs from this start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs up to this end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.get(
  "/surge-pricing-wise-job-search",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.dashboardSurgePricingWiseSearch
);

/**
 * @swagger
 * /admin/all-job-search-status-wise:
 *   get:
 *     summary: all job seach
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs from this start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs up to this end date (YYYY-MM-DD)
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *         required: false
 *         description: page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         required: false
 *         description: limit
 *       - in: query
 *         name: searchText
 *         schema:
 *           type: string
 *         required: false
 *         description: search by name description category name descption subcategory and descriptin
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: ["All","pending", "open", "confirmation_Pending", "confirmed", "on_the_Way", "arrived", "paused", "awaiting_material", "awaiting_payment", "in_progress", "completed", "cancelled", "expired"]
 *         required: false
 *         description: sort by job count asc or desc
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.get(
  "/get-jobs-grouped-by-subscription-plan",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.getJobsGroupedBySubscriptionPlan
);

/**
 * @swagger
 * /admin/get-jobs-grouped-by-subscription-plan:
 *   get:
 *     summary: get-jobs-grouped-by-subscription-plan
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs from this start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs up to this end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.get(
  "/emergency-service-wise-job",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.dashboardEmergencyServiceWiseJobs
);

/**
 * @swagger
 * /admin/emergency-service-wise-job:
 *   get:
 *     summary: Emergency service wise job list
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs from this start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs up to this end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.get(
  "/emergency-service-wise-job-search",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.dashboardEmergencyServiceWiseSearch
);

/**
 * @swagger
 * /admin/emergency-service-wise-job-search:
 *   get:
 *     summary: emergency service job details
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs from this start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs up to this end date (YYYY-MM-DD)
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *         required: false
 *         description: page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         required: false
 *         description: limit
 *       - in: query
 *         name: searchText
 *         schema:
 *           type: string
 *         required: false
 *         description: search by name description category name descption subcategory and descriptin
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         required: false
 *         description: sort by job count asc or desc
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /admin/get-jobs-grouped-by-subscription-plan:
 *   get:
 *     summary: get-jobs-grouped-by-subscription-plan
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs from this start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs up to this end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.get(
  "/services-wise-jobs",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.servicesWiseJobs
);

/**
 * @swagger
 * /admin/services-wise-jobs:
 *   get:
 *     summary: get services wise job details
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs from this start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs up to this end date (YYYY-MM-DD)
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *         required: false
 *         description: page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         required: false
 *         description: limit
 *       - in: query
 *         name: searchText
 *         schema:
 *           type: string
 *         required: false
 *         description: search by name description category name descption subcategory and descriptin
 *       - in: query
 *         name: sortedByJobCount
 *         schema:
 *           type: string
 *         required: false
 *         description: sort by job count asc or desc
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.get(
  "/job-wise-customer",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.jobWiseCustomer
);

/**
 * @swagger
 * /admin/job-wise-customer:
 *   get:
 *     summary: job wise top customers
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs from this start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs up to this end date (YYYY-MM-DD)
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *         required: false
 *         description: page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         required: false
 *         description: limit
 *       - in: query
 *         name: searchText
 *         schema:
 *           type: string
 *         required: false
 *         description: name email phone , referralCode etc
 *       - in: query
 *         name: sortedByJobCount
 *         schema:
 *           type: string
 *         required: false
 *         description: sort by job count asc or desc
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.get(
  "/booking-wise-partners",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.bookingWisePartners
);

/**
 * @swagger
 * /admin/booking-wise-partners:
 *   get:
 *     summary: Booking wise partners list
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs from this start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter jobs up to this end date (YYYY-MM-DD)
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *         required: false
 *         description: page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         required: false
 *         description: limit
 *       - in: query
 *         name: searchText
 *         schema:
 *           type: string
 *         required: false
 *         description: name email phone , referralCode etc
 *       - in: query
 *         name: sortedByJobCount
 *         schema:
 *           type: string
 *         required: false
 *         description: sort by job count asc or desc
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /admin/logs/{type}:
 *   get:
 *     summary: Download or view system log files
 *     description: >
 *       This API allows an admin user to view or download specific types of log files (e.g., app logs, error logs, access logs).
 *       Requires authentication and admin authorization.
 *     tags:
 *       - Logs
 *     security:
 *       - bearerAuth: []        # JWT or similar authentication
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           description: Type of log file to view or download.
 *     responses:
 *       200:
 *         description: Successfully retrieved the requested log file.
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: |
 *                 [2025-11-06 11:00:00] INFO Server started on port 3000
 *                 [2025-11-06 11:01:15] WARN Memory usage high
 *       400:
 *         description: Invalid log type or bad request.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Invalid log type
 *       401:
 *         description: Unauthorized — missing or invalid token.
 *       403:
 *         description: Forbidden — only admin users can access logs.
 *       404:
 *         description: Log file not found.
 *       500:
 *         description: Internal server error.
 */

router.get('/payment-gateway',
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.changePaymentGateway
)

/**
 * @swagger
 * /admin/get-transaction-list:
 *   get:
 *     summary: Get transaction list with pagination and filters
 *     tags:
 *       - Admin Payment
 *     security:
 *       - bearerAuth: [] 
 *     responses:
 *       200:
 *         description: Transaction list fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       transactionId:
 *                         type: string
 *                       paymentMethod:
 *                         type: string
 *                       paymentStatus:
 *                         type: string
 *                       paymentBy:
 *                         type: string
 *                       paymentFor:
 *                         type: string
 *                       invoiceNo:
 *                         type: string
 *                       merchantOrderId:
 *                         type: string
 *                       particular:
 *                         type: string
 *                       amount:
 *                         type: number
 *                       paymentGateway:
 *                         type: string
 *                       transactionType:
 *                         type: string
 *                       transactionDate:
 *                         type: string
 *                         format: date-time
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: number
 *                     limit:
 *                       type: number
 *                     totalRecords:
 *                       type: number
 *                     totalPages:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */


router.get("/search-transaction-list",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.searchTransactionList
)


/**
 * @swagger
 * /admin/search-transaction-list:
 *   get:
 *     tags:
 *       - Admin Payment
 *     summary: Search transaction list with filters & pagination
 *     description: Fetch transactions using date range, status, gateway and search text
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         example: 2025-01-15
 *
 *       - in: query
 *         name: endDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         example: 2025-12-20
 *
 *       - in: query
 *         name: paymentStatus
 *         required: false
 *         schema:
 *           type: string
 *         example: created
 *
 *       - in: query
 *         name: payment_gateway
 *         required: false
 *         schema:
 *           type: string
 *         example: PHONEPE
 *
 *       - in: query
 *         name: searchText
 *         required: false
 *         schema:
 *           type: string
 *         example: order_Rsbk6XUrmvCJli
 *
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *         example: 10
 *
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *         example: 1
 *
 *     responses:
 *       200:
 *         description: Transaction list fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       transactionId:
 *                         type: string
 *                       paymentStatus:
 *                         type: string
 *                       amount:
 *                         type: number
 *                       payment_gateway:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalRecords:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.get("/gateway",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.getPaymentGateway
) 

router.post("/gateway",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.updatePaymentGateway
)

router.get("/fetch-n-search-master",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.fetchNsearchMaster
)

router.post("/redeem-rate",
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.redeemRate
)

router.get('/redeem-rate',
  authMiddleware as RequestHandler,
  authorize("admin") as RequestHandler,
  AdminController.getRedeemRate
)

export default router;
