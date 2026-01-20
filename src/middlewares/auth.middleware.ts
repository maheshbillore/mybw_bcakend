import jwt from "jsonwebtoken";
import User, { IUser } from "../models/user.model.js";
import { NextFunction, Request, Response } from "express";

declare global {
    namespace Express {
        interface Request {
            user?: IUser;
        }
    }
}

const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
}

export const authMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const token = req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "No authentication token, access denied",
            });
        }
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

        const user = await User.findById(decoded.id).select("-password");
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found",
            });
        }
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Token is not valid",
        });
    }
};

export const authorize =
    (...allowedRoles: ("customer" | "partner" | "admin" | "volunteer")[]) =>
        (req: Request, res: Response, next: NextFunction) => { 
            if ( 
                !allowedRoles.includes(
                    req.user?.role as "customer" | "partner" | "admin" | "volunteer"
                )
            )
                return res.status(403).json({ message: "Forbidden" });
            next();
        };
