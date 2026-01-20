import express, { RequestHandler } from 'express';
import { authMiddleware, authorize } from '../middlewares/auth.middleware.js';
import { ReferralCodeControllers } from '../controllers/referral.code.controller.js';

const router = express.Router();

router.post("/",
    authMiddleware as RequestHandler,
    authorize('admin') as RequestHandler,
    ReferralCodeControllers.add
)

router.get("/",
    authMiddleware as RequestHandler,
    authorize('admin') as RequestHandler,
    ReferralCodeControllers.get 
)

router.put("/:referralId",
    authMiddleware as RequestHandler,
    authorize('admin') as RequestHandler,
    ReferralCodeControllers.update
)

router.delete("/:referralId",
    authMiddleware as RequestHandler,
    authorize('admin') as RequestHandler,
    ReferralCodeControllers.delete
)

export default router;