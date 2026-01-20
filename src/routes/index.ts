import express from "express";
import authRoute from "./auth.route.js";
import adminRoute from "./admin.route.js";
import serviceRoute from "./service.route.js";
import bookingRoute from "./booking.route.js";
import customerRoute from "./customer.route.js";
import partnerRoute from "./partner.route.js";
import categoryRoutes from "./category.route.js";
import subCategoryRoute from "./sub.category.route.js";
import subscriptionPlansRoute from "./subscriptionPlans.route.js";
import categorytype from "./categorytype.route.js";
import phonepe from "./phonepe.route.js";
import referalcode from "./referral.code.route.js";
import couponCode from "./coupon.code.route.js";
import webpartnerRoute from './webpartner.route.js'
import roles from "./roles.route.js";
import permissions from "./permissions.route.js";
import BidCharges from "./bidCharges.route.js";
import Users from "./users.route.js";
import Memory from "./memoryRoute.js";
import Web from "./web.route.js";

const router = express.Router();

router.use("/auth", authRoute);
router.use("/admin", adminRoute);
router.use("/services", serviceRoute);
router.use("/booking", bookingRoute);
router.use("/customer", customerRoute);
router.use("/partner", partnerRoute);
router.use("/webpartner", webpartnerRoute);
router.use("/categories", categoryRoutes);
router.use("/sub-categories", subCategoryRoute);
router.use("/subscription-plans", subscriptionPlansRoute);
router.use("/category-type", categorytype);
router.use("/phonepe", phonepe);
router.use("/referral-code", referalcode);
router.use("/coupon-code",couponCode);
router.use("/roles", roles);
router.use("/permissions", permissions);
router.use("/bid-charges", BidCharges);
router.use("/users", Users);
router.use("/memory",Memory);
router.use("/web",Web);

export default router;