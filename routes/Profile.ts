import express, { Request, Response } from "express";
import authenticateAccesJWT from "../utils/authenticateJWT.js";
import { query } from "../db/db.js";

const router = express.Router();

// Pobierz profil zalogowanego użytkownika
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
