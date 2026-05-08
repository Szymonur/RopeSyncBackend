import express, { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { users } from "../utils/tmpDB.js";

const router = express.Router();

const JWT_EXPIRATION_TIME = "1h";
const JWT_SECRET = process.env.JWT_SECRET as string;

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
    const token = jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRATION_TIME,
    });

    res.json({ message: "Login successful", token });
});

export default router;
