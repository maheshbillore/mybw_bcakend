import express, { RequestHandler } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { authMiddleware, authorize } from "../middlewares/auth.middleware.js";
import { upload, uploadAny, uploadSingle } from "../config/multer.config.js";
import multer from "multer";

const router = express.Router();

router.post("/register/admin", AuthController.adminRegister as RequestHandler);

router.post(
    "/register",
    uploadSingle.single("picture"),
    authMiddleware as RequestHandler,
    authorize("admin") as RequestHandler,
    AuthController.register as RequestHandler
);

router.post(
    "/register-partner",
    authMiddleware as RequestHandler,
    authorize("admin","partner") as RequestHandler,
    uploadAny,
    AuthController.registerPartner
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticate user with email/phone and password, and return an access token.
 *     tags: [Auth]
 *     security: []  # 👈 This disables Bearer token for this route
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@gmail.com
 *               password:
 *                 type: string
 *                 example: user
 *     responses:
 *       200:
 *         description: Login successful
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
 *                   example: Login successful
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       400:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Invalid email or password
 *       500:
 *         description: Server error
 */

router.post("/login", AuthController.login as RequestHandler);

router.post("/resetPassword", AuthController.resetPassword as RequestHandler);

export default router;
