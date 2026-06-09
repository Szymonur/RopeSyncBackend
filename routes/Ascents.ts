import express, { Request, Response } from "express";
import authenticateAccesJWT from "../utils/authenticateJWT.js";
import { query } from "../db/db.js";

const router = express.Router();

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

/**
 * @openapi
 * /ascents:
 *   get:
 *     tags:
 *       - Ascents
 *     summary: Pobierz listę przejść zalogowanego użytkownika
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista przejść
 */
router.get("/", authenticateAccesJWT, async (req: Request, res: Response) => {
   try {
		const userId = (req.user as any).id;
		const result = await query(
			`SELECT
			p.id_przejscia,
			p.data,
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
 *     summary: Dodaj nowe przejście
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
 *     responses:
 *       201:
 *         description: Przejście zapisane
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
 *     summary: Szczegóły konkretnego przejścia
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
 *         description: Dane przejścia
 *       404:
 *         description: Nie znaleziono przejścia
 */
router.get("/:ascentId", authenticateAccesJWT, async (req: Request, res: Response) => {
    const { ascentId } = req.params;

    try {
        const result = await query(
            `SELECT 
                p.id_przejscia, 
                p.data, 
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
 *     summary: Usuń przejście
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
 *         description: Przejście usunięte
 *       404:
 *         description: Nie znaleziono przejścia
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
 *     summary: Pobierz status reakcji dla przejścia
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
 *         description: Liczba reakcji i informacja czy ja zareagowałem
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
 *     summary: Dodaj reakcję do przejścia
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
 *         description: Reakcja dodana
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
 *     summary: Usuń swoją reakcję z przejścia
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
 *         description: Reakcja usunięta
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
