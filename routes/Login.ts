import express, { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { users } from "../utils/tmpDB.js";

const router = express.Router();

const JWT_ACCESS_EXPIRATION_TIME = process.env
    .JWT_ACCESS_EXPIRATION_TIME as any;
const JWT_REFRESH_EXPIRATION_TIME = process.env
    .JWT_REFRESH_EXPIRATION_TIME as any;

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET as string;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;

// Login route - generate token
router.post("/", (req: Request, res: Response) => {
    const { username, password } = req.body;
    // Find user
    const user = users.find(
        (u) => u.username === username && u.password === password,
    );

    if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
    }

    // Create payload for JWT
    const payload = {
        id: user.id,
        username: user.username,
        role: user.role,
    };

    // Sign token
    const accesToken = jwt.sign(payload, JWT_ACCESS_SECRET, {
        expiresIn: JWT_ACCESS_EXPIRATION_TIME,
    });

    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
        expiresIn: JWT_REFRESH_EXPIRATION_TIME,
    });
    res.json({ message: "Login successful", accesToken, refreshToken });
});

export default router;
