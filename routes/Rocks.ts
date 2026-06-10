import express, { Request, Response } from "express";
import authenticateAccesJWT from "../utils/authenticateJWT.js";
import { query } from "../db/db.js";

const router = express.Router();

/**
 * @openapi
 * /rocks/search:
 *   get:
 *     tags:
 *       - Rocks
 *     summary: Search rocks by name
 *     description: Returns a list of climbing rocks matching the search query.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query for rock name
 *     responses:
 *       200:
 *         description: List of rocks matching the search query
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
 *         description: Server error during rocks search
 */
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

/**
 * @openapi
 * /rocks/{id}:
 *   get:
 *     tags:
 *       - Rocks
 *     summary: Get rock details
 *     description: Returns detailed information about a specific climbing rock.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Rock ID
 *     responses:
 *       200:
 *         description: Rock details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rock:
 *                   $ref: '#/components/schemas/Rock'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Rock not found
 *       500:
 *         description: Server error during rock retrieval
 */
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

/**
 * @openapi
 * /rocks:
 *   get:
 *     tags:
 *       - Rocks
 *     summary: Get all rocks
 *     description: Returns a list of all climbing rocks.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all rocks
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
