import express, { Request, Response } from "express";
import authenticateAccesJWT from "../utils/authenticateJWT.js";

const router = express.Router();

router.get("/", authenticateAccesJWT, (req: Request, res: Response) => {
    res.json({ message: "Profile accessed", user: req.user });
});

export default router;
