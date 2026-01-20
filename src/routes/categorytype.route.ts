import express, { RequestHandler } from "express";
import { authMiddleware, authorize } from "../middlewares/auth.middleware.js";
import { CategorytypeController } from "../controllers/categorytype.controller.js";
import { uploadSingle } from "../config/multer.config.js";

const router = express.Router();


router.post("/",
    authMiddleware as RequestHandler,
    authorize("admin") as RequestHandler,
    uploadSingle.single('categoryType') as RequestHandler,
    CategorytypeController.Create
)

router.get("/",
    authMiddleware as RequestHandler,
    authorize("admin","partner") as RequestHandler,
    CategorytypeController.index
)

router.put("/:id",
    authMiddleware as RequestHandler,
    authorize("admin") as RequestHandler,
    uploadSingle.single('categoryType') as RequestHandler,
    CategorytypeController.update
)

router.delete("/:id",
    authMiddleware as RequestHandler,
    authorize("admin") as RequestHandler,
    CategorytypeController.delete
)

export default router;