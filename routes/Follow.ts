import express, { Request, Response } from "express";
import authenticateAccesJWT from "../utils/authenticateJWT.js";
import { query } from "../db/db.js";

const router = express.Router();

const parseUserIdParam = (value: string | undefined) => {
    if (!value) return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const getSingleParamValue = (value: string | string[] | undefined) => {
    if (Array.isArray(value)) return value[0];
    return value;
};
/**
 * @openapi
 * /follow:
 *   post:
 *     tags:
 *       - Follow
 *     summary: Zaobserwuj użytkownika przez zalogowanego użytkownika
 *     security:
 *       - bearerAuth: []
 * 
 *     responses:
 *       201:
 *         description: Sukces, udało się zaobserwować
 *       409:
 *         description: Już obserwujesz tego użytkownika
 */
router.post(
    "/:userId",
    authenticateAccesJWT,
    async (req: Request, res: Response) => {
        const followerId = (req.user as any).id;
        const followedId = parseUserIdParam(
            getSingleParamValue(req.params.userId),
        );

        if (!followedId) {
            return res
                .status(400)
                .json({ message: "Nieprawidłowe ID użytkownika" });
        }

        if (Number(followerId) === followedId) {
            return res
                .status(400)
                .json({ message: "Nie można obserwować samego siebie" });
        }

        try {
            const userExists = await query(
                "SELECT 1 FROM Uzytkownicy WHERE id_uzytkownika = $1",
                [followedId],
            );

            if ((userExists.rowCount ?? 0) === 0) {
                return res.status(404).json({
                    message: "Użytkownik do obserwowania nie istnieje",
                });
            }

            await query(
                "INSERT INTO Obserwacje (id_obserwujacego, id_obserwowanego) VALUES ($1, $2)",
                [followerId, followedId],
            );

            return res
                .status(201)
                .json({ message: "Użytkownik został zaobserwowany" });
        } catch (error: any) {
            if (error.code === "23505") {
                return res
                    .status(409)
                    .json({ message: "Już obserwujesz tego użytkownika" });
            }

            console.error("Follow error:", error);
            return res
                .status(500)
                .json({ message: "Błąd serwera podczas obserwowania" });
        }
    },
);

router.get(
    "/status/:userId",
    authenticateAccesJWT,
    async (req: Request, res: Response) => {
        const followerId = (req.user as any).id;
        const followedId = parseUserIdParam(
            getSingleParamValue(req.params.userId),
        );

        if (!followedId) {
            return res
                .status(400)
                .json({ message: "Nieprawidłowe ID użytkownika" });
        }

        try {
            const result = await query(
                "SELECT 1 FROM Obserwacje WHERE id_obserwujacego = $1 AND id_obserwowanego = $2",
                [followerId, followedId],
            );

            return res.json({
                isFollowing: (result.rowCount ?? 0) > 0,
            });
        } catch (error) {
            console.error("Follow status error:", error);
            return res.status(500).json({
                message: "Błąd serwera podczas pobierania statusu obserwacji",
            });
        }
    },
);

router.get(
    "/me/following",
    authenticateAccesJWT,
    async (req: Request, res: Response) => {
        const userId = (req.user as any).id;

        try {
            const result = await query(
                `SELECT u.id_uzytkownika, u.login, u.imie, u.nazwisko, o.data_rozpoczecia
             FROM Obserwacje o
             JOIN Uzytkownicy u ON u.id_uzytkownika = o.id_obserwowanego
             WHERE o.id_obserwujacego = $1
             ORDER BY o.data_rozpoczecia DESC`,
                [userId],
            );

            return res.json({
                message: "Pobrano listę obserwowanych",
                count: result.rowCount ?? 0,
                users: result.rows.map((row) => ({
                    id: row.id_uzytkownika,
                    username: row.login,
                    firstName: row.imie,
                    lastName: row.nazwisko,
                    followedAt: row.data_rozpoczecia,
                })),
            });
        } catch (error) {
            console.error("Following list error:", error);
            return res.status(500).json({
                message: "Błąd serwera podczas pobierania obserwowanych",
            });
        }
    },
);

router.get(
    "/me/followers",
    authenticateAccesJWT,
    async (req: Request, res: Response) => {
        const userId = (req.user as any).id;

        try {
            const result = await query(
                `SELECT u.id_uzytkownika, u.login, u.imie, u.nazwisko, o.data_rozpoczecia
             FROM Obserwacje o
             JOIN Uzytkownicy u ON u.id_uzytkownika = o.id_obserwujacego
             WHERE o.id_obserwowanego = $1
             ORDER BY o.data_rozpoczecia DESC`,
                [userId],
            );

            return res.json({
                message: "Pobrano listę obserwujących",
                count: result.rowCount ?? 0,
                users: result.rows.map((row) => ({
                    id: row.id_uzytkownika,
                    username: row.login,
                    firstName: row.imie,
                    lastName: row.nazwisko,
                    followedAt: row.data_rozpoczecia,
                })),
            });
        } catch (error) {
            console.error("Followers list error:", error);
            return res.status(500).json({
                message: "Błąd serwera podczas pobierania obserwujących",
            });
        }
    },
);

router.get(
    "/feed",
    authenticateAccesJWT,
    async (req: Request, res: Response) => {
        const userId = (req.user as any).id;

        try {
            const result = await query(
                `SELECT
                p.id_przejscia,
                p.notatka,
                p.data,
                p.nazwa_stylu,
                d.id_drogi,
                d.nazwa_drogi,
                d.typ_drogi,
                u.id_uzytkownika,
                u.login as username,
                u.imie,
                u.nazwisko,
                COALESCE(ds.skala_linowa, dt.skala_linowa, db.skala_boulderowa) AS wycena,
                EXISTS (
                    SELECT 1 FROM Reakcje r 
                    WHERE r.id_przejscia = p.id_przejscia AND r.id_uzytkownika = $1
                ) AS "isLiked"
             FROM Obserwacje o
             JOIN Przejscia p ON p.id_uzytkownika = o.id_obserwowanego
             JOIN Uzytkownicy u ON u.id_uzytkownika = p.id_uzytkownika
             JOIN Drogi d ON d.id_drogi = p.id_drogi
             LEFT JOIN Drogi_sportowe_szczegoly ds ON ds.id_drogi = d.id_drogi AND d.typ_drogi = 'sportowa'
             LEFT JOIN Trady_szczegoly dt ON dt.id_drogi = d.id_drogi AND d.typ_drogi = 'trad'
             LEFT JOIN Bouldery_szczegoly db ON db.id_drogi = d.id_drogi AND d.typ_drogi = 'boulder'
             WHERE o.id_obserwujacego = $1
             ORDER BY p.data DESC, p.id_przejscia DESC
             LIMIT 50`,
                [userId],
            );
            return res.json({
                message: "Pobrano feed obserwowanych",
                count: result.rowCount ?? 0,
                feed: result.rows,
            });
        } catch (error) {
            console.error("Following feed error:", error);
            return res
                .status(500)
                .json({ message: "Błąd serwera podczas pobierania feedu" });
        }
    },
);

export default router;
