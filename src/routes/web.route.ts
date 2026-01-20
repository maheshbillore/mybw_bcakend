import express from "express";
import { WebController } from "../controllers/web.controller.js";
const router = express.Router();


router.get("/get-category",
    WebController.getCategory
)

router.get("/get-sub-category",
    WebController.getSubCategory
)

router.get("/get-services",
    WebController.getServices
)
 
router.get("/get-service-details",
    WebController.getServiceDetails
)

router.get("/search",
    WebController.search
)
 
export default router;