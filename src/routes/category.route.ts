import express, { RequestHandler } from "express";
import { CategoryController } from "../controllers/category.controller.js";
import { authMiddleware, authorize } from "../middlewares/auth.middleware.js";
import asyncHandler from "express-async-handler";
import { upload } from "../config/multer.config.js";
import multer from "multer";
import { uploadSingle } from "../config/multer.config.js";

const router = express.Router();

router.post(
    "/",
    authMiddleware as RequestHandler,
    authorize("admin", "volunteer") as RequestHandler,
    asyncHandler(CategoryController.createCategory)
);

router.get(
    "/categories-list",
    authMiddleware as RequestHandler,
    authorize("admin", "partner", "volunteer") as RequestHandler,
    asyncHandler(CategoryController.getListOfCategories)
);

router.get(
    "/",
    authMiddleware as RequestHandler,
    authorize("admin", "partner", "volunteer") as RequestHandler,
    asyncHandler(CategoryController.getAllCategories)
);

router.put(
    "/:id",
    authMiddleware as RequestHandler,
    authorize("admin", "volunteer") as RequestHandler,
    uploadSingle.single('categoryImage') as RequestHandler,
    asyncHandler(CategoryController.updateCategory)
);

router.delete(
    "/:id",
    authMiddleware as RequestHandler,
    authorize("admin", "volunteer") as RequestHandler,
    asyncHandler(CategoryController.deleteCategory)
);

router.post(
    "/bulkCategories",
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
    asyncHandler(CategoryController.bulkCreateCategories)
);


/**
 * @swagger
 * /categories:
 *   post:
 *     summary: Create a new categories
 *     description: Allows an authenticated user to create a new categories.
 *     tags: [categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *               - name
 *               - description
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file to upload
 *               name:
 *                 type: string
 *                 example: Cleaning
 *               description:
 *                 type: string
 *                 example: Cleaning services for home and office
 *     responses:
 *       201:
 *         description: Category created successfully
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
 *                   example: category created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: 6756ce22e78f1b345a12cd9f
 *                     title:
 *                       type: string
 *                       example: My first post
 *                     content:
 *                       type: string
 *                       example: This is the content of my post.
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       500:
 *         description: Internal server error
 */



/**
 * @swagger
 * /categories:
 *   get:
 *     summary: fetch category successfully
 *     description: Allows an authenticated user to fetch categories.
 *     tags: [categories]  
 *     responses:
 *       201:
 *         description: Category fetch successfully
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
 *                   example: category fetch successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: 6756ce22e78f1b345a12cd9f
 *                     title:
 *                       type: string
 *                       example: My first post
 *                     content:
 *                       type: string
 *                       example: This is the content of my post.
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       500:
 *         description: Internal server error
 */
export default router;