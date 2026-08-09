import express, { Request, Response } from "express";
import authenticateAccesJWT from "../utils/authenticateJWT.js";
import { query } from "../db/db.js";

const router = express.Router();

/**
 * @openapi
 * /sectors/search:
 *   get:
 *     tags:
 *       - Sectors
 *     summary: Search sectors by name
 *     description: Returns a list of climbing sectors matching the search query.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query for sector name
 *     responses:
 *       200:
 *         description: List of sectors matching the search query
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sectors:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Sector'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error during sectors search
 */
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

/**
 * @openapi
 * /sectors/{id}/rocks:
 *   get:
 *     tags:
 *       - Sectors
 *     summary: Get rocks in a sector
 *     description: Returns a list of climbing rocks belonging to a specific sector.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sector ID
 *     responses:
 *       200:
 *         description: List of rocks in the sector
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rocks:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Rock'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error during rocks retrieval
 */
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

/**
 * @openapi
 * /sectors/{id}:
 *   get:
 *     tags:
 *       - Sectors
 *     summary: Get sector details
 *     description: Returns detailed information about a specific climbing sector.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sector ID
 *     responses:
 *       200:
 *         description: Sector details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sector:
 *                   $ref: '#/components/schemas/Sector'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Sector not found
 *       500:
 *         description: Server error during sector retrieval
 */
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

/**
 * @openapi
 * /sectors:
 *   get:
 *     tags:
 *       - Sectors
 *     summary: Get all sectors
 *     description: Returns a list of all climbing sectors.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all sectors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sectors:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Sector'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error during sectors retrieval
 */
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
