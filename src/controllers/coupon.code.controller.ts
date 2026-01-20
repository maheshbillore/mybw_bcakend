import { Request, Response } from "express";
import CouponCodeService from "../services/coupon.code.service.js";

export default class CouponCodeController {
    static async add(req: Request, res: Response) {
        const result = await CouponCodeService.add(req.body);
        res.status(result.status).json(result);
    }

    static async get(req: Request, res: Response) {
        const result = await CouponCodeService.get();
        res.status(result.success ? 200 : 404).json(result);
    }
    static async update(req: Request, res: Response) {
        const { couponId } = req.params;
        const result = await CouponCodeService.update(couponId, req.body);
        res.status(result.success ? 200 : 404).json(result);
    }
    static async delete(req: Request, res: Response) {
        const { couponId } = req.params;
        const result = await CouponCodeService.delete(couponId);
        res.status(result.status).json(result);
    }

    static async checkCouponReferral(req: Request, res: Response) {
        const partnerId = req.user?._id.toString();
        const result = await CouponCodeService.checkCouponReferral(req.body, partnerId);
        res.status(result?.success ? 200 : 404).json(result);
    }

    static async addCustomerCouponCode(req: Request, res: Response) {
        const result = await CouponCodeService.addCustomerCouponCode(req.body);
        res.status(result.status).json(result);
    }

    static async getCustomerCouponCode(req: Request, res: Response) {
        const result = await CouponCodeService.getCustomerCouponCode();
        res.status(result.success ? 200 : 404).json(result);
    }

    static async changeStatus(req:Request,res:Response){
        const couponCodeId = req?.params?.couponId;
        const payload = req?.body;
        console.log(couponCodeId,'couponcode id');
        const result = await CouponCodeService.changeStatus(couponCodeId,payload);
        res.status(result?.success?200:404).json(result);
    }
}