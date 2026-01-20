import { Request, Response } from "express";
import { Services } from "../services/services.service.js";

export class ServiceController {
    static async createService(req: Request, res: Response) {
        try {
            // Validate req.body.data exists
            if (!req.body.data) {
                res.status(400).json({
                    success: false,
                    data: null,
                    message: "Request data is missing",
                });
                return;
            }

            // Parse the data with error handling
            let parsedData;
            try {
                parsedData = JSON.parse(req.body.data);
            } catch (parseError) {
                console.error("JSON Parse Error in createService:", parseError);
                console.error("Received req.body.data:", req.body.data);
                res.status(400).json({
                    success: false,
                    data: null,
                    message: "Invalid JSON data format",
                });
                return;
            }

            const {
                name,
                description,
                category,
                categoryType,
                isCustomService,
                customServiceName,
                pricingTiers,
                surgePricing,
                partnerCommissionRate,
            } = parsedData;

            const file = req?.file;

            if (!name || !category || !pricingTiers || pricingTiers.length === 0) {
                if (isCustomService === false) {
                    res.status(400).json({
                        success: false,
                        data: null,
                        message: "Name, category, and at least one pricing tier are required",
                    });
                    return;
                }
            }

            const result = await Services.createNewService(
                parsedData,
                file?.filename,
                req.user?.id,
                req.user?.role ?? ""
            );

            res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            console.error("Error in createService controller:", error);
            res.status(500).json({
                success: false,
                data: null,
                message: "Internal server error",
            });
        }
    }

    static async updateService(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const file = req?.file;

            // Validate req.body.data exists
            if (!req.body.data) {
                res.status(400).json({
                    success: false,
                    data: null,
                    message: "Request data is missing",
                });
                return;
            }

            // Parse the data with error handling
            let parsedData;
            try {
                parsedData = JSON.parse(req.body.data);
            } catch (parseError) {
                console.error("JSON Parse Error in updateService:", parseError);
                console.error("Received req.body.data:", req.body.data);
                console.error("Type of req.body.data:", typeof req.body.data);
                res.status(400).json({
                    success: false,
                    data: null,
                    message: "Invalid JSON data format",
                });
                return;
            }

        

            const result = await Services.updateExistingService(
                id,
                parsedData,
                file,
                req.user?.id,
                req.user?.role ?? ""
            );

            res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            console.error("Error in updateService controller:", error);
            res.status(500).json({
                success: false,
                data: null,
                message: "Internal server error",
            });
        }
    }

    static async getAllServices(req: Request, res: Response) {
        try {
            const {
                currentPage = 1,
                pageSize = 10,
                searchQuery = "",
            } = req.query;

            const result = await Services.getAllServices(
                Number(currentPage),
                Number(pageSize),
                req.user?.id,
                req.user?.role ?? "",
                searchQuery as string
            );

            res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            console.error("Error in getAllServices controller:", error);
            res.status(500).json({
                success: false,
                data: null,
                message: "Internal server error",
            });
        }
    }

    static async getServicesByCategory(req: Request, res: Response) {
        const categoryIds = req.body.categoryIds as any;
        const result = await Services.getServicesByCategory(categoryIds);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async deleteService(req: Request, res: Response) {
        try {
            const { id } = req.params;

            const result = await Services.deleteService(
                id,
                req.user?.id,
                req.user?.role ?? ""
            );

            res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            console.error("Error in deleteService controller:", error);
            res.status(500).json({
                success: false,
                data: null,
                message: "Internal server error",
            });
        }
    }
}