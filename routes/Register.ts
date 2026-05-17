import express, { Request, Response } from "express";
import { registerUser } from "../services/authService.js";

const router = express.Router();

router.post("/", async (req: Request, res: Response) => {
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
        console.log(
            `REGISTER: User [${result.userId}] registered successfully`,
        );

        res.status(201).json({
            message: "User registered successfully",
            userId: result.userId,
        });
    } catch (error: any) {
        console.log(`ERROR REGISTER: ${error.message}`);
        switch (error.message) {
            case "USER_ALREADY_EXISTS":
                return res.status(409).json({
                    message: "Użytkownik o takim loginie już istnieje",
                });
            case "EMAIL_ALREADY_EXISTS":
                return res.status(409).json({
                    message: "Użytkownik o takim adresie e-mail już istnieje",
                });
            case "INVALID_PASSWORD_LENGTH":
                return res
                    .status(400)
                    .json({ message: "Hasło musi mieć odpowiednią długość" });
            case "INVALID_EMAIL_FORMAT":
                return res
                    .status(400)
                    .json({ message: "Nieprawidłowy format adresu e-mail" });
            default:
                console.error("Registration error:", error);
                res.status(500).json({
                    message: "Błąd serwera podczas rejestracji",
                });
        }
    }
});

export default router;
