import Categorytype from "../models/categorytype.model.js";
import Service from "../models/service.model.js";
import Category from "../models/category.model.js";
import SubCategory from "../models/sub.category.model.js";
import { IServiceData } from "../shared/interface.js";
import { GenericResponse } from "../shared/type.js";
import { createResponse } from "../utils/helper.js";
import Job from "../models/job.model.js";
import mongoose, { Types } from "mongoose";
import _ from "lodash";
import logger from "../utils/logger.js";
import { generateMetaDescription, generateMetaKeywords, generateMetaTitle, toSlug } from "../utils/seo_helper.js";

export class Services {
    static async getAllServices(
        currentPage: number,
        pageSize: number,
        userId: string,
        userRole: string,
        searchTerm: string = ""
    ): Promise<GenericResponse<any>> {
        try {
            const skip = (currentPage - 1) * pageSize;
            const filter: any = {};

            if (searchTerm.trim()) {
                filter.$or = [
                    { name: { $regex: searchTerm, $options: "i" } },
                    { customServiceName: { $regex: searchTerm, $options: "i" } },
                    { description: { $regex: searchTerm, $options: "i" } },
                    { metaTitle: { $regex: searchTerm, $options: "i" } },
                    { metaDescripton: { $regex: searchTerm, $options: "i" } },
                    { metaKeyword: { $regex: searchTerm, $options: "i" } },
                    { "category.name": { $regex: searchTerm, $options: "i" } },
                    { "category.description": { $regex: searchTerm, $options: "i" } },
                    { "categorytype.name": { $regex: searchTerm, $options: "i" } },
                    { "categorytype.description": { $regex: searchTerm, $options: "i" } },
                ];
            }

            const [services, totalItems] = await Promise.all([
                Service.find(filter)
                    .populate("category")
                    .populate("categorytype")
                    .populate("createdBy", "name")
                    .populate("updatedBy", "name")
                    .skip(skip)
                    .limit(pageSize)
                    .sort({ createdAt: -1 }),
                Service.countDocuments(filter),
            ]);

            if (services.length > 0) {
                services.forEach((service: any) => {
                    if (service.image) {
                        service.image = `${process.env.BASE_URL}/uploads/servicesImage/${service.image}`;
                    }
                });
            }

            const totalPages = Math.ceil(totalItems / pageSize);
            return {
                success: true,
                data: {
                    services,
                    pagination: {
                        currentPage,
                        pageSize,
                        totalPages,
                        totalItems,
                    },
                },
                message: "All services fetched successfully",
            };
        } catch (error) {
            console.error(error);
            return {
                success: false,
                data: null,
                message: "Error fetching services"
            };
        }
    }

    static async getServicesByCategory(categoryId: string) {
        try {
            const categoryIds = Array.isArray(categoryId)
                ? categoryId.map((id) => new mongoose.Types.ObjectId(id))
                : [new mongoose.Types.ObjectId(categoryId)];

            const services = await Service.aggregate([
                {
                    $match: {
                        category: { $in: categoryIds },
                    },
                },
                {
                    $lookup: {
                        from: "categories",
                        localField: "category",
                        foreignField: "_id",
                        as: "category"
                    }
                },
                {
                    $unwind: "$category"
                },
                {
                    $lookup: {
                        from: "categorytypes",
                        localField: "categorytype",
                        foreignField: "_id",
                        as: "categorytype"
                    }
                },
                {
                    $unwind: "$categorytype"
                },
                {
                    $group: {
                        _id: {
                            categoryId: "$category._id",
                            categoryName: "$category.name",
                            categoryTypeId: "$categorytype._id",
                            categoryTypeName: "$categorytype.name",
                            image: "$category.image",
                        },
                        services: {
                            $push: {
                                _id: "$_id",
                                name: "$name",
                                description: "$description",
                                isCertificate: "$isCertificate"
                                // other service fields you need
                            }
                        }
                    }
                },
                {
                    $group: {
                        _id: {
                            categoryId: "$_id.categoryId",
                            categoryName: "$_id.categoryName",
                            image: "$_id.image",
                        },
                        categorytypes: {
                            $push: {
                                categoryTypeId: "$_id.categoryTypeId",
                                categoryTypeName: "$_id.categoryTypeName",
                                services: "$services"
                            }
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        categoryId: "$_id.categoryId",
                        categoryName: "$_id.categoryName",
                        image: "$_id.image",
                        categorytypes: 1
                    }
                }
            ]);

            services.map((category: any) => {
                category.image = category.image
                    ? `${process.env.BASE_URL}/uploads/categories/${category.image}`
                    : null;
                category.categorytypes.map(async (type: any) => {
                    type.categoryTypeName = _.capitalize(type?.categoryTypeName);
                })
            })
            return {
                success: true,
                data: {
                    services: services,
                },
                message: "Services fetched successfully",
            };
        } catch (error: any) {
            logger.error(`${error?.message} Error when get services by category`);
            return {
                success: false,
                data: null,
                message:
                    error?.message ||
                    "Error during getting services by category",
            };
        }
    }

    static async createNewService(
        data: IServiceData,
        filename: any,
        userId: string,
        userRole: string
    ): Promise<GenericResponse<any>> {
        try {
            if (!data.category) {
                return {
                    success: false,
                    data: null,
                    message: "Category is required",
                };
            }

            if (!Array.isArray(data.pricingTiers) || data.pricingTiers.length === 0) {
                return {
                    success: false,
                    data: null,
                    message: "At least one pricing tier is required",
                };
            }

            for (const tier of data.pricingTiers) {
                if (!["Basic", "Standard", "Premium"].includes(tier.name) || typeof tier.price !== "number") {
                    return {
                        success: false,
                        data: null,
                        message: "Each pricing tier must have a valid name and numeric price",
                    };
                }
            }

            if (typeof data.partnerCommissionRate !== "number" || data.partnerCommissionRate < 0) {
                return {
                    success: false,
                    data: null,
                    message: "Partner commission rate must be a non-negative number",
                };
            }

            if (data.surgePricing?.enabled) {
                if (typeof data.surgePricing.surgeMultiplier !== "number" || !Array.isArray(data.surgePricing.surgeHours)) {
                    return {
                        success: false,
                        data: null,
                        message: "Invalid surge pricing configuration",
                    };
                }
            }

            const categoryDoc = await Category.findById(data.category);
            if (!categoryDoc) {
                return {
                    success: false,
                    data: null,
                    message: "Invalid category",
                };
            }

            const serviceName = data?.customServiceName.trim().toLowerCase();
            const categoryName = categoryDoc.name.trim().toLowerCase();

            if (serviceName === categoryName) {
                return {
                    success: false,
                    data: null,
                    message: "Service name cannot be the same as category name",
                };
            }

            const duplicateService = await Service.findOne({
                name: data?.customServiceName.trim(),
                categorytype: data.categoryType,
                category: data.category
            });

            if (duplicateService) {
                return {
                    success: false,
                    data: null,
                    message: "Service with this name already exists in the selected category and subcategory",
                };
            }

            let subcategoryId: object = {};

            if (data?.isCustomSubCategories == true) {
                const checkSubCategory = await Categorytype.findOne({ name: data.subCategory });
                if (checkSubCategory) {
                    return {
                        success: false,
                        data: null,
                        message: "Duplicate sub category - please use a different name"
                    };
                }
                const newSubcategory = await Categorytype.create({ name: data?.subCategory });
                if (newSubcategory) {
                    subcategoryId = newSubcategory?._id;
                }
            }

            let slug = await toSlug(data?.customServiceName);
            let metaTitle = await generateMetaTitle(data?.customServiceName);
            let metaDescripton = await generateMetaDescription(data?.customServiceName);
            let metaKeyword = await generateMetaKeywords(data?.customServiceName);

            const response = await Service.create({
                name: data?.customServiceName.trim(),
                slug,
                metaTitle,
                metaDescripton,
                metaKeyword,
                customServiceName: data?.customServiceName.trim(),
                category: data?.category,
                categorytype: data?.isCustomSubCategories ? subcategoryId : data?.categoryType,
                description: data?.description,
                partnerCommissionRate: data?.partnerCommissionRate,
                pricingTiers: data?.pricingTiers,
                surgePricing: data?.surgePricing,
                image: filename,
                isCertificate: data?.isCertificate,
                createdBy: userId,
                updatedBy: userId
            });

            const populatedResponse = await Service.findById(response._id)
                .populate("category")
                .populate("categorytype")
                .populate("createdBy", "name")
                .populate("updatedBy", "name");

            if (populatedResponse && populatedResponse.image) {
                const serviceObject = populatedResponse.toObject();
                serviceObject.image = `${process.env.BASE_URL}/uploads/servicesImage/${populatedResponse.image}`;
                return {
                    success: true,
                    data: serviceObject,
                    message: "Service created successfully",
                };
            }

            return {
                success: true,
                data: populatedResponse,
                message: "Service created successfully",
            };
        } catch (error: any) {
            return {
                success: false,
                data: null,
                message: error?.message || "Something went wrong. Please try again.",
            };
        }
    }

    static async updateExistingService(
        id: string,
        data: IServiceData,
        file: any,
        userId: string,
        userRole: string
    ): Promise<GenericResponse<any>> {
        try {
            const existingService = await Service.findById(id);
            if (!existingService) {
                return {
                    success: false,
                    data: null,
                    message: "Service does not exist",
                };
            }

            const checkJob = await Job.findOne({ serviceId: id });
            if (checkJob) {
                return createResponse(false, null, "This service is currently in use in jobs and cannot be updated");
            }

            const categoryDoc = await Category.findById(data.category);
            if (!categoryDoc) {
                return {
                    success: false,
                    data: null,
                    message: "Invalid category",
                };
            }

            const serviceName = data?.customServiceName.trim().toLowerCase();
            const existingCategory = await Category.findOne({
                name: { $regex: new RegExp(`^${serviceName}$`, 'i') }
            });

            if (existingCategory) {
                return {
                    success: false,
                    data: null,
                    message: "Service name cannot be the same as category name",
                };
            }

            const duplicateService = await Service.findOne({
                name: data?.customServiceName.trim(),
                categorytype: data.categoryType,
                category: data.category,
                _id: { $ne: id }
            });

            if (duplicateService) {
                return {
                    success: false,
                    data: null,
                    message: "A service with this name already exists in the selected category and subcategory",
                };
            }

            
            let metaTitle = await generateMetaTitle(data?.customServiceName);
            let metaDescripton = await generateMetaDescription(data?.customServiceName);
            let metaKeyword = await generateMetaKeywords(data?.customServiceName);

            let slug = await toSlug(data.customServiceName.trim());
            const updateData: any = {
                name: data.customServiceName.trim(),
                slug,
                metaTitle,
                metaDescripton,
                metaKeyword,
                description: data.description,
                category: data.category,
                categorytype: data.categoryType,
                isCertificate: data.isCertificate,
                pricingTiers: data.pricingTiers,
                partnerCommissionRate: data.partnerCommissionRate,
                surgePricing: data.surgePricing,
                updatedBy: new Types.ObjectId(userId),
                updatedAt: new Date()
            };

            if (file) {
                updateData.image = file.filename;
            }

            const updated = await Service.findByIdAndUpdate(
                id,
                { $set: updateData },
                { new: true, runValidators: true }
            )
                .populate("category")
                .populate("categorytype")
                .populate("createdBy", "name")
                .populate("updatedBy", "name");

            if (!updated) {
                return {
                    success: false,
                    data: null,
                    message: "Failed to update service",
                };
            }

            const updatedObject = updated.toObject();
            if (updated.image) {
                updatedObject.image = `${process.env.BASE_URL}/uploads/servicesImage/${updated.image}`;
            }

            return {
                success: true,
                data: updatedObject,
                message: "Service updated successfully",
            };
        } catch (error: unknown) {
            const err = error as any;
            console.error("Error updating service:", err);

            return {
                success: false,
                data: null,
                message: err?.response?.data?.message || err?.message || "Unknown error",
            };
        }
    }

    static async deleteService(
        id: string,
        userId: string,
        userRole: string
    ): Promise<GenericResponse<any>> {
        try {
            const service = await Service.findById(id);

            if (!service) {
                return {
                    success: false,
                    data: null,
                    message: "Service not found",
                };
            }

            const checkJob = await Job.findOne({ serviceId: id });
            if (checkJob) {
                return createResponse(false, null, "This service is currently in use and cannot be deleted");
            }

            if (userRole !== "admin" && service.createdBy?.toString() !== userId.toString()) {
                return {
                    success: false,
                    data: null,
                    message: "You do not have permission to delete this service",
                };
            }

            const response = await Service.findOneAndDelete({ _id: id });
            if (!response) {
                return {
                    success: false,
                    data: null,
                    message: "Service not found",
                };
            }

            return {
                success: true,
                data: response,
                message: "Service deleted successfully",
            };
        } catch (error) {
            console.error(error);
            return {
                success: false,
                data: null,
                message: "Error deleting service"
            };
        }
    }
}