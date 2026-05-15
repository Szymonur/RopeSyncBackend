import express, { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { authenticateUser } from "../services/authService.js";

const router = express.Router();

const JWT_ACCESS_EXPIRATION_TIME = process.env
    .JWT_ACCESS_EXPIRATION_TIME as any;
const JWT_REFRESH_EXPIRATION_TIME = process.env
    .JWT_REFRESH_EXPIRATION_TIME as any;

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET as any;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as any;

router.post("/", async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Login i hasło są wymagane" });
    }

    try {
        const user = await authenticateUser(username, password);

        const payload = {
            id: user.id,
            username: user.username,
            role: user.role,
        };

        const accesToken = jwt.sign(payload, JWT_ACCESS_SECRET, {
            expiresIn: JWT_ACCESS_EXPIRATION_TIME,
        });

        const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
            expiresIn: JWT_REFRESH_EXPIRATION_TIME,
        });

        console.log(`LOGIN: User [${user.username}] login successfully`);

        res.json({
            message: "Logowanie pomyślne",
            accesToken,
            refreshToken,
        });
    } catch (error: any) {
        console.log(`LOGIN ERROR: ${error.message}`);

        if (error.message === "INVALID_CREDENTIALS") {
            return res
                .status(401)
                .json({ message: "Nieprawidłowy login lub hasło" });
        }

        res.status(500).json({ message: "Błąd serwera podczas logowania" });
    }
});

export default router;
