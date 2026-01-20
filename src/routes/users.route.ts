import express, { RequestHandler } from "express";
import { UsersController } from "../controllers/users.controller.js";
import { authMiddleware, authorize } from "../middlewares/auth.middleware.js";
import { upload, uploadSingle } from "../config/multer.config.js";

const router = express.Router();

router
.get("/", authMiddleware as RequestHandler, authorize("admin") as RequestHandler, UsersController.getUsers)
.get("/check-email-exists/:email", authMiddleware as RequestHandler, authorize("admin", "volunteer") as RequestHandler, UsersController.checkEmailExists)
.get("/check-mobile-exists/:mobile", authMiddleware as RequestHandler, authorize("admin", "volunteer") as RequestHandler, UsersController.checkMobileExists)
.post("/", authMiddleware as RequestHandler, authorize("admin") as RequestHandler, uploadSingle.single('picture') as RequestHandler, UsersController.storeUser)
.put("/:userId", authMiddleware as RequestHandler, authorize("admin") as RequestHandler, uploadSingle.single('picture') as RequestHandler, UsersController.updateUser)
.delete("/:userId", authMiddleware as RequestHandler, authorize("admin") as RequestHandler, UsersController.deleteUser);

export default router;