import path from "path";
import SubCategory from "../models/sub.category.model.js";
import { ISubCategoryData } from "../shared/interface.js";
import { GenericResponse } from "../shared/type.js";
import fs from "fs";
import Service from "../models/service.model.js";
import Categorytype from "../models/categorytype.model.js";
import { createResponse } from "../utils/helper.js";
import mongoose from "mongoose";
import { toSlug } from "../utils/seo_helper.js";

export class SubCategoryService {
    static async createSubCategory(
        data: ISubCategoryData,
        files: any,
        userId: string
    ): Promise<GenericResponse<any>> {
        try {
            const newSubCategories: any[] = [];
            const duplicateSubCategories: string[] = [];

            // Normalize names to array + unique
            const inputNames = Array.isArray(data.name)
                ? [...new Set(data.name)]
                : [data.name];

            // Normalize categories + images to arrays
            const categories = Array.isArray(data.category)
                ? data.category
                : [data.category];

            const images = Array.isArray(files?.subCategoriesImages)
                ? files.subCategoriesImages
                : [files.subCategoriesImages];

            // Fetch existing subcategories
            const existing = await Categorytype.find({
                name: { $in: inputNames.map(n => new RegExp(`^${n}$`, "i")) }
            });

            const existingSet = new Set(existing.map(e => e.name.toLowerCase()));

            // Process each name
            for (let i = 0; i < inputNames.length; i++) {
                const name = inputNames[i];
                const lower = name.toLowerCase();

                if (existingSet.has(lower)) {
                    duplicateSubCategories.push(name);
                    continue;
                }

                const slug = await toSlug(name);

                newSubCategories.push({
                    name,
                    slug,
                    category: categories[i] ?? categories[0],
                    image: images[i]?.filename ?? null,
                    createdBy: userId
                });
            }

            // Insert all new subcategories in a single DB call
            if (newSubCategories.length > 0) {
                await Categorytype.insertMany(newSubCategories);
            }

            // Duplicate handling
            if (duplicateSubCategories.length > 0) {
                const createdCount = newSubCategories.length;

                return {
                    success: createdCount > 0,
                    data: createdCount > 0 ? newSubCategories : null,
                    message:
                        createdCount > 0
                            ? `${createdCount} subcategories created. Already exist: ${duplicateSubCategories.join(", ")}`
                            : `Already exist: ${duplicateSubCategories.join(", ")}`
                };
            }

            return {
                success: true,
                data: newSubCategories,
                message: "Subcategories created successfully"
            };

        } catch (error: any) {
            return {
                success: false,
                data: null,
                message: error.message || "Error creating subcategory"
            };
        }
    }


    static async updateSubCategory(
        id: string,
        data: any,
        file: any,
        userId: string
    ): Promise<GenericResponse<any>> {
        try {
            const subCategory = await Categorytype.findById(id);

            if (!subCategory) {
                return {
                    success: false,
                    data: null,
                    message: "Sub category not found",
                };
            }

            // Check if name already exists (case-insensitive, excluding same ID)
            const duplicate = await Categorytype.findOne({
                _id: { $ne: id },
                name: new RegExp(`^${data.name}$`, "i")
            });

            if (duplicate) {
                return {
                    success: false,
                    data: null,
                    message: `Sub category with name "${data.name}" already exists`,
                };
            }

            // If new file uploaded → delete old image
            if (file && subCategory.image) {
                const oldImagePath = path.join("uploads/sub-categories", subCategory.image);

                fs.access(oldImagePath, fs.constants.F_OK, (err) => {
                    if (!err) fs.unlink(oldImagePath, () => { });
                });
            }

            // Prepare fields to update
            const updateData: any = {
                name: data.name,
                slug: await toSlug(data.name),
                description: data?.description ?? subCategory.description,
                category: data?.category ?? subCategory.category,
                updatedBy: userId
            };

            if (file) updateData.image = file.filename;

            // Update the document 
            const updated = await Categorytype.findByIdAndUpdate(id, updateData, {
                new: true
            });

            return {
                success: true,
                data: updated,
                message: "Sub category updated successfully",
            };

        } catch (error: any) {
            return {
                success: false,
                data: null,
                message: error.message || "Error updating sub category",
            };
        }
    }


    static async deleteSubCategory(id: string, userId: string, userRole?: string): Promise<GenericResponse<any>> {
        try {
            const subCategory = await Categorytype.findById(id);

            if (!subCategory) {
                return {
                    success: false,
                    data: null,
                    message: "Sub category not found",
                };
            }

            const checkService = await Service.findOne({ categorytype: id });
            if (checkService) {
                return {
                    success: false,
                    data: null,
                    message: "This sub category is currently in use and cannot be deleted",
                };
            }

            if (userRole !== 'admin' && subCategory.createdBy.toString() !== userId.toString()) {
                return {
                    success: false,
                    data: null,
                    message: "Unauthorized: You can only delete your own sub categories",
                };
            }

            const deletedSubCategory = await Categorytype.findByIdAndDelete(id);

            if (deletedSubCategory?.image) {
                const oldImagePath = path.join('uploads/sub-categories/', deletedSubCategory.image);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }

            return {
                success: true,
                data: deletedSubCategory,
                message: "Sub category deleted successfully",
            };
        } catch (error: any) {
            return {
                success: false,
                data: null,
                message: error.message ? error.message : "Error deleting sub category",
            };
        }
    }

    static async getSubCategoryById(id: string): Promise<GenericResponse<any>> {
        try {
            const subCategory = await Categorytype.find({ category: id, status: "active" });
            if (!subCategory) {
                return {
                    success: false,
                    data: null,
                    message: "Sub category not found",
                };
            }
            return {
                success: true,
                data: subCategory,
                message: subCategory.length > 0 ? "Sub categories fetched successfully" : "No record found",
            };
        } catch (error: any) {
            return {
                success: false,
                data: null,
                message: error.message ? error.message : "Error fetching sub category",
            };
        }
    }

    static async updateSubCategoryStatus(id: string, status: string, userId: string): Promise<GenericResponse<any>> {
        try {
            const subCategory = await Categorytype.findByIdAndUpdate(
                id,
                { status, updatedBy: userId },
                { new: true }
            );

            if (!subCategory) {
                return {
                    success: false,
                    data: null,
                    message: "Sub category not found",
                };
            }

            return {
                success: true,
                data: subCategory,
                message: "Sub category status updated successfully",
            };
        } catch (error: any) {
            return {
                success: false,
                data: null,
                message: error.message ? error.message : "Error updating sub category status",
            };
        }
    }

    static async getSubCategoryByTypeAndCategoryId(typeOfCategory: string[], category: string[]): Promise<GenericResponse<any>> {
        try {
            if (!typeOfCategory || !category) {
                return {
                    success: false,
                    data: null,
                    message: "Type of category and category are required",
                };
            }

            if (typeOfCategory.length === 0 || category.length === 0) {
                return {
                    success: false,
                    data: null,
                    message: "Type of category and category are required",
                };
            }

            const subCategory = await Service.find({
                categorytype: { $in: typeOfCategory },
                category: { $in: category },
                status: "active"
            });

            if (subCategory.length > 0) {
                subCategory.forEach((subCategory: any) => {
                    if (subCategory.image) {
                        subCategory.image = `${process.env.BASE_URL}/uploads/sub-categories/${subCategory.image}`;
                    }
                });
            }

            return {
                success: true,
                data: subCategory,
                message: subCategory.length > 0 ? "Sub categories fetched successfully" : "No record found",
            };
        } catch (error: any) {
            return {
                success: false,
                data: { "error": error.message },
                message: error.message ? error.message : "Error fetching sub category",
            };
        }
    }

    static async getSubCategories(
        currentPage: number,
        pageSize: number,
        searchQuery?: string,
        userId?: string,
        userRole?: string
    ): Promise<GenericResponse<any>> {
        try {
            const skip = (currentPage - 1) * pageSize;
            const pipeline: any[] = [];

            pipeline.push({
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'category'
                }
            });

            pipeline.push({
                $unwind: {
                    path: '$category',
                    preserveNullAndEmptyArrays: true
                }
            });

            pipeline.push({
                $lookup: {
                    from: 'users',
                    localField: 'createdBy',
                    foreignField: '_id',
                    as: 'createdByUser'
                }
            });

            pipeline.push({
                $unwind: {
                    path: '$createdByUser',
                    preserveNullAndEmptyArrays: true
                }
            });

            pipeline.push({
                $lookup: {
                    from: 'users',
                    localField: 'updatedBy',
                    foreignField: '_id',
                    as: 'updatedByUser'
                }
            });

            pipeline.push({
                $unwind: {
                    path: '$updatedByUser',
                    preserveNullAndEmptyArrays: true
                }
            });

            if (searchQuery && searchQuery.trim() !== "") {
                pipeline.push({
                    $match: {
                        name: { $regex: searchQuery, $options: 'i' }
                    }
                });
            }

            pipeline.push({
                $sort: { createdAt: -1 }
            });

            const countPipeline = [...pipeline, { $count: 'total' }];
            const countResult = await Categorytype.aggregate(countPipeline);
            const total = countResult.length > 0 ? countResult[0].total : 0;
            const totalPages = Math.ceil(total / pageSize);

            pipeline.push(
                { $skip: skip },
                { $limit: pageSize }
            );

            pipeline.push({
                $project: {
                    name: 1,
                    description: 1,
                    image: 1,
                    status: 1,
                    category: {
                        _id: 1,
                        name: 1,
                        description: 1
                    },
                    createdBy: 1,
                    updatedBy: 1,
                    createdByUser: {
                        _id: 1,
                        name: 1,
                        email: 1
                    },
                    updatedByUser: {
                        _id: 1,
                        name: 1,
                        email: 1
                    },
                    createdAt: 1,
                    updatedAt: 1
                }
            });

            let subCategories = await Categorytype.aggregate(pipeline);

            if (subCategories.length > 0) {
                subCategories.forEach((subCategory: any) => {
                    if (subCategory.image) {
                        subCategory.image = `${process.env.BASE_URL}/uploads/sub-categories/${subCategory.image}`;
                    }
                });
            }

            const result = {
                subCategories,
                totalPages,
                currentPage,
                pageSize,
                total,
            };

            return {
                success: true,
                data: result,
                message: "Sub categories fetched successfully",
            };
        } catch (error: any) {
            return {
                success: false,
                data: null,
                message: error.message ? error.message : "Error fetching sub category",
            };
        }
    }

    static async getSubCatgoryByCategoryId(categoryId: any): Promise<GenericResponse<any>> {
        try {
            const result = await Categorytype.find({ category: categoryId, status: "active" });
            return createResponse(true, result, "Sub category fetched successfully");
        } catch (error) {
            return createResponse(false, null, "Error when fetching subcategory");
        }
    }
}