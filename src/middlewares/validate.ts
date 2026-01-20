// middleware/validate.js
import { Request, Response } from "express"; 

export const validate = (schema: any) => (req: Request, res: Response, next: any) => {
  
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            details: error.details.map((d: any) => d.message),
        });
    }
    next();
};
