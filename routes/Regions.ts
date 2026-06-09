import express, { Request, Response } from "express";
import authenticateAccesJWT from "../utils/authenticateJWT.js";

import { query } from "../db/db.js";

const router = express.Router();

router.get("/search", authenticateAccesJWT, async (req: Request, res: Response) => {
    try {
        const searchQuery = typeof req.query.query === "string" ? req.query.query : "";
        if (!searchQuery) {
            return res.json({ regions: [] });
        }
        const result = await query("SELECT * FROM Rejony WHERE nazwa_rejonu ILIKE $1", [`%${searchQuery}%`]);
        res.json({ regions: result.rows });
    } catch (error) {
        console.error("Error searching regions:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.get("/:id/sectors", authenticateAccesJWT, async (req: Request, res: Response) => {
    try {
        const regionId = req.params.id;
        const result = await query("SELECT * FROM Sektory WHERE id_rejonu = $1", [regionId]);
        res.json({ sectors: result.rows });
    } catch (error) {
        console.error("Error fetching sectors by region:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.get("/:id", authenticateAccesJWT, async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        const result = await query("SELECT * FROM Rejony WHERE id_rejonu = $1", [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Region not found" });
        }
        res.json({ region: result.rows[0] });
    } catch (error) {
        console.error("Error fetching region:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.get("/", authenticateAccesJWT, async (req: Request, res: Response) => {
    try {
        const result = await query("SELECT * FROM Rejony");
        res.json({ regions: result.rows });
    } catch (error) {
        console.error("Error fetching regions:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
