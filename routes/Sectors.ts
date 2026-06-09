import express, { Request, Response } from "express";
import authenticateAccesJWT from "../utils/authenticateJWT.js";
import { query } from "../db/db.js";

const router = express.Router();

router.get("/search", authenticateAccesJWT, async (req: Request, res: Response) => {
    try {
        const searchQuery = typeof req.query.query === "string" ? req.query.query : "";
        if (!searchQuery) {
            return res.json({ sectors: [] });
        }
        const result = await query(`
            SELECT s.*, r.nazwa_rejonu 
            FROM Sektory s 
            JOIN Rejony r ON s.id_rejonu = r.id_rejonu 
            WHERE s.nazwa_sektoru ILIKE $1
        `, [`%${searchQuery}%`]);
        res.json({ sectors: result.rows });
    } catch (error) {
        console.error("Error searching sectors:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.get("/:id/rocks", authenticateAccesJWT, async (req: Request, res: Response) => {
    try {
        const sectorId = req.params.id;
        const result = await query("SELECT * FROM Skaly WHERE id_sektoru = $1", [sectorId]);
        res.json({ rocks: result.rows });
    } catch (error) {
        console.error("Error fetching rocks by sector:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.get("/:id", authenticateAccesJWT, async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        const result = await query("SELECT * FROM Sektory WHERE id_sektoru = $1", [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Sector not found" });
        }
        res.json({ sector: result.rows[0] });
    } catch (error) {
        console.error("Error fetching sector:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.get("/", authenticateAccesJWT, async (req: Request, res: Response) => {
    try {
        const result = await query("SELECT * FROM Sektory");
        res.json({ sectors: result.rows });
    } catch (error) {
        console.error("Error fetching sectors:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
