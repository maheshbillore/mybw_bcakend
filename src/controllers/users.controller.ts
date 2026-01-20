import { Request, Response } from "express";
import { UsersService } from "../services/users.service.js";

export class UsersController {
    static async getUsers(req: Request, res: Response) {
        const { currentPage = 1, pageSize = 10, searchQuery } = req.query;
        const getUsers = await UsersService.getUsers(Number(currentPage), Number(pageSize), searchQuery);
        res.status(getUsers.success ? 200 : 404).json(getUsers);
    }

    static async checkEmailExists(req: Request, res: Response) {
        const email = req.params.email as string;
        const checkEmail = await UsersService.checkEmailInUsersExists(email);
        res.status(checkEmail.success ? 200 : 404).json(checkEmail);
    }

    static async checkMobileExists(req: Request, res: Response) {
        const mobile = req.params.mobile as string;
        const checkMobile = await UsersService.checkMobileInUsersExists(mobile);
        res.status(checkMobile.success ? 200 : 404).json(checkMobile);
    }

    static async storeUser(req: Request, res: Response) {
        const userData = req.body;

        if (req.file) {
            userData.picture = req.file.filename;
        }

        const storeRole = await UsersService.storeUser(userData);
        res.status(storeRole.success ? 200 : 404).json(storeRole);
    }

    static async updateUser(req: Request, res: Response) {
        const userId = req.params.userId as string;
        const userData = req.body;

        if (req.file) {
            userData.picture = req.file.filename;
        }

        const updateUser = await UsersService.updateUser(userId, userData);
        res.status(updateUser.success ? 200 : 404).json(updateUser);
    }

    static async deleteUser(req: Request, res: Response) {
        const userId = req.params.userId as string;
        const deleteUser = await UsersService.deleteUser(userId);
        res.status(deleteUser.success ? 200 : 404).json(deleteUser);
    }
}