import express,{ Router , RequestHandler, NextFunction } from "express";
import { authorize } from "../middlewares/auth.middleware.js";
import asyncHandler from "express-async-handler"; 
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { SubscriptionPlansController } from "../controllers/subscriptionPlans.controller.js";

const router = express.Router();

router.post("/", 
    authMiddleware as RequestHandler,
    authorize("admin") as RequestHandler,
    asyncHandler(SubscriptionPlansController.createSubscriptionPlan)
);

router.get("/", 
    authMiddleware as RequestHandler,
    authorize("admin","partner") as RequestHandler,
    asyncHandler(SubscriptionPlansController.getAllSubscriptionPlans)
);

router.put("/:id", 
    authMiddleware as RequestHandler,
    authorize("admin") as RequestHandler,
    asyncHandler(SubscriptionPlansController.updateSubscriptionPlan)
);

router.delete("/:id", 
    authMiddleware as RequestHandler,   
    authorize("admin") as RequestHandler,
    asyncHandler(SubscriptionPlansController.deleteSubscriptionPlan)
); 



router.post("/customer-subscription-plans", 
    authMiddleware as RequestHandler,
    authorize("admin") as RequestHandler,
    asyncHandler(SubscriptionPlansController.createCustomerSubscriptionPlan)
);

router.get("/customer-subscription-plans", 
    authMiddleware as RequestHandler,
    authorize("admin","partner") as RequestHandler,
    asyncHandler(SubscriptionPlansController.getCustomerAllSubscriptionPlans)
);
 

router.put("/customer-subscription-plans/:id", 
    authMiddleware as RequestHandler,
    authorize("admin") as RequestHandler,
    asyncHandler(SubscriptionPlansController.updateCustomerSubscriptionPlan)
);


router.delete("/customer-subscription-plans/:id", 
    authMiddleware as RequestHandler,   
    authorize("admin") as RequestHandler,
    asyncHandler(SubscriptionPlansController.deleteSubscriptionPlan)
); 

export default router;