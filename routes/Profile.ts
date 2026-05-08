import express, { Request, Response } from "express";
import authenticateJWT from "../utils/authenticateJWT.js";

const router = express.Router();

router.get("/", authenticateJWT, (req: Request, res: Response) => {
    res.json({ message: "Profile accessed", user: req.user });
});

export default router;
