import express, { RequestHandler } from "express";
import { authMiddleware, authorize } from "../middlewares/auth.middleware.js";
import { ServiceController } from "../controllers/service.controller.js";
import asyncHandler from "express-async-handler";
import { uploadSingle } from "../config/multer.config.js";

const router = express.Router();

router.post(
    "/",
    authMiddleware as RequestHandler,
    authorize("admin", "volunteer", "customer") as RequestHandler,
    uploadSingle.single('services') as RequestHandler,
    asyncHandler(ServiceController.createService)
);

router.put(
    "/:id",
    authMiddleware as RequestHandler,
    authorize("admin", "volunteer", "customer") as RequestHandler,
    uploadSingle.single('services') as RequestHandler,
    asyncHandler(ServiceController.updateService)
);

router.get(
    "/",
    authMiddleware as RequestHandler,
    authorize("admin", "customer", "volunteer") as RequestHandler,
    asyncHandler(ServiceController.getAllServices)
);

router.post(
    "/getServicesByCategory",
    authMiddleware as RequestHandler,
    authorize("admin", "customer", "volunteer") as RequestHandler,
    asyncHandler(ServiceController.getServicesByCategory)
);

router.delete(
    "/:id",
    authMiddleware as RequestHandler,
    authorize("admin", "volunteer", "customer") as RequestHandler,
    asyncHandler(ServiceController.deleteService)
);

export default router;