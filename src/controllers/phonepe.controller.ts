import { Request, Response } from "express";
import { PhonepeService } from "../services/phonepe.service.js";

export class PhonepeController {
    static async initiatePayment(req: Request, res: Response) {
        const result = await PhonepeService.initiatePayment(req.body);
        res.status(result.success ? 200 : 404).json(result);
    }

    static async verifyTransaction(req: Request, res: Response){
        const transactionId = req.query.transactionId as string;
        const result = await PhonepeService.verifyTransaction(transactionId);
        res.status(result.success ? 200 : 404).json(result);
    }

    static async partnerSubscriptionPayNow(req:Request , res:Response){
        const partnerId = req?.user?._id;
        const result = await PhonepeService.partnerSubscriptionPayNow(req.body,partnerId);
        res.status(result?.success ? 200 : 404).json(result);
    }
}