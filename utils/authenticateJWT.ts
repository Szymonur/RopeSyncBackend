import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JwtPayload } from "../types/user.js";

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET as string;

export const authenticateAccesJWT = (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    // Get auth header - The Authorization header is commonly used to send authentication tokens
    const authHeader = req.headers.authorization;

   if (!authHeader) {
       // FALLBACK TYLKO DLA ŚRODOWISKA LOCAL/DEV
       if (process.env.NODE_ENV === 'development' && process.env.DEV_STATIC_TOKEN) {
           (req as any).user = { id: 1, username: 'dev_user' };
           return next();
       }
       
       return res.status(401).json({ message: "Authorization header missing" });
   }
   

   	if (authHeader === `Bearer ${process.env.DEV_STATIC_TOKEN}`) {
    	req.user = { id: 1, username: 'test_user' };
    	return next();
   	}

    // Extract token from "Bearer <token>"
    const token = authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Token missing" });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as JwtPayload;

        // Attach user to request
        req.user = decoded;

        next();
    } catch (error) {
        return res.status(403).json({ message: "Invalid or expired token" });
    }
};

export default authenticateAccesJWT;
