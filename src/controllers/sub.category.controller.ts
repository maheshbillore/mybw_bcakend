import { Request, Response } from "express";
import { SubCategoryService } from "../services/sub.category.service.js";

interface AuthRequest extends Request {
    user?: any;
}

export class SubCategoryController {
    static async createSubCategory(req: AuthRequest, res: Response): Promise<void> {
        try {
            const files = req.files as {
                [fieldname: string]: Express.Multer.File[];
            };

            const userId = req.user?._id;

            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "Unauthorized: User not authenticated",
                });
                return;
            }

            const result = await SubCategoryService.createSubCategory(req.body, files, userId);
            res.status(result.success ? 200 : 404).json(result);
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || "Internal server error",
            });
        }
    }

    static async updateSubCategory(req: AuthRequest, res: Response) {
        try {
            const id = req.params.id as string;
            
            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: "Sub category id is required",
                });
            }

            const userId = req.user?._id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized: User not authenticated",
                });
            }

            const file = req?.file;
            const result = await SubCategoryService.updateSubCategory(id, req.body, file, userId);
            res.status(result.success ? 200 : 404).json(result);
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || "Internal server error",
            });
        }
    }

    static async deleteSubCategory(req: AuthRequest, res: Response) {
        try {
            const id = req.params.id as string;
            
            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: "Sub category id is required",
                });
            }

            const userRole = req.user?.role || '';
            const userId = req.user?._id;

            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "Unauthorized: User not authenticated",
                });
                return;
            }

            const result = await SubCategoryService.deleteSubCategory(id, userId, userRole);
            res.status(result.success ? 200 : 404).json(result);
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || "Internal server error",
            });
        }
    }

    static async getSubCategoryById(req: AuthRequest, res: Response) {
        try {
            const id = req.params.id as string;
            
            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: "Sub category id is required",
                });
            }

            const result = await SubCategoryService.getSubCategoryById(id);
            res.status(result.success ? 200 : 404).json(result);
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || "Internal server error",
            });
        }
    }

    static async updateSubCategoryStatus(req: AuthRequest, res: Response) {
        try {
            const id = req.params.id as string;
            const { status } = req.body;
            
            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: "Sub category id is required",
                });
            }

            const userId = req.user?._id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized: User not authenticated",
                });
            }

            const result = await SubCategoryService.updateSubCategoryStatus(id, status, userId);
            res.status(result.success ? 200 : 404).json(result);
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || "Internal server error",
            });
        }
    }

    static async getSubCategoryByTypeAndCategoryId(req: AuthRequest, res: Response) {
        try {
            const { typeOfCategory, category } = req.body;
            const result = await SubCategoryService.getSubCategoryByTypeAndCategoryId(typeOfCategory, category);
            res.status(result.success ? 200 : 404).json(result);
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || "Internal server error",
            });
        }
    }

    static async getSubCategories(req: AuthRequest, res: Response) {
        try {
            const { currentPage = 1, pageSize = 10, searchQuery } = req.query;
            const search = typeof searchQuery === 'string' ? searchQuery : undefined;

            const userId = req.user?._id;
            const userRole = req.user?.role;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized: User not authenticated",
                });
            }

            const result = await SubCategoryService.getSubCategories(
                Number(currentPage), 
                Number(pageSize), 
                search,
                userId,
                userRole
            );

            res.status(result.success ? 200 : 400).json(result);
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || "Internal server error",
            });
        }
    }

    static async getSubCatgoryByCategoryId(req: AuthRequest, res: Response) {
        try {
            const { categoryId } = req.params;
            const result = await SubCategoryService.getSubCatgoryByCategoryId(categoryId);
            res.status(result?.success ? 200 : 404).json(result);
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || "Internal server error",
            });
        }
    }
}