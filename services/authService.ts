import argon2 from "argon2";
import crypto from "crypto";
import { query } from "../db/db.js";

export const registerUser = async (userData: {
    username: string;
    password: string;
    email: string;
    firstName: string;
    lastName: string;
}) => {
    const { username, password, email, firstName, lastName } = userData;
    const salt = crypto.randomBytes(16).toString("hex");
    const hashedPassword = await argon2.hash(password + salt, {
        type: argon2.argon2id,
    });

    try {
        const result = await query(
            `INSERT INTO Uzytkownicy (login, email, haslo, sol, imie, nazwisko) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_uzytkownika`,
            [username, email, hashedPassword, salt, firstName, lastName],
        );

        return {
            success: true,
            userId: result.rows[0].id_uzytkownika,
        };
    } catch (error: any) {
        if (error.code === "23505") {
            if (error.detail.includes("login"))
                throw new Error("USER_ALREADY_EXISTS");
            if (error.detail.includes("email"))
                throw new Error("EMAIL_ALREADY_EXISTS");
        }
        if (error.code === "23514") {
            if (error.constraint === "check_password_length")
                throw new Error("INVALID_PASSWORD_LENGTH");
            if (error.constraint === "check_email_format")
                throw new Error("INVALID_EMAIL_FORMAT");
        }
        throw error;
    }
};

export const authenticateUser = async (login: string, password: string) => {
    const result = await query(
        "SELECT id_uzytkownika, login, haslo, sol FROM Uzytkownicy WHERE login = $1",
        [login],
    );

    const user = result.rows[0];
    if (!user) {
        throw new Error("INVALID_CREDENTIALS");
    }

    // Weryfikacja: argon2.verify(hash, hasło + sól)
    const isPasswordValid = await argon2.verify(
        user.haslo,
        password + user.sol,
    );

    if (!isPasswordValid) {
        throw new Error("INVALID_CREDENTIALS");
    }

    return {
        id: user.id_uzytkownika,
        username: user.login,
    };
};
