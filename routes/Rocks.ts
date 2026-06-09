import express, { Request, Response } from "express";
import authenticateAccesJWT from "../utils/authenticateJWT.js";
import { query } from "../db/db.js";

const router = express.Router();

router.get("/search", authenticateAccesJWT, async (req: Request, res: Response) => {
    try {
        const searchQuery = typeof req.query.query === "string" ? req.query.query : "";
        if (!searchQuery) {
            return res.json({ rocks: [] });
        }
        const result = await query(`
            SELECT sk.*, s.nazwa_sektoru 
            FROM Skaly sk 
            JOIN Sektory s ON sk.id_sektoru = s.id_sektoru 
            WHERE sk.nazwa_skaly ILIKE $1
        `, [`%${searchQuery}%`]);
        res.json({ rocks: result.rows });
    } catch (error) {
        console.error("Error searching rocks:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.get("/:id", authenticateAccesJWT, async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        const result = await query("SELECT * FROM Skaly WHERE id_skaly = $1", [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Rock not found" });
        }
        res.json({ rock: result.rows[0] });
    } catch (error) {
        console.error("Error fetching rock:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.get("/", authenticateAccesJWT, async (req: Request, res: Response) => {
    try {
        const result = await query("SELECT * FROM Skaly");
        res.json({ rocks: result.rows });
    } catch (error) {
        console.error("Error fetching rocks:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
