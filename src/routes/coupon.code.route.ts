import express, { RequestHandler } from "express";
import { authMiddleware, authorize } from "../middlewares/auth.middleware.js";
import CouponCodeController from "../controllers/coupon.code.controller.js";

const router = express.Router();


router.post("/",
    authMiddleware as RequestHandler,
    authorize("admin") as RequestHandler,
    CouponCodeController.add
)

router.get("/",
    authMiddleware as RequestHandler,
    authorize("admin") as RequestHandler,
    CouponCodeController.get
)

router.put("/:couponId",
    authMiddleware as RequestHandler,
    authorize("admin") as RequestHandler,
    CouponCodeController.update
)

router.delete("/:couponId",
    authMiddleware as RequestHandler,
    authorize("admin") as RequestHandler,
    CouponCodeController.delete
)

router.post("/check-coupon-referral",
    authMiddleware as RequestHandler,
    authorize("admin","partner") as RequestHandler,
    CouponCodeController.checkCouponReferral
)



router.post("/customer-coupon-code",
    authMiddleware as RequestHandler,
    authorize("admin") as RequestHandler,
    CouponCodeController.addCustomerCouponCode
)

router.get("/customer-coupon-code",
    authMiddleware as RequestHandler,
    authorize("admin") as RequestHandler,
    CouponCodeController.getCustomerCouponCode
)
 
router.put("/customer-coupon-code/:couponId",
    authMiddleware as RequestHandler,
    authorize("admin") as RequestHandler,
    CouponCodeController.update
)

router.delete("/customer-coupon-code/:couponId",
    authMiddleware as RequestHandler,
    authorize("admin") as RequestHandler,
    CouponCodeController.delete
)

router.put("/change-status/:couponId",
    authMiddleware as RequestHandler,
    authorize("admin") as RequestHandler,
    CouponCodeController.changeStatus
)

export default router