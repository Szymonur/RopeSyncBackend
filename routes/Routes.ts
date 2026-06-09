import express, { Request, Response } from "express";
import authenticateAccesJWT from "../utils/authenticateJWT.js";
import { query } from "../db/db.js";

const router = express.Router();


router.get("/", authenticateAccesJWT, async (_req: Request, res: Response) => {
	const { nazwa_drogi, skala, typ_drogi, id_sektoru } = _req.query;
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
            AND ($3::TEXT IS NULL OR d.typ_drogi = $3)
            AND ($4::TEXT IS NULL OR sek.id_sektoru = $4::INTEGER);`;
    try {
        const values = [
            nazwa_drogi || null,
            skala || null,
            typ_drogi || null,
			id_sektoru || null
        ];
        const result = await query(queryText, values);
		
        res.json(result.rows); 
    } catch (error) {
        console.error("Error fetching filtered routes:", error);
        res.status(500).json({ message: "Błąd serwera podczas pobierania dróg" });
    }
});
router.get("/search", authenticateAccesJWT, async (req: Request, res: Response) => {
	try {
		const searchQuery = typeof req.query.query === "string" ? req.query.query : "";
		if (!searchQuery) {
			return res.json({ routes: [] });
		}
		const result = await query(`
			SELECT d.id_drogi, d.typ_drogi, d.nazwa_drogi, sk.nazwa_skaly, 
			COALESCE(ds.skala_linowa, dt.skala_linowa, db.skala_boulderowa) AS skala
			FROM drogi d
			JOIN Skaly sk ON sk.id_skaly = d.id_skaly
			LEFT JOIN Drogi_sportowe_szczegoly ds ON d.id_drogi = ds.id_drogi
            LEFT JOIN Trady_szczegoly dt ON d.id_drogi = dt.id_drogi
            LEFT JOIN Bouldery_szczegoly db ON d.id_drogi = db.id_drogi
			WHERE d.nazwa_drogi ILIKE $1
		`, [`%${searchQuery}%`]);
		res.json({ routes: result.rows });

	} catch (error) {
		console.error("Error searching routes:", error);
		res.status(500).json({ message: "Internal server error" });
	}
});

router.get("/:id", authenticateAccesJWT, async (req: Request, res: Response) => {
    try {
        const routeId = req.params.id;
        const queryText = `
            SELECT 
                d.id_drogi,
                d.typ_drogi,
                d.nazwa_drogi,
                d.opis,
                s.nazwa_skaly,
                sek.nazwa_sektoru,
                r.nazwa_rejonu,
                COALESCE(ds.skala_linowa, dt.skala_linowa, db.skala_boulderowa) AS skala,
                ds.dlugosc_drogi,
                ds.liczba_ringow,
                ds.stanowisko,
                dt.czy_stanowiska,
                dt.potrzebny_sprzet,
                db.wysokosc,
                db.liczba_potrzebnych_crashpadow
            FROM Drogi d
            JOIN Skaly s ON d.id_skaly = s.id_skaly
            JOIN Sektory sek ON s.id_sektoru = sek.id_sektoru
            JOIN Rejony r ON sek.id_rejonu = r.id_rejonu
            LEFT JOIN Drogi_sportowe_szczegoly ds ON d.id_drogi = ds.id_drogi
            LEFT JOIN Trady_szczegoly dt ON d.id_drogi = dt.id_drogi
            LEFT JOIN Bouldery_szczegoly db ON d.id_drogi = db.id_drogi
            WHERE d.id_drogi = $1;
        `;
        
        const result = await query(queryText, [routeId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Nie znaleziono drogi" });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error fetching route details:", error);
	}
});




export default router;
