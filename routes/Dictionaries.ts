import express, { Request, Response } from "express";
import authenticateAccesJWT from "../utils/authenticateJWT.js";
import { query } from "../db/db.js";

const router = express.Router();

// GET /styles - Pobiera dostępne style przejść (np. RP, OS, Flash)
router.get("/styles", authenticateAccesJWT, async (_req: Request, res: Response) => {
    try {
        const result = await query(`SELECT nazwa_stylu FROM Style_przejscia ORDER BY nazwa_stylu ASC;`);
        return res.json({
            message: "Pobrano możliwe style przejść",
            styles: result.rows,
        });
    } catch (error) {
        console.error("List styles error:", error);
        return res
            .status(500)
            .json({ message: "Błąd serwera podczas pobierania styli przejść" });
    }
});

export default router;
