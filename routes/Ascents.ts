import express, { Request, Response } from "express";
import authenticateAccesJWT from "../utils/authenticateJWT.js";
import { query } from "../db/db.js";

const router = express.Router();

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

router.get("/routes", authenticateAccesJWT, async (_req: Request, res: Response) => {
    try {
        const result = await query(
            `SELECT
                d.id_drogi,
                d.nazwa_drogi,
                d.typ_drogi,
                COALESCE(ds.skala_linowa, dt.skala_linowa, db.skala_boulderowa) AS wycena
             FROM Drogi d
             LEFT JOIN Drogi_sportowe_szczegoly ds ON ds.id_drogi = d.id_drogi AND d.typ_drogi = 'sportowa'
             LEFT JOIN Trady_szczegoly dt ON dt.id_drogi = d.id_drogi AND d.typ_drogi = 'trad'
             LEFT JOIN Bouldery_szczegoly db ON db.id_drogi = d.id_drogi AND d.typ_drogi = 'boulder'
             ORDER BY d.nazwa_drogi ASC`,
        );

        return res.json({
            message: "Pobrano drogi",
            routes: result.rows,
        });
    } catch (error) {
        console.error("List routes error:", error);
        return res.status(500).json({ message: "Błąd serwera podczas pobierania dróg" });
    }
});

router.post("/", authenticateAccesJWT, async (req: Request, res: Response) => {
    const userId = Number((req.user as any)?.id);
    const { data, id_drogi, notatka, nazwa_stylu } = req.body ?? {};

    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(401).json({ message: "Nieprawidłowy użytkownik" });
    }

    if (!id_drogi || typeof id_drogi !== "string") {
        return res.status(400).json({ message: "Brak id_drogi" });
    }

    if (!data || typeof data !== "string" || !isIsoDate(data)) {
        return res.status(400).json({ message: "Nieprawidłowa data (YYYY-MM-DD)" });
    }

    if (notatka && typeof notatka !== "string") {
        return res.status(400).json({ message: "Nieprawidłowa notatka" });
    }

    const style = typeof nazwa_stylu === "string" && nazwa_stylu.trim().length > 0
        ? nazwa_stylu.trim()
        : "RP";

    const ascentId = `srv_${Date.now()}_${userId}`;

    try {
        const routeExists = await query(
            "SELECT 1 FROM Drogi WHERE id_drogi = $1",
            [id_drogi],
        );

        if ((routeExists.rowCount ?? 0) === 0) {
            return res.status(404).json({ message: "Droga o podanym id_drogi nie istnieje" });
        }

        await query(
            `INSERT INTO Przejscia (
                id_przejscia,
                data,
                notatka,
                uri_timeline,
                id_uzytkownika,
                nazwa_stylu,
                id_drogi
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                ascentId,
                data,
                notatka ?? null,
                null,
                userId,
                style,
                id_drogi,
            ],
        );

        return res.status(201).json({
            message: "Przejście zapisane",
            ascent: {
                id_przejscia: ascentId,
                data,
                id_drogi,
                notatka: notatka ?? null,
                nazwa_stylu: style,
                id_uzytkownika: userId,
            },
        });
    } catch (error) {
        console.error("Create ascent error:", error);
        return res.status(500).json({ message: "Błąd serwera podczas zapisu przejścia" });
    }
});

export default router;