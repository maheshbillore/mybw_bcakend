import { Request, Response } from "express";  
import { PermissionsService } from "../services/permissions.service.js";

export class PermissionsController {
    static async getPermissions(req: Request, res: Response) {
        const { currentPage = 1, pageSize = 10 } = req.query;
        const getPermissions = await PermissionsService.getPermissions(Number(currentPage), Number(pageSize));
        res.status(getPermissions.success ? 200 : 404).json(getPermissions);
    }

    static async storePermission(req: Request, res: Response) {
        const storePermission = await PermissionsService.storePermission(req.body);
        res.status(storePermission.success ? 200 : 404).json(storePermission);
    }

    static async getPermissionMaxOrderNumber(req: Request, res: Response) {
        const getPermissionMaxOrderNumber = await PermissionsService.getPermissionMaxOrderNumber();
        res.status(getPermissionMaxOrderNumber.success ? 200 : 404).json(getPermissionMaxOrderNumber);
    }

    static async getPermission(req: Request, res: Response) {
        const permissionId = req.params.permissionId as string;
        const getPermission = await PermissionsService.getPermission(permissionId);
        res.status(getPermission.success ? 200 : 404).json(getPermission);
    }

    static async updatePermission(req: Request, res: Response) {
        const permissionId = req.params.permissionId as string;
        const updatePermission = await PermissionsService.updatePermission(permissionId, req.body);
        res.status(updatePermission.success ? 200 : 404).json(updatePermission);
    }

    static async deletePermission(req: Request, res: Response) {
        const permissionId = req.params.permissionId as string;
        const deletePermission = await PermissionsService.deletePermission(permissionId);
        res.status(deletePermission.success ? 200 : 404).json(deletePermission);
    }

    static async getPermissionsList(req: Request, res: Response) {
        const permissionsList = await PermissionsService.permissionsList();
        res.status(permissionsList.success ? 200 : 404).json(permissionsList);
    }

    static async getAllPermissions(req: Request, res: Response) {
        const getAllPermissions = await PermissionsService.getAllPermissions();
        res.status(getAllPermissions.success ? 200 : 404).json(getAllPermissions);
    }

    static async setPermissions(req: Request, res: Response) {
        const setPermissions = await PermissionsService.setPermissions(req.body);
        res.status(setPermissions.success ? 200 : 404).json(setPermissions);
    }

    static async getRoleHasPermissions(req: Request, res: Response) {
        const roleId = req.params.roleId as string;
        const getRoleHasPermissions = await PermissionsService.getRoleHasPermissions(roleId);
        res.status(getRoleHasPermissions.success ? 200 : 404).json(getRoleHasPermissions);
    }

    static async getRoleBasedPermissions(req: Request, res: Response) {
        const roleId = req.params.roleId as string;
        const getRoleBasedPermissions = await PermissionsService.getRoleBasedPermissions(roleId);
        res.status(getRoleBasedPermissions.success ? 200 : 404).json(getRoleBasedPermissions);
    }
}