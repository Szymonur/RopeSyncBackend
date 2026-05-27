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

export default router;
