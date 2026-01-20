import { Request, Response } from "express";
import { CategoryService } from "../services/category.service.js";
import { Types } from "mongoose";

export class CategoryController {
    static async createCategory(req: Request, res: Response): Promise<void> {
        try {
            const categoryData = req.body;

            if (req.file) {
                categoryData.image = req.file.filename;
            }

            const userId = req.user?._id || req.user?.id;

            if (!userId) {
                res.status(401).json({
                    success: false,
                    data: null,
                    message: "User not authenticated"
                });
                return;
            }

            categoryData.createdBy = new Types.ObjectId(userId);

            const result = await CategoryService.createCategory(categoryData);
            res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            console.error('Error in createCategory:', error);
            res.status(500).json({
                success: false,
                data: null,
                message: "Internal server error"
            });
        }
    }

    static async getAllCategories(req: Request, res: Response): Promise<void> {
        try {
            const { currentPage = 1, pageSize = 10, searchQuery } = req.query;

            const result = await CategoryService.getAllCategories(
                Number(currentPage),
                Number(pageSize),
                searchQuery
            );

            res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            console.error('Error in getAllCategories:', error);
            res.status(500).json({
                success: false,
                data: null,
                message: "Internal server error"
            });
        }
    }

    static async getListOfCategories(req: Request, res: Response): Promise<void> {
        try {
            const result = await CategoryService.getListOfCategories();
            res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            console.error('Error in getListOfCategories:', error);
            res.status(500).json({
                success: false,
                data: null,
                message: "Internal server error"
            });
        }
    }

    static async updateCategory(req: Request, res: Response): Promise<void> {
        try {
            const id = req.params.id as string;
            const file = req?.file as Express.Multer.File;

            const userRole = req.user?.role || '';
            const userId = req.user?._id || req.user?.id;

            if (!userId) {
                res.status(401).json({
                    success: false,
                    data: null,
                    message: "User not authenticated"
                });
                return;
            }

            const result = await CategoryService.updateCategory(
                id,
                req.body,
                file,
                userRole,
                userId
            );

            res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            console.error('Error in updateCategory:', error);
            res.status(500).json({
                success: false,
                data: null,
                message: "Internal server error"
            });
        }
    }

    static async deleteCategory(req: Request, res: Response): Promise<void> {
        try {
            const id = req.params.id as string;

            const userRole = req.user?.role || '';
            const userId = req.user?._id || req.user?.id;

            if (!userId) {
                res.status(401).json({
                    success: false,
                    data: null,
                    message: "User not authenticated"
                });
                return;
            }

            const result = await CategoryService.deleteCategory(
                id,
                userRole,
                userId
            );

            res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            console.error('Error in deleteCategory:', error);
            res.status(500).json({
                success: false,
                data: null,
                message: "Internal server error"
            });
        }
    }

    static async bulkCreateCategories(req: Request, res: Response): Promise<void> {
        try {
            const files = req.files as {
                [fieldname: string]: Express.Multer.File[];
            };

            const userId = req.user?._id || req.user?.id;

            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "User not authenticated"
                });
                return;
            }

            const result = await CategoryService.bulkCreateCategories(
                files,
                req.body,
                userId
            );

            res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            console.error('Error in bulkCreateCategories:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : "Internal server error"
            });
        }
    }
}