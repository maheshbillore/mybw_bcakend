import express, { RequestHandler } from "express";
import { PermissionsController } from "../controllers/permissions.controller.js";
import { authMiddleware, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();

router
.get("/list", authMiddleware as RequestHandler, authorize("admin") as RequestHandler, PermissionsController.getPermissionsList)
.get("/list-of-permissions", authMiddleware as RequestHandler, authorize("admin") as RequestHandler, PermissionsController.getAllPermissions)
.post("/set-permissions", authMiddleware as RequestHandler, authorize("admin") as RequestHandler, PermissionsController.setPermissions)
.get("/role-has-permissions/:roleId", authMiddleware as RequestHandler, authorize("admin") as RequestHandler, PermissionsController.getRoleHasPermissions)
.get("/role-based-permissions/:roleId", authMiddleware as RequestHandler, authorize("admin", "volunteer") as RequestHandler, PermissionsController.getRoleBasedPermissions)

.get("/", authMiddleware as RequestHandler, authorize("admin") as RequestHandler, PermissionsController.getPermissions)
.get("/max-order", authMiddleware as RequestHandler, authorize("admin") as RequestHandler, PermissionsController.getPermissionMaxOrderNumber)
.post("/", authMiddleware as RequestHandler, authorize("admin") as RequestHandler, PermissionsController.storePermission)
.get("/:permissionId", authMiddleware as RequestHandler, authorize("admin") as RequestHandler, PermissionsController.getPermission)
.put("/:permissionId", authMiddleware as RequestHandler, authorize("admin") as RequestHandler, PermissionsController.updatePermission)
.delete("/:permissionId", authMiddleware as RequestHandler, authorize("admin") as RequestHandler, PermissionsController.deletePermission);


export default router;