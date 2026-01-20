import express, { RequestHandler } from "express";
import { authMiddleware, authorize } from "../middlewares/auth.middleware.js";
import { PhonepeController } from "../controllers/phonepe.controller.js"; 

const router = express.Router();

router.post("/initiate-payment",
    authMiddleware as RequestHandler,
    authorize("admin","partner","customer") as RequestHandler,
    PhonepeController.initiatePayment
) 

router.get("/verify-transaction",
    authMiddleware as RequestHandler,
    authorize("admin","partner","customer") as RequestHandler, 
    PhonepeController.verifyTransaction
)

router.post("/partner-subscription-pay-now",
    authMiddleware as RequestHandler,
    authorize("admin","partner","customer") as RequestHandler,
    PhonepeController.partnerSubscriptionPayNow
)

export default router;