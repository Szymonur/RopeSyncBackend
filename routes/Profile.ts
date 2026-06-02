import express, { Request, Response } from "express";
import authenticateAccesJWT from "../utils/authenticateJWT.js";
import { query } from "../db/db.js";

const router = express.Router();

// Wyszukiwanie użytkowników pod listę obserwowania
router.get(
    "/search/users",
    authenticateAccesJWT,
    async (req: Request, res: Response) => {
        try {
            const requesterId = (req.user as any).id;
            const phrase = ((req.query.q as string | undefined) ?? "").trim();

            if (phrase.length < 2) {
                return res.status(400).json({
                    message: "Wyszukiwanie wymaga minimum 2 znaków",
                });
            }

            const result = await query(
                `SELECT
                    u.id_uzytkownika,
                    u.login,
                    u.imie,
                    u.nazwisko,
                    EXISTS (
                        SELECT 1
                        FROM Obserwacje o
                        WHERE o.id_obserwujacego = $1
                          AND o.id_obserwowanego = u.id_uzytkownika
                    ) AS "isFollowing"
                 FROM Uzytkownicy u
                 WHERE u.id_uzytkownika <> $1
                   AND (
                       u.login ILIKE $2
                       OR u.imie ILIKE $2
                       OR u.nazwisko ILIKE $2
                   )
                 ORDER BY u.login ASC
                 LIMIT 25`,
                [requesterId, `%${phrase}%`],
            );

            return res.json({
                message: "Lista użytkowników pobrana",
                users: result.rows.map((row) => ({
                    id: row.id_uzytkownika,
                    username: row.login,
                    firstName: row.imie,
                    lastName: row.nazwisko,
                    isFollowing: row.isFollowing,
                })),
            });
        } catch (error) {
            console.error("User search error:", error);
            return res.status(500).json({
                message: "Błąd serwera podczas wyszukiwania użytkowników",
            });
        }
    },
);

// Pobierz profil zalogowanego użytkownika
//tu ten authenticate ogarnia autoryzacje
router.get("/", authenticateAccesJWT, async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any).id;

        const result = await query(
            "SELECT id_uzytkownika, login, email, imie, nazwisko FROM Uzytkownicy WHERE id_uzytkownika = $1",
            [userId],
        );

        const user = result.rows[0];

        if (!user) {
            return res
                .status(404)
                .json({ message: "Użytkownik nie znaleziony" });
        }

        res.json({
            message: "Profil pobrany pomyślnie",
            user: {
                id: user.id_uzytkownika,
                username: user.login,
                email: user.email,
                firstName: user.imie,
                lastName: user.nazwisko,
            },
        });
    } catch (error) {
        console.error("Profile error:", error);
        res.status(500).json({
            message: "Błąd serwera podczas pobierania profilu",
        });
    }
});

// Pobierz profil konkretnego użytkownika po ID
router.get(
    "/:id",
    authenticateAccesJWT,
    async (req: Request, res: Response) => {
        try {
            const userId = req.params.id;

            const result = await query(
                "SELECT id_uzytkownika, login, imie, nazwisko FROM Uzytkownicy WHERE id_uzytkownika = $1",
                [userId],
            );

            const user = result.rows[0];

            if (!user) {
                return res
                    .status(404)
                    .json({ message: "Użytkownik nie znaleziony" });
            }

            res.json({
                message: "Profil użytkownika pobrany",
                user: {
                    id: user.id_uzytkownika,
                    username: user.login,
                    firstName: user.imie,
                    lastName: user.nazwisko,
                },
            });
        } catch (error) {
            console.error("Get user error:", error);
            res.status(500).json({
                message: "Błąd serwera podczas pobierania danych użytkownika",
            });
        }
    },
);

// Pobierz nieodczytane reakcje na moje przejścia
router.get(
    "/reactions/unread",
    authenticateAccesJWT,
    async (req: Request, res: Response) => {
        try {
            const userId = (req.user as any).id;

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
                message: "Pobrano nieodczytane reakcje",
                reactions: result.rows,
            });
        } catch (error) {
            console.error("Get unread reactions error:", error);
            return res.status(500).json({
                message: "Błąd serwera podczas pobierania powiadomień",
            });
        }
    },
);

// Oznacz wszystkie reakcje na moje przejścia jako odczytane
router.post(
    "/reactions/mark-read",
    authenticateAccesJWT,
    async (req: Request, res: Response) => {
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
            console.error("Mark reactions read error:", error);
            return res.status(500).json({
                message: "Błąd serwera podczas aktualizacji powiadomień",
            });
        }
    },
);

export default router;
