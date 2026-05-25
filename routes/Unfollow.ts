import express, { Request, Response } from "express";
import authenticateAccesJWT from "../utils/authenticateJWT.js";
import { query } from "../db/db.js";

const router = express.Router();

const parseUserIdParam = (value: string | undefined) => {
    if (!value) return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const getSingleParamValue = (value: string | string[] | undefined) => {
    if (Array.isArray(value)) return value[0];
    return value;
};

router.delete("/:userId", authenticateAccesJWT, async (req: Request, res: Response) => {
    const followerId = (req.user as any).id;
    const followedId = parseUserIdParam(getSingleParamValue(req.params.userId));

    if (!followedId) {
        return res.status(400).json({ message: "Nieprawidłowe ID użytkownika" });
    }

    try {
        const result = await query(
            "DELETE FROM Obserwacje WHERE id_obserwujacego = $1 AND id_obserwowanego = $2",
            [followerId, followedId],
        );

        if ((result.rowCount ?? 0) === 0) {
            return res.status(404).json({ message: "Nie obserwujesz tego użytkownika" });
        }

        return res.json({ message: "Przestano obserwować użytkownika" });
    } catch (error) {
        console.error("Unfollow error:", error);
        return res.status(500).json({ message: "Błąd serwera podczas cofania obserwacji" });
    }
});

export default router;
