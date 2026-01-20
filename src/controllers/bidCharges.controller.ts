import { Request, Response } from "express";
import { BidChargesService } from "../services/bidCharges.service.js"; 

export class BidChargesController {
    static async getBidCharges(req: Request, res: Response) {
        const { currentPage = 1, pageSize = 10 } = req.query;
        const getBidCharges = await BidChargesService.getBidCharges(Number(currentPage), Number(pageSize));
        res.status(getBidCharges.success ? 200 : 404).json(getBidCharges);
    }

    static async storeBidCharge(req: Request, res: Response) {
        const storeBidCharge = await BidChargesService.storeBidCharge(req.body);
        res.status(storeBidCharge.status).json(storeBidCharge);
    }

    static async getBidCharge(req: Request, res: Response) {
        const bidChargeId = req.params.bidChargeId as string;
        const getBidCharge = await BidChargesService.getBidCharge(bidChargeId);
        res.status(getBidCharge.success ? 200 : 404).json(getBidCharge);
    }

    static async updateBidCharge(req: Request, res: Response) {
        const bidChargeId = req.params.bidChargeId as string;
        const updateBidCharge = await BidChargesService.updateBidCharge(bidChargeId, req.body);
        res.status(updateBidCharge.status).json(updateBidCharge);
    }

    static async deleteBidCharge(req: Request, res: Response) {
        const bidChargeId = req.params.bidChargeId as string;
        const deleteBidCharge = await BidChargesService.deleteBidCharge(bidChargeId);
        res.status(deleteBidCharge.success ? 200 : 404).json(deleteBidCharge);
    }

    static async getBidAmount(req:Request,res:Response){
        const result = await BidChargesService.getBidAmount();
        res.status(result.status).json(result);
    }

    
}