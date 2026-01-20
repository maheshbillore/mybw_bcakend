import { Request, Response } from "express";
import AuthService from "../services/auth.service.js";
import User from "../models/user.model.js";

export class AuthController {
    static async adminRegister(req: Request, res: Response) {
        const { name, email, password } = req.body;
        const result = await AuthService.registerAdmin(name, email, password);
        res.status(result.success ? 201 : 400).json(result);
    }

    static async login(req: Request, res: Response) {
        if (!req.body || !req.body.email || !req.body.password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }
        const { email, password } = req.body;

        const result = await AuthService.login(email, password);
        res.status(result.success ? 200 : 401).json(result);
    }

    static async register(req: Request, res: Response) {
        const { name, email, password, role, phone, dob, roleId, ...extraData } = req.body;
        const picture = req.file?.filename || "";
        const result = await AuthService.register(
            name,
            email,
            password,
            phone,
            picture,
            dob,
            roleId,
            extraData
        );
        res.status(result.success ? 201 : 404).json(result);
    }

    static async resetPassword(req: Request, res: Response) {
        if (!req.body || !req.body.email || !req.body.newPassword) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }
        const { email, newPassword } = req.body;
        const result = await AuthService.resetPassword(email, newPassword);
        res.status(result.success ? 201 : 404).json(result);
    }

    static async registerPartner(req: Request, res: Response) {
        const { name, email, password, phone, dob, ...extraData } = req.body;
        const files = req.files as {
            [fieldname: string]: Express.Multer.File[];
        };
        const picture = files?.picture?.[0]?.filename || "";

        const result = await AuthService.registerPartner(
            name,
            email,
            password,
            phone,
            picture,
            new Date(dob),
            extraData,
            files
        );
        res.status(result.success ? 201 : 400).json(result);
    }
}
