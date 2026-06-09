import express, { Request, Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { authenticateUser, registerUser, resetUserPassword } from "../services/authService.js";
import { query } from "../db/db.js";
import { validateEmail } from "../utils/vadidateEmail.js";
import { sendResetPasswordEmail } from "../services/emailService.js";

const router = express.Router();

const JWT_ACCESS_EXPIRATION_TIME = process.env.JWT_ACCESS_EXPIRATION_TIME as any;
const JWT_REFRESH_EXPIRATION_TIME = process.env.JWT_REFRESH_EXPIRATION_TIME as any;
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET as any;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as any;

interface JwtPayload {
    id: number | string;
    username: string;
    role: string;
}

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Logowanie użytkownika
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logowanie udane, zwraca accessToken, refreshToken i dane użytkownika
 *       401:
 *         description: Nieprawidłowe dane logowania
 */
router.post("/login", async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Login i hasło są wymagane" });
    }

    try {
        const user = await authenticateUser(username, password);

        const payload = {
            id: user.id,
            username: user.username,
        };

        const accessToken = jwt.sign(payload, JWT_ACCESS_SECRET, {
            expiresIn: JWT_ACCESS_EXPIRATION_TIME,
        });

        const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
            expiresIn: JWT_REFRESH_EXPIRATION_TIME,
        });

        console.log(`LOGIN: User [${user.username}] login successfully`);

        res.json({
            accessToken,
            refreshToken,
            userId: user.id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
        });
    } catch (error: any) {
        if (error.message === "INVALID_CREDENTIALS") {
            console.log(`LOGIN ERROR: ${error.message}`);
            return res.status(401).json({ message: "Nieprawidłowy login lub hasło" });
        }
        res.status(500).json({ message: "Błąd serwera podczas logowania" });
    }
});

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Rejestracja nowego użytkownika
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *               - email
 *               - firstName
 *               - lastName
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               email:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *     responses:
 *       201:
 *         description: Użytkownik zarejestrowany pomyślnie
 *       409:
 *         description: Login lub e-mail już istnieje w bazie
 */
router.post("/register", async (req: Request, res: Response) => {
    const { username, password, firstName, lastName, email } = req.body;

    if (!username || !password || !email || !firstName || !lastName) {
        return res.status(400).json({ message: "All fields are required" });
    }

    try {
        const result = await registerUser({
            username,
            password,
            email,
            firstName,
            lastName,
        });
        console.log(`REGISTER: User [${result.userId}] registered successfully`);

        res.status(201).json({
            message: "User registered successfully",
            userId: result.userId,
        });
    } catch (error: any) {
        console.log(`ERROR REGISTER: ${error.message}`);
        switch (error.message) {
            case "USER_ALREADY_EXISTS":
                return res.status(409).json({
                    message: "USER_ALREADY_EXISTS: Użytkownik o takim loginie już istnieje",
                });
            case "EMAIL_ALREADY_EXISTS":
                return res.status(409).json({
                    message: "EMAIL_ALREADY_EXISTS: Użytkownik o takim adresie e-mail już istnieje",
                });
            case "INVALID_PASSWORD_LENGTH":
                return res.status(400).json({ message: "Hasło musi mieć odpowiednią długość" });
            case "INVALID_EMAIL_FORMAT":
                return res.status(400).json({ message: "Nieprawidłowy format adresu e-mail" });
            default:
                console.error("Registration error:", error);
                res.status(500).json({ message: "Błąd serwera podczas rejestracji" });
        }
    }
});

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Odświeżenie Access Tokena za pomocą Refresh Tokena
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Zwraca nowy Access Token
 *       403:
 *         description: Refresh Token jest nieważny lub wygasł
 */
router.post("/refresh", (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(401).json({ message: "Brak Refresh Tokena" });
    }

    jwt.verify(refreshToken, JWT_REFRESH_SECRET, (err: any, decoded: any) => {
        if (err) {
            console.log("Refresh Token jest nieważny lub wygasł");
            return res.status(403).json({ message: "Refresh Token jest nieważny lub wygasł" });
        }

        const userPayload = decoded as JwtPayload;
        const newPayload = {
            id: userPayload.id,
            username: userPayload.username,
        };

        const newAccessToken = jwt.sign(newPayload, JWT_ACCESS_SECRET, {
            expiresIn: JWT_ACCESS_EXPIRATION_TIME,
        });

        res.json({ accessToken: newAccessToken });
    });
});

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Prośba o reset hasła (wysyłka e-mail)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Informacja o wysłaniu e-maila (nawet jeśli nie istnieje, dla bezpieczeństwa)
 */
router.post("/reset-password", async (req: Request, res: Response) => {
    const { email } = req.body;
    try {
        if (!email) {
            return res.status(400).json({ message: "Email jest wymagany!" });
        }
        if (!validateEmail(email)) {
            return res.status(400).json({ message: "Nieprawidłowy format adresu e-mail" });
        }

        const result = await query(
            "SELECT id_uzytkownika, login, email, imie, nazwisko FROM Uzytkownicy WHERE email = $1",
            [email],
        );

        const user = result.rows[0];
        if (user) {
            const resetToken = crypto.randomBytes(32).toString("hex");
            const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
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
            message: "Jeśli podany adres e-mail istnieje w naszej bazie, wysłaliśmy na niego link do resetu hasła.",
        });
    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ message: "Błąd serwera podczas restartu hasła" });
    }
});

/**
 * @openapi
 * /auth/reset-password/confirm:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Potwierdzenie zmiany hasła za pomocą tokena
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Hasło zostało zmienione
 *       400:
 *         description: Nieprawidłowy lub wygasły token
 */
router.post("/reset-password/confirm", async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;

    try {
        if (!token || !newPassword) {
            return res.status(400).json({ message: "Brak tokenu lub hasła" });
        }
        await resetUserPassword(token, newPassword);

        return res.status(200).json({ message: "Hasło zostało pomyślnie zmienione." });
    } catch (error) {
        console.error("Błąd podczas zapisywania nowego hasła:", error);
        const errorMessage = error instanceof Error ? error.message : "UNKNOWN_ERROR";

        switch (errorMessage) {
            case "INVALID_TOKEN":
                return res.status(400).json({ message: "Link do resetu hasła jest nieprawidłowy." });
            case "EXPIRED_TOKEN":
                return res.status(400).json({ message: "Link do resetu hasła wygasł. Wygeneruj nową prośbę." });
            case "FAILED_UPDATE_USER_PASSWORD":
                return res.status(404).json({ message: "Konto powiązane z tym linkiem już nie istnieje." });
            default:
                return res.status(500).json({ message: "Wystąpił nieoczekiwany błąd serwera. Spróbuj ponownie później." });
        }
    }
});

export default router;
