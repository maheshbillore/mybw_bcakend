import express, { Router, RequestHandler, NextFunction } from "express";
import { SubCategoryController } from "../controllers/sub.category.controller.js";
import { authMiddleware, authorize } from "../middlewares/auth.middleware.js";
import asyncHandler from "express-async-handler";
import { upload, uploadSingle } from "../config/multer.config.js";
import multer from "multer";

const router = express.Router();

router.get(
  "/getSubCategories",
  authMiddleware as RequestHandler,
  authorize("admin", "partner", "volunteer") as RequestHandler,
  SubCategoryController.getSubCategories as RequestHandler
);

router.post(
  "/",
  authMiddleware as RequestHandler,
  authorize("admin", "partner", "volunteer") as RequestHandler,
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
  asyncHandler(SubCategoryController.createSubCategory)
);

router.put(
  "/:id",
  authMiddleware as RequestHandler,
  authorize("admin", "partner", "volunteer") as RequestHandler,
  uploadSingle.single('subCategoriesImages') as RequestHandler,
  SubCategoryController.updateSubCategory as RequestHandler
);

router.delete(
  "/:id",
  authMiddleware as RequestHandler,
  authorize("admin", "partner", "volunteer") as RequestHandler,
  SubCategoryController.deleteSubCategory as RequestHandler
);

router.get("/:id",
  authMiddleware as RequestHandler,
  authorize("admin", "partner", "volunteer") as RequestHandler,
  SubCategoryController.getSubCategoryById as RequestHandler);

router.patch("/status/:id",
  authMiddleware as RequestHandler,
  authorize("admin", "partner", "volunteer") as RequestHandler,
  SubCategoryController.updateSubCategoryStatus as RequestHandler);

router.post("/getSubCategoryByTypeAndCategoryId",
  authMiddleware as RequestHandler,
  authorize("admin", "partner", "volunteer") as RequestHandler,
  SubCategoryController.getSubCategoryByTypeAndCategoryId as RequestHandler);

router.get("/get-subcategory-by-categoryid/:categoryId",
  authMiddleware as RequestHandler,
  authorize("admin", "partner", "volunteer") as RequestHandler,
  SubCategoryController.getSubCatgoryByCategoryId as RequestHandler
)

export default router;