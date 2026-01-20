import { Request, Response } from "express";
import { SubscriptionPlansService } from "../services/subscriptionPlans.service.js";

export class SubscriptionPlansController {

    static async createSubscriptionPlan(req: Request, res: Response) {
        const result = await SubscriptionPlansService.createSubscriptionPlan(req.body);
        res.status(result.success ? 200 : 404).json(result);
    }

    static async getAllSubscriptionPlans(req: Request, res: Response) {
        const result = await SubscriptionPlansService.getAllSubscriptionPlans();
        res.status(result.success ? 200 : 404).json(result);
    }

    static async updateSubscriptionPlan(req: Request, res: Response) {
        const id = req.params.id as string;
        const result = await SubscriptionPlansService.updateSubscriptionPlan(id, req.body);
        res.status(result.success ? 200 : 404).json(result);
    }

    static async deleteSubscriptionPlan(req: Request, res: Response) {
        const id = req.params.id as string;
        const result = await SubscriptionPlansService.deleteSubscriptionPlan(id);
        res.status(result.success ? 200 : 404).json(result);
    }

    static async createCustomerSubscriptionPlan(req: Request, res: Response) {
        const result = await SubscriptionPlansService.createCustomerSubscriptionPlan(req.body);
        res.status(result.success ? 200 : 404).json(result);
    }

    static async getCustomerAllSubscriptionPlans(req: Request, res: Response) {
        const result = await SubscriptionPlansService.getCustomerAllSubscriptionPlans();
        res.status(result.success ? 200 : 404).json(result);
    }

    static async updateCustomerSubscriptionPlan(req: Request, res: Response) {
        const id = req.params.id as string;
        const result = await SubscriptionPlansService.updateCustomerSubscriptionPlan(id, req.body);
        res.status(result.success ? 200 : 404).json(result);
    }

}