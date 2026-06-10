import express, { Request, Response } from "express";
import authenticateAccesJWT from "../utils/authenticateJWT.js";
import { query } from "../db/db.js";

const router = express.Router();

/**
 * @openapi
 * /notifications:
 *   get:
 *     tags:
 *       - Notifications
 *     summary: Get user notifications
 *     description: Returns a list of notifications (reactions to user's ascents). Can be filtered to show only unread notifications.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: unread
 *         schema:
 *           type: boolean
 *         description: True only unread notifications are returned, False all notifications are returned
 *     responses:
 *       200:
 *         description: List of notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 notifications:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notification'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error during notification retrieval
 */
router.get("/", authenticateAccesJWT, async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any).id;
        const unreadOnly = req.query.unread === "true";

        if (unreadOnly) {
            // Pobieramy reakcje na przejścia zalogowanego użytkownika, których jeszcze nie widział
            const result = await query(
                `SELECT 
                    r.id_uzytkownika,
                    u.login as username,
                    u.imie,
                    u.nazwisko,
                    r.id_przejscia,
                    p.id_drogi,
                    d.nazwa_drogi,
                    r.utworzono as data_reakcji,
					r.wyswietlono
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

/**
 * @openapi
 * /notifications:
 *   patch:
 *     tags:
 *       - Notifications
 *     summary: Mark all notifications as read
 *     description: Updates the status of all unread notifications for the current user to 'read'.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications marked as read
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error during notification update
 */
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
