import express, { RequestHandler } from "express";
import { BidChargesController } from "../controllers/bidCharges.controller.js";
import { authMiddleware, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();

router
    .get('/get-bid-amount/',authMiddleware as RequestHandler, authorize("admin") as RequestHandler,BidChargesController.getBidAmount)
    .get("/", authMiddleware as RequestHandler, authorize("admin") as RequestHandler, BidChargesController.getBidCharges)
    .post("/", authMiddleware as RequestHandler, authorize("admin") as RequestHandler, BidChargesController.storeBidCharge)
    .get("/:bidChargeId", authMiddleware as RequestHandler, authorize("admin") as RequestHandler, BidChargesController.getBidCharge)
    .put("/:bidChargeId", authMiddleware as RequestHandler, authorize("admin") as RequestHandler, BidChargesController.updateBidCharge)
    .delete("/:bidChargeId", authMiddleware as RequestHandler, authorize("admin") as RequestHandler, BidChargesController.deleteBidCharge);
 

export default router;