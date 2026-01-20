import { Request, Response } from "express";  
import { RolesService } from "../services/roles.service.js";

export class RolesController {
    static async getRoles(req: Request, res: Response) {
        const { currentPage = 1, pageSize = 10 } = req.query;
        const getRoles = await RolesService.getRoles(Number(currentPage), Number(pageSize));
        res.status(getRoles.success ? 200 : 404).json(getRoles);
    }

    static async listOfRoles(req: Request, res: Response) {
        const listOfRoles = await RolesService.listOfRoles();
        res.status(listOfRoles.success ? 200 : 404).json(listOfRoles);
    }

    static async rolesList(req: Request, res: Response) {
        const rolesList = await RolesService.rolesList();
        res.status(rolesList.success ? 200 : 404).json(rolesList);
    }

    static async storeRole(req: Request, res: Response) {
        const storeRole = await RolesService.storeRole(req.body);
        res.status(storeRole.success ? 200 : 404).json(storeRole);
    }

    static async getRole(req: Request, res: Response) {
        const roleId = req.params.roleId as string;
        const getRole = await RolesService.getRole(roleId);
        res.status(getRole.success ? 200 : 404).json(getRole);
    }

    static async updateRole(req: Request, res: Response) {
        const roleId = req.params.roleId as string;
        const updateRole = await RolesService.updateRole(roleId, req.body);
        res.status(updateRole.success ? 200 : 404).json(updateRole);
    }

    static async deleteRole(req: Request, res: Response) {
        const roleId = req.params.roleId as string;
        const deleteRole = await RolesService.deleteRole(roleId);
        res.status(deleteRole.success ? 200 : 404).json(deleteRole);
    }
}