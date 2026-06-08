import express, { Request, Response } from "express";
import authenticateAccesJWT from "../utils/authenticateJWT.js";
import { query } from "../db/db.js";

const router = express.Router();


router.get("/", authenticateAccesJWT, async (_req: Request, res: Response) => {
	const { nazwa_drogi, skala, typ_drogi } = _req.query;
    const queryText = `
        SELECT 
            d.id_drogi,
            d.typ_drogi,
            d.nazwa_drogi,
            s.nazwa_skaly,
            COALESCE(ds.skala_linowa, dt.skala_linowa, db.skala_boulderowa) AS wycena,
            r.nazwa_rejonu
        FROM Drogi d
        JOIN Skaly s ON d.id_skaly = s.id_skaly
        JOIN Sektory sek ON s.id_sektoru = sek.id_sektoru
        JOIN Rejony r ON sek.id_rejonu = r.id_rejonu
        LEFT JOIN Drogi_sportowe_szczegoly ds ON d.id_drogi = ds.id_drogi
        LEFT JOIN Trady_szczegoly dt ON d.id_drogi = dt.id_drogi
        LEFT JOIN Bouldery_szczegoly db ON d.id_drogi = db.id_drogi
        WHERE 
            ($1::TEXT IS NULL OR d.nazwa_drogi ILIKE '%' || $1 || '%')
            AND ($2::TEXT IS NULL OR COALESCE(ds.skala_linowa, dt.skala_linowa, db.skala_boulderowa) = $2)
            AND ($3::TEXT IS NULL OR d.typ_drogi = $3);
    `;

    try {
        const values = [
            nazwa_drogi || null,
            skala || null,
            typ_drogi || null
        ];
        const result = await query(queryText, values);
        res.json(result.rows); 
    } catch (error) {
        console.error("Error fetching filtered routes:", error);
        res.status(500).json({ message: "Błąd serwera podczas pobierania dróg" });
    }
});


export default router;
