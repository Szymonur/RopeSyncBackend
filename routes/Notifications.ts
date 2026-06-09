import express, { Request, Response } from "express";
import authenticateAccesJWT from "../utils/authenticateJWT.js";
import { query } from "../db/db.js";

const router = express.Router();

// GET /notifications
// Można filtrować: GET /notifications?unread=true
router.get("/", authenticateAccesJWT, async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any).id;
        const unreadOnly = req.query.unread === "true";

        if (unreadOnly) {
            // Pobieramy reakcje na przejścia zalogowanego użytkownika, których jeszcze nie widział
            const result = await query(
                `SELECT 
                    r.id_uzytkownika AS "reactorId",
                    u.login AS "reactorUsername",
                    u.imie AS "reactorFirstName",
                    u.nazwisko AS "reactorLastName",
                    r.id_przejscia AS "ascentId",
                    p.id_drogi AS "routeId",
                    d.nazwa_drogi AS "routeName",
                    r.utworzono AS "createdAt"
                 FROM Reakcje r
                 JOIN Przejscia p ON r.id_przejscia = p.id_przejscia
                 JOIN Uzytkownicy u ON r.id_uzytkownika = u.id_uzytkownika
                 JOIN Drogi d ON p.id_drogi = d.id_drogi
                 WHERE p.id_uzytkownika = $1 
                   AND r.wyswietlono = 0
                   AND r.id_uzytkownika <> $1
                 ORDER BY r.utworzono DESC`,
                [userId],
            );

            return res.json({
                message: "Pobrano nieodczytane powiadomienia",
                notifications: result.rows,
            });
        } else {
            // Pobieramy wszystkie reakcje na przejścia zalogowanego użytkownika
            const result = await query(
                `SELECT 
                    r.id_uzytkownika,
                    u.login AS username, 
                    u.imie,
                    u.nazwisko,
                    r.id_przejscia,
                    p.id_drogi,
                    d.nazwa_drogi,
                    r.utworzono AS data_reakcji,
                    r.wyswietlono
                 FROM Reakcje r
                 JOIN Przejscia p ON r.id_przejscia = p.id_przejscia
                 JOIN Uzytkownicy u ON r.id_uzytkownika = u.id_uzytkownika
                 JOIN Drogi d ON p.id_drogi = d.id_drogi
                 WHERE p.id_uzytkownika = $1 
                   AND r.id_uzytkownika <> $1
                 ORDER BY r.utworzono DESC`,
                [userId],
            );
            
            return res.json({
                message: "Pobrano powiadomienia",
                notifications: result.rows,
            });
        }
    } catch (error) {
        console.error("Get notifications error:", error);
        return res.status(500).json({
            message: "Błąd serwera podczas pobierania powiadomień",
        });
    }
});

// PATCH /notifications
// Oznacz wszystkie powiadomienia jako odczytane
router.patch("/", authenticateAccesJWT, async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any).id;

        await query(
            `UPDATE Reakcje
             SET wyswietlono = 1
             WHERE id_przejscia IN (
                 SELECT id_przejscia FROM Przejscia WHERE id_uzytkownika = $1
             ) AND wyswietlono = 0`,
            [userId],
        );

        return res.json({
            message: "Oznaczono powiadomienia jako odczytane",
        });
    } catch (error) {
        console.error("Mark notifications read error:", error);
        return res.status(500).json({
            message: "Błąd serwera podczas aktualizacji powiadomień",
        });
    }
});

export default router;
