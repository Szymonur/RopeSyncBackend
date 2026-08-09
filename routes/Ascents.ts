import express, { Request, Response } from "express";
import authenticateAccesJWT from "../utils/authenticateJWT.js";
import { query } from "../db/db.js";

const router = express.Router();

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

// TODO - dokumnetacja 
router.post("/sync-diff", authenticateAccesJWT, async (req: Request, res: Response) => {	
   try {
		const userId = (req.user as any).id;
		const { ascentsUUID }  = req.body;
		// console.error("ascentsUUID", ascentsUUID);
		
		const result = await query(
			`SELECT
			p.id_przejscia,
			p.data::TEXT,
			p.timeline_data,
			p.notatka,
			p.id_uzytkownika,
			p.nazwa_stylu,
			d.id_drogi,
			d.nazwa_drogi,
			d.typ_drogi,
			u.imie,
			u.nazwisko,
			u.login as username,
			COALESCE(ds.skala_linowa, dt.skala_linowa, db.skala_boulderowa) AS wycena
			FROM przejscia p
			JOIN drogi d ON d.id_drogi = p.id_drogi 
			JOIN uzytkownicy u on p.id_uzytkownika = u.id_uzytkownika
			LEFT JOIN Drogi_sportowe_szczegoly ds ON ds.id_drogi = d.id_drogi AND d.typ_drogi = 'sportowa'
			LEFT JOIN Trady_szczegoly dt ON dt.id_drogi = d.id_drogi AND d.typ_drogi = 'trad'
			LEFT JOIN Bouldery_szczegoly db ON db.id_drogi = d.id_drogi AND d.typ_drogi = 'boulder'
			WHERE p.id_uzytkownika = $1
			AND id_przejscia != ALL($2)
			ORDER BY d.nazwa_drogi ASC;`, [userId, ascentsUUID]
       );
       return res.json({
           message: "Pobrano niezsynchronizowane przejscia",
           ascents: result.rows,
       });
   } catch (error) {
       console.error("List unsync ascents error:", error);
       return res
           .status(500)
           .json({ message: "Błąd serwera podczas pobierania niezsynchronizowanych przejść" });
   }
});

/**
 * @openapi
 * /ascents/count:
 *   get:
 *     tags:
 *       - Ascents
 *     summary: Get ascents count
 *     description: Returns the number of ascents for current user.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Ascents count and user status
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error during ascents count
 */
router.get("/count", authenticateAccesJWT, async (req: Request, res: Response) => {	
    const userId = (req.user as any).id;	
    try {
        const countResult = await query(
            "SELECT COUNT(*) as count FROM przejscia WHERE id_uzytkownika = $1;",
            [userId],
        );
        return res.json({
            count: parseInt(countResult.rows[0].count)
        });
    } catch (error) {
        console.error("Get reactions error:", error);
        return res
            .status(500)
            .json({ message: "Błąd serwera podczas pobierania liczby przejść" });
    }
});


/**
 * @openapi
 * /ascents:
 *   get:
 *     tags:
 *       - Ascents
 *     summary: Get user ascents
 *     description: Returns a list of climbing ascents for the currently authenticated user.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of ascents
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 ascents:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Ascent'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error during ascents retrieval
 */
router.get("/", authenticateAccesJWT, async (req: Request, res: Response) => {
   try {
		const userId = (req.user as any).id;
		const result = await query(
			`SELECT
			p.id_przejscia,
			p.data::TEXT,
			p.timeline_data,
			p.notatka,
			p.id_uzytkownika,
			p.nazwa_stylu,
			d.id_drogi,
			d.nazwa_drogi,
			d.typ_drogi,
			u.imie,
			u.nazwisko,
			u.login as username,
			COALESCE(ds.skala_linowa, dt.skala_linowa, db.skala_boulderowa) AS wycena
			FROM przejscia p
			JOIN drogi d ON d.id_drogi = p.id_drogi 
			JOIN uzytkownicy u on p.id_uzytkownika = u.id_uzytkownika
			LEFT JOIN Drogi_sportowe_szczegoly ds ON ds.id_drogi = d.id_drogi AND d.typ_drogi = 'sportowa'
			LEFT JOIN Trady_szczegoly dt ON dt.id_drogi = d.id_drogi AND d.typ_drogi = 'trad'
			LEFT JOIN Bouldery_szczegoly db ON db.id_drogi = d.id_drogi AND d.typ_drogi = 'boulder'
			WHERE p.id_uzytkownika = $1
			ORDER BY d.nazwa_drogi ASC;`, [userId]
       );
       return res.json({
           message: "Pobrano przejscia",
           ascents: result.rows,
       });
   } catch (error) {
       console.error("List ascents error:", error);
       return res
           .status(500)
           .json({ message: "Błąd serwera podczas pobierania dróg" });
   }
});

/**
 * @openapi
 * /ascents:
 *   post:
 *     tags:
 *       - Ascents
 *     summary: Add a new ascent
 *     description: Records a new climbing ascent for the user.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_drogi
 *               - data
 *             properties:
 *               id_drogi:
 *                 type: string
 *               data:
 *                 type: string
 *                 example: "2023-10-27"
 *               notatka:
 *                 type: string
 *               nazwa_stylu:
 *                 type: string
 *                 example: "RP"
 *               timeline_data:
 *                 type: object
 *               id_przejscia:
 *                 type: string
 *     responses:
 *       201:
 *         description: Ascent saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 ascent:
 *                   $ref: '#/components/schemas/Ascent'
 *       400:
 *         description: Missing required fields or invalid data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Route not found
 *       500:
 *         description: Server error during ascent creation
 */
router.post("/", authenticateAccesJWT, async (req: Request, res: Response) => {
    const userId = Number((req.user as any)?.id);
    const { data, id_drogi, timeline_data, notatka, nazwa_stylu, id_przejscia } =
        req.body ?? {};

    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(401).json({ message: "Nieprawidłowy użytkownik" });
    }

    if (!id_drogi || typeof id_drogi !== "string") {
        return res.status(400).json({ message: "Brak id_drogi" });
    }

    if (!data || typeof data !== "string" || !isIsoDate(data)) {
        return res
            .status(400)
            .json({ message: "Nieprawidłowa data (YYYY-MM-DD)" });
    }

    const style =
        typeof nazwa_stylu === "string" && nazwa_stylu.trim().length > 0
            ? nazwa_stylu.trim()
            : "RP";

    try {
        const routeExists = await query(
            "SELECT 1 FROM Drogi WHERE id_drogi = $1",
            [id_drogi],
        );

        if ((routeExists.rowCount ?? 0) === 0) {
            return res
                .status(404)
                .json({ message: "Droga o podanym id_drogi nie istnieje" });
        }

        await query(
            `INSERT INTO Przejscia (
                id_przejscia,
                data,
                notatka,
                timeline_data,
                id_uzytkownika,
                nazwa_stylu,
                id_drogi
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                id_przejscia,
                data,
                notatka ?? null,
                timeline_data,
                userId,
                style,
                id_drogi,
            ],
        );

        return res.status(201).json({
            message: "Przejście zapisane",
            ascent: {
                id_przejscia: id_przejscia,
                data,
                id_drogi,
                notatka: notatka ?? null,
                timeline_data,
                nazwa_stylu: style,
                id_uzytkownika: userId,
            },
        });
    } catch (error) {
        console.error("Create ascent error:", error);
        return res
            .status(500)
            .json({ message: "Błąd serwera podczas zapisu przejścia" });
    }
});

/**
 * @openapi
 * /ascents/{ascentId}:
 *   get:
 *     tags:
 *       - Ascents
 *     summary: Get ascent details
 *     description: Returns detailed information about a specific climbing ascent.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ascentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ascent details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 ascent:
 *                   $ref: '#/components/schemas/Ascent'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Ascent not found
 *       500:
 *         description: Server error during ascent detail retrieval
 */
router.get("/:ascentId", authenticateAccesJWT, async (req: Request, res: Response) => {
    const { ascentId } = req.params;

    try {
        const result = await query(
            `SELECT 
                p.id_przejscia, 
                p.data::TEXT, 
                p.notatka, 
                p.timeline_data, 
                p.id_uzytkownika, 
                p.nazwa_stylu, 
                p.id_drogi,
                d.nazwa_drogi,
                d.typ_drogi,
                COALESCE(ds.skala_linowa, dt.skala_linowa, db.skala_boulderowa) AS wycena,
                u.imie,
                u.nazwisko,
                u.login AS username
            FROM Przejscia p
            LEFT JOIN Drogi d ON p.id_drogi = d.id_drogi
            LEFT JOIN Drogi_sportowe_szczegoly ds ON ds.id_drogi = d.id_drogi AND d.typ_drogi = 'sportowa'
            LEFT JOIN Trady_szczegoly dt ON dt.id_drogi = d.id_drogi AND d.typ_drogi = 'trad'
            LEFT JOIN Bouldery_szczegoly db ON db.id_drogi = d.id_drogi AND d.typ_drogi = 'boulder'
            LEFT JOIN Uzytkownicy u ON p.id_uzytkownika = u.id_uzytkownika
            WHERE p.id_przejscia = $1`,
            [ascentId],
        );

        if ((result.rowCount ?? 0) === 0) {
            return res.status(404).json({ message: "Nie znaleziono przejścia" });
        }

        return res.json({
            message: "Pobrano dane przejścia",
            ascent: result.rows[0],
        });
    } catch (error) {
        console.error("Get ascent details error:", error);
        return res
            .status(500)
            .json({ message: "Błąd serwera podczas pobierania szczegółów przejścia" });
    }
});

/**
 * @openapi
 * /ascents/{ascentId}:
 *   delete:
 *     tags:
 *       - Ascents
 *     summary: Delete an ascent
 *     description: Removes a climbing ascent record. Only the owner can delete their ascent.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ascentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ascent deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Ascent not found or permission denied
 *       500:
 *         description: Server error during ascent deletion
 */
router.delete("/:ascentId", authenticateAccesJWT, async (req: Request, res: Response) => {
    const userId = Number((req.user as any)?.id);
    const { ascentId } = req.params;

    if (!ascentId) {
        return res.status(400).json({ message: "Brak id przejścia" });
    }

    try {
        const result = await query(
            "DELETE FROM Przejscia WHERE id_przejscia = $1 AND id_uzytkownika = $2",
            [ascentId, userId],
        );

        if ((result.rowCount ?? 0) === 0) {
            return res.status(404).json({
                message: "Nie znaleziono przejścia lub brak uprawnień",
            });
        }

        return res.json({ message: "Przejście usunięte" });
    } catch (error) {
        console.error("Delete ascent error:", error);
        return res
            .status(500)
            .json({ message: "Błąd serwera podczas usuwania przejścia" });
    }
});

/**
 * @openapi
 * /ascents/{ascentId}/reactions:
 *   get:
 *     tags:
 *       - Reactions
 *     summary: Get reactions for an ascent
 *     description: Returns the number of reactions for an ascent and whether the current user has reacted.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ascentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reaction count and user status
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error during reactions retrieval
 */
router.get("/:ascentId/reactions", authenticateAccesJWT, async (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    const { ascentId } = req.params;

    try {
        const countResult = await query(
            "SELECT COUNT(*) as count FROM Reakcje WHERE id_przejscia = $1",
            [ascentId],
        );

        const userReactedResult = await query(
            "SELECT 1 FROM Reakcje WHERE id_uzytkownika = $1 AND id_przejscia = $2",
            [userId, ascentId],
        );

        return res.json({
            count: parseInt(countResult.rows[0].count),
            userReacted: (userReactedResult.rowCount ?? 0) > 0,
        });
    } catch (error) {
        console.error("Get reactions error:", error);
        return res
            .status(500)
            .json({ message: "Błąd serwera podczas pobierania reakcji" });
    }
});

/**
 * @openapi
 * /ascents/{ascentId}/reactions:
 *   post:
 *     tags:
 *       - Reactions
 *     summary: Add a reaction to an ascent
 *     description: Adds a reaction from the current user to a specific ascent.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ascentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reaction added
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Ascent not found
 *       500:
 *         description: Server error during reaction creation
 */
router.post("/:ascentId/reactions", authenticateAccesJWT, async (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    const { ascentId } = req.params;

    try {
        const ascentExists = await query("SELECT 1 FROM Przejscia WHERE id_przejscia = $1", [ascentId]);
        if ((ascentExists.rowCount ?? 0) === 0) {
            return res.status(404).json({ message: "Nie znaleziono przejścia" });
        }

        await query(
            "INSERT INTO Reakcje (id_uzytkownika, id_przejscia) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            [userId, ascentId]
        );
        return res.json({ message: "Reakcja dodana" });
    } catch (error) {
        console.error("Add reaction error:", error);
        return res.status(500).json({ message: "Błąd serwera podczas dodawania reakcji" });
    }
});

/**
 * @openapi
 * /ascents/{ascentId}/reactions:
 *   delete:
 *     tags:
 *       - Reactions
 *     summary: Remove a reaction from an ascent
 *     description: Removes the current user's reaction from a specific ascent.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ascentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reaction removed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Reaction not found
 *       500:
 *         description: Server error during reaction removal
 */
router.delete("/:ascentId/reactions", authenticateAccesJWT, async (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    const { ascentId } = req.params;

    try {
        const result = await query(
            "DELETE FROM Reakcje WHERE id_uzytkownika = $1 AND id_przejscia = $2",
            [userId, ascentId]
        );
        if ((result.rowCount ?? 0) === 0) {
            return res.status(404).json({ message: "Nie znaleziono reakcji użytkownika dla tego przejścia" });
        }
        return res.json({ message: "Reakcja usunięta" });
    } catch (error) {
        console.error("Delete reaction error:", error);
        return res.status(500).json({ message: "Błąd serwera podczas usuwania reakcji" });
    }
});



export default router;
