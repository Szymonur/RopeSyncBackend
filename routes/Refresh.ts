import express, { Request, Response } from "express";
import jwt from "jsonwebtoken";

const router = express.Router();

const JWT_ACCESS_EXPIRATION_TIME = process.env
    .JWT_ACCESS_EXPIRATION_TIME as any;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET as string;

interface JwtPayload {
    id: number | string;
    username: string;
    role: string;
}

router.post("/", (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(401).json({ message: "Brak Refresh Tokena" });
    }

    jwt.verify(refreshToken, JWT_REFRESH_SECRET, (err: any, decoded: any) => {
        if (err) {
            console.log("Refresh Token jest nieważny lub wygasł");
            return res
                .status(403)
                .json({ message: "Refresh Token jest nieważny lub wygasł" });
        }

        const userPayload = decoded as JwtPayload;

        const newPayload = {
            id: userPayload.id,
            username: userPayload.username,
        };

        const newAccessToken = jwt.sign(newPayload, JWT_ACCESS_SECRET, {
            expiresIn: JWT_ACCESS_EXPIRATION_TIME,
        });

        res.json({ accessToken: newAccessToken });
    });
});

export default router;
