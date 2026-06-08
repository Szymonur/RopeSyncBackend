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

router.get(
    "/:userId/stats",
    authenticateAccesJWT,
    async (req: Request, res: Response) => {
        try {
			const { userId } = req.params;

            const result = await query(
                `WITH user_ascents AS (
					-- Pobieramy wszystkie przejścia użytkownika wraz z wycenami
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
					-- Liczymy statystyki ogólne
					SELECT 
						COUNT(*)::INT AS total_count,
						COUNT(*) FILTER (WHERE typ_drogi = 'sportowa')::INT AS sport_count,
						COUNT(*) FILTER (WHERE typ_drogi = 'trad')::INT AS trad_count,
						COUNT(*) FILTER (WHERE typ_drogi = 'boulder')::INT AS boulder_count
					FROM user_ascents
				),
				best_sport AS (
					-- Szukamy najlepszego sportowego (sortowanie alfabetyczne po wycenie)
					SELECT id_przejscia, data, nazwa_stylu, id_drogi, nazwa_drogi, wycena, typ_drogi
					FROM user_ascents 
					WHERE typ_drogi = 'sportowa' AND wycena IS NOT NULL
					ORDER BY wycena DESC, data DESC 
					LIMIT 1
				),
				best_trad AS (
					-- Najlepszy trad
					SELECT id_przejscia, data, nazwa_stylu, id_drogi, nazwa_drogi, wycena, typ_drogi
					FROM user_ascents 
					WHERE typ_drogi = 'trad' AND wycena IS NOT NULL
					ORDER BY wycena DESC, data DESC 
					LIMIT 1
				),
				best_boulder AS (
					-- Najlepszy boulder
					SELECT id_przejscia, data, nazwa_stylu, id_drogi, nazwa_drogi, wycena, typ_drogi
					FROM user_ascents 
					WHERE typ_drogi = 'boulder' AND wycena IS NOT NULL
					ORDER BY wycena DESC, data DESC 
					LIMIT 1
				),
				grade_chart AS (
					-- Grupujemy przejścia po wycenie do wykresu
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
					-- Generujemy stały szkielet 8 tygodni (od 7 tygodni wstecz do obecnego tygodnia)
					SELECT generate_series(
						DATE_TRUNC('week', CURRENT_DATE - INTERVAL '7 weeks'),
						DATE_TRUNC('week', CURRENT_DATE),
						'1 week'::interval
					)::DATE AS week_start
				),
				weekly_chart AS (
					-- Złączamy szkielet z Twoimi danymi z bazy
					SELECT 
						COALESCE(
							jsonb_agg(
								jsonb_build_object(
									'label', TO_CHAR(l8w.week_start, 'YYYY-MM-DD'), 
									'count', COALESCE(user_counts.count_per_week, 0) -- Jeśli null (brak przejść), dajemy 0
								) ORDER BY l8w.week_start ASC -- Gwarantuje odpowiednią chronologię w tablicy JSON!
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
				-- Składamy wszystko w jeden JSON odpowiadający interfejsowi UserStats
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
            return res.status(500).json({
                message: "Błąd serwera podczas pobierania statystyk",
            });
        }
    },
);

export default router;
