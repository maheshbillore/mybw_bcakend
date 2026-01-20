import Category from "../models/category.model.js";
import Categorytype from "../models/categorytype.model.js";
import { GenericResponse } from "../shared/type.js";
import { ICategoryData } from "../shared/interface.js";
import { createResponse } from "../utils/helper.js";
import { Types } from "mongoose";
import fs from "fs";
import path from "path";
import { toSlug } from "../utils/seo_helper.js";

export class CategoryService {
    static async createCategory(data: ICategoryData): Promise<GenericResponse<any>> {
        try {
            let slug = await toSlug(data.name);
            const existing = await Category.findOne({
                name: { $regex: new RegExp(`^${data.name}$`, 'i') },
                slug
            });

            if (existing) {
                return createResponse(
                    false,
                    null,
                    "Category with this name already exists"
                );
            }

            const category = await Category.create(data);
            await category.populate('createdBy', 'name');

            const responseData = {
                ...category.toObject(),
                createdBy: (category as any).createdBy?.name || null,
                updatedBy: null
            };

            return createResponse(
                true,
                responseData,
                "Category created successfully"
            );
        } catch (err) {
            console.error('Error creating category:', err);
            return createResponse(
                false,
                null,
                err instanceof Error ? err.message : "Error creating category"
            );
        }
    }

    static async getAllCategories(
        currentPage: number,
        pageSize: number,
        searchQuery: any
    ): Promise<GenericResponse<any>> {
        try {
            const skip = (currentPage - 1) * pageSize;

            let searchFilter: any = {};
            if (searchQuery?.trim()) {
                searchFilter = {
                    $or: [
                        { name: { $regex: searchQuery.trim(), $options: 'i' } },
                        { description: { $regex: searchQuery.trim(), $options: 'i' } }
                    ]
                };
            }

            const [categories, totalItems] = await Promise.all([
                Category.find(searchFilter)
                    .select("_id name image description status createdBy updatedBy createdAt updatedAt")
                    .skip(skip)
                    .limit(pageSize)
                    .sort({ createdAt: -1 })
                    .lean(),
                Category.countDocuments(searchFilter)
            ]);

            const categoriesWithDetails = await Category.populate(categories, [
                { path: 'createdBy', select: 'name' },
                { path: 'updatedBy', select: 'name' }
            ]);

            const categoriesWithImages = categoriesWithDetails.map((category: any) => ({
                ...category,
                image: category.image
                    ? `${process.env.BASE_URL}/uploads/categories/${category.image}`
                    : null,
                createdBy: category.createdBy?.name || null,
                updatedBy: category.updatedBy?.name || null
            }));

            const totalPages = Math.ceil(totalItems / pageSize);

            return createResponse(
                true,
                {
                    categories: categoriesWithImages,
                    pagination: {
                        currentPage,
                        pageSize,
                        totalItems,
                        totalPages
                    }
                },
                "Categories fetched successfully"
            );
        } catch (err) {
            console.error('Error fetching categories:', err);
            return createResponse(
                false,
                null,
                err instanceof Error ? err.message : "Error fetching categories"
            );
        }
    }

    static async getListOfCategories(): Promise<GenericResponse<any>> {
        try {
            const categories = await Category.find()
                .select("_id name")
                .sort({ createdAt: -1 })
                .lean();

            return createResponse(
                true,
                categories,
                "Categories list fetched successfully"
            );
        } catch (err) {
            console.error('Error fetching categories list:', err);
            return createResponse(
                false,
                null,
                err instanceof Error ? err.message : "Error fetching categories list"
            );
        }
    }

    static async updateCategory(
        id: string,
        data: ICategoryData,
        file: Express.Multer.File | null,
        userRole: string,
        userId: string
    ): Promise<GenericResponse<any>> {
        try {
            const category = await Category.findById(id);
            if (!category) {
                return createResponse(false, null, "Category not found");
            }
 
            if (data.name) {
                const duplicate = await Category.findOne({
                    _id: { $ne: id },
                    name: new RegExp(`^${data.name}$`, "i")
                });

                if (duplicate) {
                    return createResponse(
                        false,
                        null,
                        `Category with name "${data.name}" already exists`
                    );
                }
            }
 
            const updateData: any = {
                ...data,
                updatedBy: userId,
            };
            
 
            if (data.name) {
                updateData.slug = await toSlug(data.name);
            }
 
            if (file) {
                const oldImagePath = path.join(
                    "uploads/categories/",
                    category.image || ""
                );
 
                if (category.image) {
                    fs.access(oldImagePath, fs.constants.F_OK, err => {
                        if (!err) fs.unlink(oldImagePath, () => { });
                    });
                }

                updateData.image = file.filename;
            }

           
            const updatedCategory = await Category.findByIdAndUpdate(id, updateData, {
                new: true
            })
                .populate("createdBy", "name")
                .populate("updatedBy", "name");

            if (!updatedCategory) {
                return createResponse(false, null, "Failed to update category");
            }
 
            const responseData = {
                ...updatedCategory.toObject(),
                image: updatedCategory.image
                    ? `${process.env.BASE_URL}/uploads/categories/${updatedCategory.image}`
                    : null,
                createdBy: (updatedCategory as any)?.createdBy?.name || null,
                // updatedBy: (updatedCategory as any)?.updatedBy?.name || null
            };

            return createResponse(true, responseData, "Category updated successfully");
        } catch (error: any) {
            console.error("Error updating category:", error);
            return createResponse(false, null, error.message ?? "Error updating category");
        }
    }


    static async deleteCategory(
        id: string,
        userRole: string,
        userId: string
    ): Promise<GenericResponse<any>> {
        try {
            const category = await Category.findById(id);

            if (!category) {
                return createResponse(false, null, "Category not found");
            }

            const isUsedInSubcategory = await Categorytype.findOne({ category: id });

            if (isUsedInSubcategory) {
                return createResponse(
                    false,
                    null,
                    "This category is currently in use and cannot be deleted"
                );
            }

            if (userRole === 'admin') {
                const imageToDelete = category.image;
                const result = await Category.findByIdAndDelete(id);

                if (imageToDelete) {
                    const imagePath = path.join('uploads/categories/', imageToDelete);
                    if (fs.existsSync(imagePath)) {
                        fs.unlinkSync(imagePath);
                    }
                }

                return createResponse(
                    true,
                    result,
                    "Category deleted successfully"
                );
            }

            if (category.createdBy?.toString() !== userId.toString()) {
                return createResponse(
                    false,
                    null,
                    "You don't have permission to delete this category"
                );
            }

            const imageToDelete = category.image;
            const result = await Category.findByIdAndDelete(id);

            if (imageToDelete) {
                const imagePath = path.join('uploads/categories/', imageToDelete);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }

            return createResponse(
                true,
                result,
                "Category deleted successfully"
            );
        } catch (err) {
            console.error('Error deleting category:', err);
            return createResponse(
                false,
                null,
                err instanceof Error ? err.message : "Error deleting category"
            );
        }
    }

    static async bulkCreateCategories(
        files: { [fieldname: string]: Express.Multer.File[] },
        req: any,
        userId: string
    ): Promise<GenericResponse<any>> {
        try {
            const { categoriesName, description } = req;

            const categoriesNameList = Array.isArray(categoriesName)
                ? categoriesName
                : [categoriesName];
            const descriptionList = Array.isArray(description)
                ? description
                : [description];

            const duplicateCategories: string[] = [];
            const newCategories: any[] = [];

            for (let i = 0; i < categoriesNameList.length; i++) {
                const categoryName = categoriesNameList[i];
                const categoryDesc = descriptionList[i] || "";
                const imageFile = files.categoriesImages?.[i]?.filename || "";

                const existing = await Category.findOne({
                    name: { $regex: new RegExp(`^${categoryName}$`, 'i') }
                });

                if (existing) {
                    duplicateCategories.push(categoryName);
                } else {
                    let slug = await toSlug(categoryName);
                    newCategories.push({
                        name: categoryName,
                        image: imageFile,
                        slug,
                        description: categoryDesc,
                        createdBy: new Types.ObjectId(userId),
                        updatedBy: null
                    });
                }
            }

            if (newCategories.length > 0) {
                await Category.insertMany(newCategories);
            }

            if (duplicateCategories.length > 0) {
                const message = newCategories.length > 0
                    ? `Categories already exist: ${duplicateCategories.join(", ")}. Remaining categories have been added successfully.`
                    : `All categories already exist: ${duplicateCategories.join(", ")}`;

                return createResponse(
                    newCategories.length > 0,
                    null,
                    message
                );
            }

            return createResponse(
                true,
                null,
                "All categories created successfully"
            );
        } catch (error) {
            console.error('Error creating categories:', error);
            return createResponse(
                false,
                null,
                error instanceof Error ? error.message : "Error creating categories"
            );
        }
    }
}