import { WebService } from "../services/web.service.js";
import { Request, Response } from "express";

export class WebController {
    static async getCategory(req: Request, res: Response) {
        const result = await WebService.getCategory();
        res.status(result?.status).json(result);
    }

    static async getSubCategory(req: Request, res: Response) {
        const {category} = req.query;  
        const result = await WebService.getSubCategory(category);
        res.status(result?.success ? 200 : 500).json(result);
    }

    static async getServices(req: Request, res: Response) {
        const {subcategory} = req.query;
        const result = await WebService.getServices(subcategory);
        res.status(result?.success ? 200 : 500).json(result);
    }

    static async getServiceDetails(req: Request, res: Response){ 
        const {service} = req?.query;  
        const result = await WebService.getServiceDetails(service);
        res.status(result?.status).json(result);
    }

    static async search(req:Request,res:Response){
       const payload = req?.query;
       const result = await WebService.search(payload);
       res.status(result?.status).json(result);
    }
}