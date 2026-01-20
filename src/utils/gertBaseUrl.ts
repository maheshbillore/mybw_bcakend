import { Request } from "express";

export const getBaseUrl = (req: Request): string => {
    const protocol = req.protocol;
    const host = req.get("host"); 
    console.log(`${protocol}://${host}`);
    return `${protocol}://${host}`;
};