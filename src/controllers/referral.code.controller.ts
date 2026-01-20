import { Request, Response } from "express";
import { ReferralCodeService } from "../services/referral.code.service.js";

export class ReferralCodeControllers{
     static async add( req :Request, res: Response){
        const result = await ReferralCodeService.add(req.body);
        res.status(result.success ? 200 : 404).json(result);
     }

     static async get(req: Request, res: Response){
        const result = await ReferralCodeService.get();
        res.status(result.success ? 200 : 404).json(result);
     }

     static async update(req: Request, res: Response){
      const { referralId } = req.params;
        const result = await ReferralCodeService.update(referralId,req.body);
        res.status(result.success ? 200 : 404 ).json(result);
     }
     static async delete(req: Request , res: Response){
        const { referralId } = req.params;
        const result = await ReferralCodeService.delete(referralId);
        res.status(result.success ? 200 : 404).json(result);
     }
}