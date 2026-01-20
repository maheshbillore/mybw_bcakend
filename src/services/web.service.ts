import mongoose from "mongoose";
import Category from "../models/category.model.js";
import { GenericResponse, GenericResponseCode } from "../shared/type.js";
import { createResponseStatus, serviceRatingDetails, serviceWisePartnerCount, serviceWiseRatingDetails } from "../utils/helper.js";
import logger from "../utils/logger.js";
import Service from "../models/service.model.js";
import _, { update } from "lodash";
import Categorytype from "../models/categorytype.model.js";
import { increaseServiceBooking, increaseServicePartnerAvl, updateAllCategoriesSEO, updateAllServicesSEO, updateAllSubCategoriesSEO } from "../utils/seo_helper.js";
import { getServiceBookings, getSocialLink, serviceTotalpartner } from "../utils/comman.js";

export class WebService {
    static async getCategory(): Promise<GenericResponseCode<any>> {
        try {
            const categories = await Category.find({ status: "active" });
            // await updateAllCategoriesSEO();
            if (categories.length === 0) {
                return {
                    status: 200,
                    data: null,
                    message: "No services found",
                };
            }

            categories.forEach((category: any) => {
                category.image = category.image
                    ? `${process.env.BASE_URL}/uploads/categories/${category.image}`
                    : null;
            });

            if (categories) {
                return {
                    status: 200,
                    data: {
                        result: categories,
                    },
                    message: "Categories fetched successfully",
                };
            }

            return {
                status: 500,
                data: {
                    result: [],
                },
                message: "No Categories found",
            };
        } catch (error: any) {
            logger.error(`${error?.message} Error when get Categories`);
            return {
                status: 500,
                data: null,
                message: error?.message || "Error during getting Categories",
            };
        }
    }

    static async getSubCategory(category: any): Promise<GenericResponse<any>> {
        try {
            // await updateAllSubCategoriesSEO();
            const result = await Category.aggregate([
                {
                    $match: { slug: category }
                },
                {
                    $lookup: {
                        from: "categorytypes",
                        localField: "_id",
                        foreignField: "category",
                        as: "subcategories"
                    }
                },
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        description: 1,
                        slug: 1,
                        image: 1,
                        subcategories: {
                            $map: {
                                input: "$subcategories",
                                as: "sub",
                                in: {
                                    _id: "$$sub._id",
                                    name: "$$sub.name",
                                    image: "$$sub.image",
                                    description: "$$sub.description",
                                    slug: "$$sub.slug",
                                    status: "$$sub.status"
                                }
                            }
                        }
                    }
                }
            ]);

            const filterResult = result?.map((category: any) => {
                return {
                    ...category,
                    image: category.image
                        ? `${process.env.BASE_URL}/uploads/categories/${category.image}`
                        : null,

                    subcategories: category.subcategories?.map((subcategory: any) => {
                        return {
                            ...subcategory,
                            image: subcategory.image
                                ? `${process.env.BASE_URL}/uploads/sub-categories/${subcategory.image}`
                                : null
                        };
                    })
                };
            });


            return {
                success: true,
                data: {
                    result: filterResult.length > 0 ? filterResult[0] : [],
                },
                message: "Sub categories fetched successfully",
            };
        } catch (error: any) {
            logger.error(`${error?.message} Error when get sub category`);
            return {
                success: false,
                data: null,
                message:
                    error?.message ||
                    "Error during getting sub category",
            };
        }
    }


    static async getServices(subcategory: any): Promise<GenericResponse<any>> {
        try {
            //  await updateAllServicesSEO();
            const result = await Categorytype.aggregate([
                {
                    $match: { slug: subcategory }
                },
                {
                    $lookup: {
                        from: "services",
                        localField: "_id",
                        foreignField: "categorytype",
                        as: "services"
                    }
                },
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        image: 1,
                        description: 1,
                        slug: 1,
                        services: {
                            $map: {
                                input: "$services",
                                as: "sub",
                                in: {
                                    _id: "$$sub._id",
                                    name: "$$sub.name",
                                    image: "$$sub.image",
                                    pricingTiers: "$$sub.pricingTiers",
                                    description: "$$sub.description",
                                    slug: "$$sub.slug",
                                    status: "$$sub.status",
                                }
                            }
                        }
                    }
                }
            ]);


            //   const partnerServiceCount = await serviceWisePartnerCount(serviceIds, customerId);
            let serviceIds: any[] = await result[0]?.services?.map((service: any) => service?._id.toString());
            const serviceRatings = await serviceWiseRatingDetails(serviceIds)

            let bookingCount = await getServiceBookings(serviceIds);
            let totalWorkers = await serviceTotalpartner(serviceIds);
            const increaseService = await increaseServicePartnerAvl();
            const increaseServiceBook = await increaseServiceBooking();

            const filterResult = result?.map((subcategory: any) => {
                return {
                    ...subcategory,
                    image: subcategory.image
                        ? `${process.env.BASE_URL}/uploads/sub-categories/${subcategory.image}`
                        : null,

                    services: subcategory.services?.map((subcategory: any) => {
                        let price = subcategory?.pricingTiers?.[0].price;
                        let totalRating = serviceRatings[subcategory?._id] ? serviceRatings[subcategory?._id]?.totalRatings : 0;
                        let averageRating = serviceRatings[subcategory?._id] ? serviceRatings[subcategory?._id]?.averageRating : 0;
                        let totalBooked = bookingCount[subcategory?._id] ? bookingCount[subcategory?._id] : 0;
                        let avlWorker = totalWorkers[subcategory?._id] ? totalWorkers[subcategory?._id]?.totalPartners : 0;
                        delete subcategory?.pricingTiers;
                        return {
                            ...subcategory,
                            price, 
                            avlWorker: (avlWorker + increaseService),
                            totalBooked: (totalBooked + increaseServiceBook),
                            totalRating,
                            averageRating,
                            image: subcategory.image
                                ? `${process.env.BASE_URL}/uploads/servicesImage/${subcategory.image}`
                                : null
                        };
                    })
                };
            });


            return {
                success: true,
                data: {
                    result: filterResult.length > 0 ? filterResult[0] : [],
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

    static async getServiceDetails(service: any): Promise<GenericResponseCode<any>> {
        try {
            const result = await Service.aggregate([
                {
                    $lookup: {
                        from: "services",
                        localField: "category",
                        foreignField: "category",
                        as: "related_services"
                    }
                },
                { $match: { slug: service } },
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        description: 1,
                        pricingTiers: 1,
                        slug: 1,
                        status: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        image: 1,
                        "related_services._id": 1,
                        "related_services.name": 1,
                        "related_services.description": 1,
                        "related_services.pricingTiers": 1,
                        "related_services.status": 1,
                        "related_services.createdAt": 1,
                        "related_services.updatedAt": 1,
                        "related_services.slug": 1,
                        "related_services.image": 1
                    }
                }
            ])

            let serviceIds: any[] = [];
            if (result.length > 0) {
                serviceIds = await result[0]?.related_services.map((service: any) => service?._id.toString());
                serviceIds.push(result[0]?.service?._id.toString());
            }
            const serviceRatings = await serviceWiseRatingDetails(serviceIds)


            let bookingCount = await getServiceBookings(serviceIds);
            let totalWorkers = await serviceTotalpartner(serviceIds);


            const socialLinks = await getSocialLink(service);

            const serviceRatingDetail = await serviceRatingDetails(result[0]?._id, null);
            const increaseService = await increaseServicePartnerAvl();
            const increaseServiceBook = await increaseServiceBooking();
            const filterResult = result?.map((service: any) => {
                let price = service?.pricingTiers?.[0].price;
                let totalRating = serviceRatingDetail ? serviceRatingDetail?.review : 0;
                let averageRating = serviceRatingDetail ? serviceRatingDetail?.averageRating : 0;
                let reviewList = serviceRatingDetail ? serviceRatingDetail?.reviewList : [];
                let totalBooked = bookingCount[service?._id] ? bookingCount[service?._id] : 0;
                let avlWorker = totalWorkers[service?._id] ? totalWorkers[service?._id]?.totalPartners : 0;
                delete service?.pricingTiers;

                return {
                    ...service,
                    socialLinks,
                    totalRating,
                    reviewList,
                    avlWorker: (avlWorker + increaseService),
                    totalBooked: (totalBooked + increaseServiceBook),
                    averageRating,
                    price,
                    image: service.image
                        ? `${process.env.BASE_URL}/uploads/servicesImage/${service.image}`
                        : null,

                    related_services: service.related_services?.map((subcategory: any) => {
                        let price = subcategory?.pricingTiers?.[0].price;
                        delete subcategory?.pricingTiers;

                        let totalRating = serviceRatings[subcategory?._id] ? serviceRatings[subcategory?._id]?.totalRatings : 0;
                        let averageRating = serviceRatings[subcategory?._id] ? serviceRatings[subcategory?._id]?.averageRating : 0;

                        let totalBooked = bookingCount[subcategory?._id] ? bookingCount[subcategory?._id] : 0;
                        let avlWorker = totalWorkers[subcategory?._id] ? totalWorkers[subcategory?._id]?.totalPartners : 0;

                        return {
                            ...subcategory,
                            price,
                            totalRating,
                            avlWorker: (avlWorker + increaseService),
                            totalBooked: (totalBooked + increaseServiceBook),
                            averageRating,
                            image: subcategory.image
                                ? `${process.env.BASE_URL}/uploads/servicesImage/${subcategory.image}`
                                : null
                        };
                    })
                };
            })
            return createResponseStatus(200,
                { result: filterResult.length > 0 ? filterResult[0] : [] },
                "fetch service details successfully")
        } catch (error: any) {
            logger.error(`${error?.message} Error when get service details`);
            return createResponseStatus(500, null, error?.message || "Error when get service details");
        }
    }

    static async search(payload: any): Promise<GenericResponseCode<any>> {
        try {
            const { text } = payload;
            const regex = new RegExp(text, "i"); // case-insensitive regex 
            const result = await Service.aggregate([
                // Join CategoryTypes
                {
                    $lookup: {
                        from: "categorytypes",
                        localField: "categorytype",
                        foreignField: "_id",
                        as: "categorytypeData"
                    }
                },
                { $unwind: { path: "$categorytypeData", preserveNullAndEmptyArrays: true } },

                // Join Categories
                {
                    $lookup: {
                        from: "categories",
                        localField: "category",
                        foreignField: "_id",
                        as: "categoryData"
                    }
                },
                { $unwind: { path: "$categoryData", preserveNullAndEmptyArrays: true } },

                // SEARCH condition
                {
                    $match: {
                        $or: [
                            // Services fields
                            { name: regex },
                            { description: regex },
                            { metaTitle: regex },
                            { metaDescription: regex },
                            { metaKeyword: regex },
                            { "categoryData.name": regex },
                            { "categoryData.description": regex },
                            { "categorytypeData.name": regex },
                            { "categorytypeData.description": regex },
                        ]
                    }
                },
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        description: 1,
                        metaTitle: 1,
                        metaDescription: 1,
                        metaKeyword: 1,
                        image: 1,
                        slug: 1,
                        "categoryData.name": 1,
                        "categoryData.description": 1,
                        "categoryData.image": 1,
                        "categoryData.slug": 1,
                        "categorytypeData.name": 1,
                        "categorytypeData.description": 1,
                        "categorytypeData.image": 1,
                        "categorytypeData.slug": 1,
                    }
                }
            ]);

            let filterResults = result.map((element: any) => {
                let filterData: any = { image: null, slug: null, name: null, description: null }
                if (!element?.categoryData) { element.categoryData = filterData; }
                if (!element?.categorytypeData) { element.categorytypeData = filterData; }

                element.image = element.image ? `${process.env.BASE_URL}/uploads/servicesImage/${element.image}` : null;
                element.categorytypeData.image = element?.categorytypeData?.image ? `${process.env.BASE_URL}/uploads/sub-categories/${element?.categorytypeData?.image}` : null;
                element.categoryData.image = element?.categoryData?.image ? `${process.env.BASE_URL}/uploads/categories/${element?.categoryData?.image}` : null;

                element.categorytypeData.slug = element?.categorytypeData?.slug ? `services/${element?.categoryData?.slug}/${element?.categorytypeData?.slug}` : null;
                element.slug = element.slug ? `${element?.categorytypeData?.slug}/${element?.slug}` : null;
                element.categoryData.slug = element?.categoryData?.slug ? `services/${element?.categoryData?.slug}` : null;

                return {
                    ...element
                }
            })
            return createResponseStatus(200, { result: filterResults }, "");
        } catch (error: any) {
            return createResponseStatus(500, null, error?.message || "Error when search ");
        }
    }
}