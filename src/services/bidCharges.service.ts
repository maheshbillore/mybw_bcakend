import BidCharges from "../models/bidCharges.model.js";
import { GenericResponse, GenericResponseCode } from "../shared/type.js";
import { IncomingBidChargeData } from "../shared/interface.js";

export class BidChargesService {
    static async getBidCharges(currentPage: number, pageSize: number): Promise<GenericResponse<any>> {
        try {
            const skip = (currentPage - 1) * pageSize;
            const [bidCharges, totalItems] = await Promise.all([
                await BidCharges.find()
                    .select("_id bid_count bid_type bid_charge status createdAt updatedAt")
                    .skip(skip)
                    .limit(pageSize)
                    .sort({ createdAt: -1 })
                    .lean(),
                BidCharges.countDocuments({}),
            ]);
            const totalPages = Math.ceil(totalItems / pageSize);

            return {
                success: true,
                data: {
                    bidCharges,
                    pagination: {
                        currentPage,
                        pageSize,
                        totalPages,
                        totalItems,
                    },
                },
                message: "Bid charges fetched successfully."
            };
        } catch (error: any) {
            console.error("Error fetching bid charges: ", error);
            return {
                success: false,
                data: null,
                message: error.message
            };
        }
    }

    static async storeBidCharge(data: IncomingBidChargeData): Promise<GenericResponseCode<any>> {
        try {
            const existing = await BidCharges.findOne({ bid_count: data.bid_count });
            if (existing) {
                return {
                    status: 409,
                    data: null,
                    message: "This bid count already exists.",
                };
            }

            const bidCharge = await BidCharges.create(data);
            return {
                status: 200,
                data: bidCharge,
                message: "Bid Charge created successfully.",
            };
        } catch (error: any) {
            console.error("Error creating bid Charge: ", error);
            return {
                status: 500,
                data: null,
                message: error.message
            };
        }
    }

    static async getBidCharge(bidChargeId: string): Promise<GenericResponse<any>> {
        try {
            if (!bidChargeId) {
                return {
                    success: false,
                    data: null,
                    message: "Bid charge id is not found."
                }
            }
            const bidCharge = await BidCharges.findById(bidChargeId);
            if (bidCharge) {
                return {
                    success: true,
                    data: bidCharge,
                    message: "Bid charge data get successfully",
                };
            } else {
                return {
                    success: false,
                    data: null,
                    message: "No record found.",
                };
            }
        } catch (error: any) {
            console.error("Error geting bid charge data: ", error);
            return {
                success: false,
                data: null,
                message: error.message
            };
        }
    }

    static async updateBidCharge(bidChargeId: string, data: IncomingBidChargeData): Promise<GenericResponseCode<any>> {
        try {
            if (!bidChargeId) {
                return {
                    status: 400,
                    data: null,
                    message: "bid charge id is required."
                };
            }

            const bidCharge = await BidCharges.findByIdAndUpdate(bidChargeId, data, {
                new: true,
                runValidators: true // ensures validation rules apply during update
            });

            if (!bidCharge) {
                return {
                    status: 400,
                    data: null,
                    message: "Bid charge not found.",
                };
            }

            return {
                status: 200,
                data: bidCharge,
                message: "Bid charge updated successfully.",
            };
        } catch (error: any) {
            console.error("Error updating bid charge: ", error);

            // Duplicate key error handling
            if (error.code === 11000) {
                return {
                    status: 500,
                    data: null,
                    message: "Bid charge name already exists. Please use a different name."
                };
            }

            return {
                status: 500,
                data: null,
                message: error.message || "Something went wrong while updating the bid charge."
            };
        }
    }

    static async deleteBidCharge(bidChargeId: string): Promise<GenericResponse<any>> {
        try {
            if (!bidChargeId) {
                return {
                    success: false,
                    data: null,
                    message: "bid charge id is not found."
                }
            }
            const role = await BidCharges.findByIdAndDelete(bidChargeId);
            if (role) {
                return {
                    success: true,
                    data: role,
                    message: "Bid charge delete successfully",
                };
            } else {
                return {
                    success: false,
                    data: null,
                    message: "No record found.",
                };
            }
        } catch (error: any) {
            console.error("Error deleting bid charges: ", error);
            return {
                success: false,
                data: null,
                message: error.message
            };
        }
    }


    static async getBidAmount(): Promise<GenericResponseCode<any>> {
        try {  
            const bidCharge = await BidCharges.findOne({status:true});
            if (bidCharge) {
                return {
                    status: 200,
                    data: bidCharge,
                    message: "Bid charge data get successfully",
                };
            } else {
                return {
                    status: 400,
                    data: null,
                    message: "No record found.",
                };
            }
        } catch (error: any) { 
            return {
                status: 500,
                data: null,
                message: error.message
            };
        }
    }
}