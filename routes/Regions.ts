import express, { Request, Response } from "express";
import authenticateAccesJWT from "../utils/authenticateJWT.js";

import { query } from "../db/db.js";

const router = express.Router();

/**
 * @openapi
 * /regions/search:
 *   get:
 *     tags:
 *       - Regions
 *     summary: Search regions by name
 *     description: Returns a list of regions matching the search query.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query for region name
 *     responses:
 *       200:
 *         description: List of regions matching the search query
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 regions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Region'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error during regions search
 */
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

/**
 * @openapi
 * /regions/{id}/sectors:
 *   get:
 *     tags:
 *       - Regions
 *     summary: Get sectors in a region
 *     description: Returns a list of sectors belonging to a specific region.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Region ID
 *     responses:
 *       200:
 *         description: List of sectors in the region
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

/**
 * @openapi
 * /regions/{id}:
 *   get:
 *     tags:
 *       - Regions
 *     summary: Get region details
 *     description: Returns detailed information about a specific climbing region.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Region ID
 *     responses:
 *       200:
 *         description: Region details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 region:
 *                   $ref: '#/components/schemas/Region'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Region not found
 *       500:
 *         description: Server error during region retrieval
 */
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

/**
 * @openapi
 * /regions:
 *   get:
 *     tags:
 *       - Regions
 *     summary: Get all regions
 *     description: Returns a list of all climbing regions.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all regions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 regions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Region'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error during regions retrieval
 */
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
