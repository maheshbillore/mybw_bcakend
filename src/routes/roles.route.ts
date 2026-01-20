import express, { RequestHandler } from "express";
import { RolesController } from "../controllers/roles.controller.js";
import { authMiddleware, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();

router
.get("/", authMiddleware as RequestHandler, authorize("admin") as RequestHandler, RolesController.getRoles)
.get("/list", authMiddleware as RequestHandler, authorize("admin", "volunteer") as RequestHandler, RolesController.listOfRoles)
.get("/roles-list", authMiddleware as RequestHandler, authorize("admin") as RequestHandler, RolesController.rolesList)
.post("/", authMiddleware as RequestHandler, authorize("admin") as RequestHandler, RolesController.storeRole)
.get("/:roleId", authMiddleware as RequestHandler, authorize("admin") as RequestHandler, RolesController.getRole)
.put("/:roleId", authMiddleware as RequestHandler, authorize("admin") as RequestHandler, RolesController.updateRole)
.delete("/:roleId", authMiddleware as RequestHandler, authorize("admin") as RequestHandler, RolesController.deleteRole);

export default router;