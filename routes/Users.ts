import express, { Request, Response } from "express";
import authenticateAccesJWT from "../utils/authenticateJWT.js";
import { query } from "../db/db.js";

const router = express.Router();

const parseUserIdParam = (value: string | string[] | undefined) => {
    const val = Array.isArray(value) ? value[0] : value;
    if (!val) return null;
    const parsed = Number.parseInt(val, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

/**
 * @openapi
 * /users:
 *   get:
 *     tags:
 *       - Users
 *     summary: Search for users
 *     description: Search for users by username, first name, or last name.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search phrase (minimum 2 characters)
 *     responses:
 *       200:
 *         description: List of users matching the search criteria
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       400:
 *         description: Search phrase too short
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error during user search
 */
router.get("/", authenticateAccesJWT, async (req: Request, res: Response) => {
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
});

/**
 * @openapi
 * /users/me:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get current user profile
 *     description: Returns the profile of the currently authenticated user.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error during profile retrieval
 */
router.get("/me", authenticateAccesJWT, async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any).id;

        const result = await query(
            "SELECT id_uzytkownika, login, email, imie, nazwisko FROM Uzytkownicy WHERE id_uzytkownika = $1",
            [userId],
        );

        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({ message: "Użytkownik nie znaleziony" });
        }

        res.json({
            message: "Profil pobrany pomyślnie",
            user: {
                userId: user.id_uzytkownika,
                username: user.login,
                email: user.email,
                firstName: user.imie,
                lastName: user.nazwisko,
            },
        });
    } catch (error) {
        console.error("Me profile error:", error);
        res.status(500).json({ message: "Błąd serwera podczas pobierania profilu" });
    }
});

/**
 * @openapi
 * /users/me/feed:
 *   get:
 *     tags:
 *       - Feed
 *     summary: Get user following feed
 *     description: Returns a list of recent ascents from users the current user is following.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Following feed retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 count:
 *                   type: integer
 *                 feed:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Ascent'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error during feed retrieval
 */
router.get("/me/feed", authenticateAccesJWT, async (req: Request, res: Response) => {
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
        return res.status(500).json({ message: "Błąd serwera podczas pobierania feedu" });
    }
});

/**
 * @openapi
 * /users/me/following:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get list of users the current user is following
 *     description: Returns a list of users that the currently authenticated user is following.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of following users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 count:
 *                   type: integer
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error during following list retrieval
 */
router.get("/me/following", authenticateAccesJWT, async (req: Request, res: Response) => {
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
        return res.status(500).json({ message: "Błąd serwera podczas pobierania obserwowanych" });
    }
});

/**
 * @openapi
 * /users/me/followers:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get list of users following the current user
 *     description: Returns a list of users who are following the currently authenticated user.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of followers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 count:
 *                   type: integer
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error during followers list retrieval
 */
router.get("/me/followers", authenticateAccesJWT, async (req: Request, res: Response) => {
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
        return res.status(500).json({ message: "Błąd serwera podczas pobierania obserwujących" });
    }
});

/**
 * @openapi
 * /users/{userId}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user profile by ID
 *     description: Returns the profile of a specific user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error during user data retrieval
 */
router.get("/:userId", authenticateAccesJWT, async (req: Request, res: Response) => {
    try {
        const userId = req.params.userId;

        const result = await query(
            "SELECT id_uzytkownika, login, imie, nazwisko FROM Uzytkownicy WHERE id_uzytkownika = $1",
            [userId],
        );

        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({ message: "Użytkownik nie znaleziony" });
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
        res.status(500).json({ message: "Błąd serwera podczas pobierania danych użytkownika" });
    }
});

/**
 * @openapi
 * /users/{userId}/stats:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user statistics
 *     description: Returns climbing statistics for a specific user, including best ascents and charts.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User statistics
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error during statistics retrieval
 */
router.get("/:userId/stats", authenticateAccesJWT, async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        const result = await query(
            `WITH user_ascents AS (
                SELECT 
                    p.id_przejscia,
                    p.data,
                    p.nazwa_stylu,
                    d.id_drogi,
                    d.typ_drogi,
                    d.nazwa_drogi,
                    COALESCE(ds.skala_linowa, dt.skala_linowa, db.skala_boulderowa) AS wycena
                FROM Przejscia p
                JOIN Drogi d ON p.id_drogi = d.id_drogi
                LEFT JOIN Drogi_sportowe_szczegoly ds ON d.id_drogi = ds.id_drogi
                LEFT JOIN Trady_szczegoly dt ON d.id_drogi = dt.id_drogi
                LEFT JOIN Bouldery_szczegoly db ON d.id_drogi = db.id_drogi
                WHERE p.id_uzytkownika = $1
            ),
            counts AS (
                SELECT 
                    COUNT(*)::INT AS total_count,
                    COUNT(*) FILTER (WHERE typ_drogi = 'sportowa')::INT AS sport_count,
                    COUNT(*) FILTER (WHERE typ_drogi = 'trad')::INT AS trad_count,
                    COUNT(*) FILTER (WHERE typ_drogi = 'boulder')::INT AS boulder_count
                FROM user_ascents
            ),
            best_sport AS (
                SELECT id_przejscia, data, nazwa_stylu, id_drogi, nazwa_drogi, wycena, typ_drogi
                FROM user_ascents 
                WHERE typ_drogi = 'sportowa' AND wycena IS NOT NULL
                ORDER BY wycena DESC, data DESC 
                LIMIT 1
            ),
            best_trad AS (
                SELECT id_przejscia, data, nazwa_stylu, id_drogi, nazwa_drogi, wycena, typ_drogi
                FROM user_ascents 
                WHERE typ_drogi = 'trad' AND wycena IS NOT NULL
                ORDER BY wycena DESC, data DESC 
                LIMIT 1
            ),
            best_boulder AS (
                SELECT id_przejscia, data, nazwa_stylu, id_drogi, nazwa_drogi, wycena, typ_drogi
                FROM user_ascents 
                WHERE typ_drogi = 'boulder' AND wycena IS NOT NULL
                ORDER BY wycena DESC, data DESC 
                LIMIT 1
            ),
            grade_chart AS (
                SELECT 
                    COALESCE(
                        jsonb_agg(jsonb_build_object('label', wycena, 'count', count_per_grade)), 
                        '[]'::jsonb
                    ) AS chart_data
                FROM (
                    SELECT wycena, COUNT(*)::INT AS count_per_grade 
                    FROM user_ascents 
                    WHERE wycena IS NOT NULL
                    GROUP BY wycena 
                    ORDER BY count_per_grade DESC, wycena DESC 	
                ) sub_grades
            ),
            last_8_weeks AS (
                SELECT generate_series(
                    DATE_TRUNC('week', CURRENT_DATE - INTERVAL '7 weeks'),
                    DATE_TRUNC('week', CURRENT_DATE),
                    '1 week'::interval
                )::DATE AS week_start
            ),
            weekly_chart AS (
                SELECT 
                    COALESCE(
                        jsonb_agg(
                            jsonb_build_object(
                                'label', TO_CHAR(l8w.week_start, 'YYYY-MM-DD'), 
                                'count', COALESCE(user_counts.count_per_week, 0)
                            ) ORDER BY l8w.week_start ASC
                        ), 
                        '[]'::jsonb
                    ) AS chart_data
                FROM last_8_weeks l8w
                LEFT JOIN (
                    SELECT 
                        DATE_TRUNC('week', data)::DATE AS week_start, 
                        COUNT(*)::INT AS count_per_week 
                    FROM user_ascents 
                    WHERE data >= DATE_TRUNC('week', CURRENT_DATE - INTERVAL '7 weeks')
                    GROUP BY DATE_TRUNC('week', data)::DATE
                ) user_counts ON l8w.week_start = user_counts.week_start
            )
            SELECT json_build_object(
                'totalCount', COALESCE((SELECT total_count FROM counts), 0),
                'sportCount', COALESCE((SELECT sport_count FROM counts), 0),
                'tradCount', COALESCE((SELECT trad_count FROM counts), 0),
                'boulderCount', COALESCE((SELECT boulder_count FROM counts), 0),
                
                'bestSport', (SELECT jsonb_build_object(
                    'id_przejscia', bs.id_przejscia, 'data', bs.data, 'nazwa_stylu', bs.nazwa_stylu,
                    'id_drogi', bs.id_drogi, 'nazwa_drogi', bs.nazwa_drogi, 'wycena', bs.wycena, 'typ_drogi', bs.typ_drogi
                ) FROM best_sport bs),
                
                'bestTrad', (SELECT jsonb_build_object(
                    'id_przejscia', bt.id_przejscia, 'data', bt.data, 'nazwa_stylu', bt.nazwa_stylu,
                    'id_drogi', bt.id_drogi, 'nazwa_drogi', bt.nazwa_drogi, 'wycena', bt.wycena, 'typ_drogi', bt.typ_drogi
                ) FROM best_trad bt),
                
                'bestBoulder', (SELECT jsonb_build_object(
                    'id_przejscia', bb.id_przejscia, 'data', bb.data, 'nazwa_stylu', bb.nazwa_stylu,
                    'id_drogi', bb.id_drogi, 'nazwa_drogi', bb.nazwa_drogi, 'wycena', bb.wycena, 'typ_drogi', bb.typ_drogi
                ) FROM best_boulder bb),

                'gradeChart', (SELECT chart_data FROM grade_chart),
                'weeklyChart', (SELECT chart_data FROM weekly_chart)
            ) AS stats;`,
            [userId],
        );

        return res.json({
            message: "Pobrano statystyki",
            stats: result.rows[0].stats,
        });
    } catch (error) {
        console.error("Get stats error:", error);
        return res.status(500).json({ message: "Błąd serwera podczas pobierania statystyk" });
    }
});

/**
 * @openapi
 * /users/{userId}/followers:
 *   post:
 *     tags:
 *       - Users
 *     summary: Follow a user
 *     description: Start following a specific user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: User followed successfully
 *       400:
 *         description: Invalid user ID or trying to follow yourself
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User to follow not found
 *       409:
 *         description: Already following this user
 *       500:
 *         description: Server error during follow action
 */
router.post("/:userId/followers", authenticateAccesJWT, async (req: Request, res: Response) => {
    const followerId = (req.user as any).id;
    const followedId = parseUserIdParam(req.params.userId);

    if (!followedId) {
        return res.status(400).json({ message: "Nieprawidłowe ID użytkownika" });
    }

    if (Number(followerId) === followedId) {
        return res.status(400).json({ message: "Nie można obserwować samego siebie" });
    }

    try {
        const userExists = await query(
            "SELECT 1 FROM Uzytkownicy WHERE id_uzytkownika = $1",
            [followedId],
        );

        if ((userExists.rowCount ?? 0) === 0) {
            return res.status(404).json({ message: "Użytkownik do obserwowania nie istnieje" });
        }

        await query(
            "INSERT INTO Obserwacje (id_obserwujacego, id_obserwowanego) VALUES ($1, $2)",
            [followerId, followedId],
        );

        return res.status(201).json({ message: "Użytkownik został zaobserwowany" });
    } catch (error: any) {
        if (error.code === "23505") {
            return res.status(409).json({ message: "Już obserwujesz tego użytkownika" });
        }
        console.error("Follow error:", error);
        return res.status(500).json({ message: "Błąd serwera podczas obserwowania" });
    }
});

/**
 * @openapi
 * /users/{userId}/followers:
 *   delete:
 *     tags:
 *       - Users
 *     summary: Unfollow a user
 *     description: Stop following a specific user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Unfollowed successfully
 *       400:
 *         description: Invalid user ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not following this user
 *       500:
 *         description: Server error during unfollow action
 */
router.delete("/:userId/followers", authenticateAccesJWT, async (req: Request, res: Response) => {
    const followerId = (req.user as any).id;
    const followedId = parseUserIdParam(req.params.userId);

    if (!followedId) {
        return res.status(400).json({ message: "Nieprawidłowe ID użytkownika" });
    }

    try {
        const result = await query(
            "DELETE FROM Obserwacje WHERE id_obserwujacego = $1 AND id_obserwowanego = $2",
            [followerId, followedId],
        );

        if ((result.rowCount ?? 0) === 0) {
            return res.status(404).json({ message: "Nie obserwujesz tego użytkownika" });
        }

        return res.json({ message: "Przestano obserwować użytkownika" });
    } catch (error) {
        console.error("Unfollow error:", error);
        return res.status(500).json({ message: "Błąd serwera podczas cofania obserwacji" });
    }
});

/**
 * @openapi
 * /users/{userId}/followers/me:
 *   get:
 *     tags:
 *       - Users
 *     summary: Check follow status
 *     description: Checks if the current user is following the specified user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Follow status
 *       400:
 *         description: Invalid user ID
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error during follow status check
 */
router.get("/:userId/followers/me", authenticateAccesJWT, async (req: Request, res: Response) => {
    const followerId = (req.user as any).id;
    const followedId = parseUserIdParam(req.params.userId);

    if (!followedId) {
        return res.status(400).json({ message: "Nieprawidłowe ID użytkownika" });
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
        return res.status(500).json({ message: "Błąd serwera podczas sprawdzania statusu" });
    }
});

export default router;
