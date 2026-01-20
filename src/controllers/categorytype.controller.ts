import { Request, Response } from "express";
import { CategorytypeService } from "../services/categorytype.service.js";

export class CategorytypeController {

    static async Create(req: Request, res: Response) {
         const file = req.file; 
        const result = await CategorytypeService.create(req.body,file); 
        res.status(result.success ? 200 : 404).json(result);
    }

    static async index(req: Request, res: Response) {
        const { currentPage =1, pageSize=10 } = req.params;
        const result = await CategorytypeService.index(Number(currentPage), Number(pageSize));
        res.status(result.success ? 200 : 404).json(result);
    }
    
    static async update(req:Request,res:Response){
        const { id } = req.params; 
        const file = req.file; 
        const result = await CategorytypeService.update(id,req.body,file);
        res.status(result.success ? 200 : 404).json(result);
    }

    static async delete(req: Request, res:Response){
        const { id } = req.params;
        const result = await CategorytypeService.delete(id);
        res.status(result.success ? 200 : 404).json(result);
    }
    

}