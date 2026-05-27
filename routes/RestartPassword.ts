import express, { Request, Response } from "express";
import { query } from "../db/db.js";
import { validateEmail } from "../utils/vadidateEmail.js";

const router = express.Router();

router.post("/", async (req: Request, res: Response) => {
    const { email } = req.body;
    try {
        if (!email) {
            return res.status(400).json({ message: "Email jest wymagany!" });
        }
        if (!validateEmail(email)) {
            return res
                .status(400)
                .json({ message: "Nieprawidłowy format adresu e-mail" });
        }

        const result = await query(
            "SELECT id_uzytkownika, login, email, imie, nazwisko FROM Uzytkownicy WHERE email = $1",
            [email],
        );

        const user = result.rows[0];
        if (user) {
            console.log(`Wysyłam email z resetem do: ${email}`);
        } else {
            console.warn(`Próba resetu dla nieistniejącego emaila: ${email}`);
        }
        return res.status(200).json({
            message:
                "Jeśli podany adres e-mail istnieje w naszej bazie, wysłaliśmy na niego link do resetu hasła.",
        });
    } catch (error) {
        console.error("Restart passwrod error:", error);
        res.status(500).json({
            message: "Błąd serwera podczas restartu hasła",
        });
    }
});

export default router;
