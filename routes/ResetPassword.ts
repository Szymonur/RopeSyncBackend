import express, { Request, Response } from "express";
import crypto from "crypto";
import { query } from "../db/db.js";
import { validateEmail } from "../utils/vadidateEmail.js";
import { sendResetPasswordEmail } from "../services/emailService.js";
import { resetUserPassword } from "../services/authService.js";

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
            const resetToken = crypto.randomBytes(32).toString("hex");
            const hashedToken = crypto
                .createHash("sha256")
                .update(resetToken)
                .digest("hex");
            const tokenExpiry = new Date(Date.now() + 60 * 15 * 1000);

            sendResetPasswordEmail(email, resetToken).catch((err) => {
                console.error("Failed to send email inside route:", err);
            });

            await query(
                "INSERT INTO Tokeny_resetu (id_uzytkownika, token, wygasa) VALUES ($1, $2, $3)",
                [user.id_uzytkownika, hashedToken, tokenExpiry],
            );
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

router.post("/confirm", async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;

    try {
        if (!token || !newPassword) {
            return res.status(400).json({ message: "Brak tokenu lub hasła" });
        }
        await resetUserPassword(token, newPassword);

        return res
            .status(200)
            .json({ message: "Hasło zostało pomyślnie zmienione." });
    } catch (error) {
        console.error("Błąd podczas zapisywania nowego hasła:", error);
        const errorMessage =
            error instanceof Error ? error.message : "UNKNOWN_ERROR";

        switch (errorMessage) {
            case "INVALID_TOKEN":
                return res.status(400).json({
                    message: "Link do resetu hasła jest nieprawidłowy.",
                });

            case "EXPIRED_TOKEN":
                return res.status(400).json({
                    message:
                        "Link do resetu hasła wygasł. Wygeneruj nową prośbę.",
                });

            case "FAILED_UPDATE_USER_PASSWORD":
                return res.status(404).json({
                    message: "Konto powiązane z tym linkiem już nie istnieje.",
                });

            default:
                return res.status(500).json({
                    message:
                        "Wystąpił nieoczekiwany błąd serwera. Spróbuj ponownie później.",
                });
        }
    }
});

export default router;
