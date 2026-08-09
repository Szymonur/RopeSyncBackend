import "dotenv/config";
import pool from "./db.js";
import argon2 from "argon2"; // Zamiast bcrypt importujemy argon2

const seedSql = `
INSERT INTO Typy_skaly (materia) VALUES
  ('Wapien'),
  ('Granit'),
  ('Piaskowiec')
ON CONFLICT (materia) DO NOTHING;

INSERT INTO Style_przejscia (nazwa_stylu) VALUES
  ('OS'), ('Flash'), ('RP'), ('AF'), ('TR')
ON CONFLICT (nazwa_stylu) DO NOTHING;

INSERT INTO Skale_linowe (francuska, kurtyki, yds, przymiotnikowa) VALUES
  ('5a', 'V', '5.7', 'Trudna'),
  ('5c', 'VI', '5.9', 'Bardzo Trudna'),
  ('6a', 'VI+', '5.10a', 'Niezwykle Trudna'),
  ('6a+', 'VI.1', '5.10c', 'Skrajnie Trudna'),
  ('6b', 'VI.1+', '5.10d', 'Skrajnie Trudna'),
  ('6c', 'VI.2', '5.11b', 'Skrajnie Trudna'),
  ('7a', 'VI.2+', '5.11d', 'Skrajnie Trudna'),
  ('7b', 'VI.3', '5.12b', 'Skrajnie Trudna'),
  ('7c', 'VI.4', '5.12d', 'Skrajnie Trudna'),
  ('8a', 'VI.5', '5.13b', 'Skrajnie Trudna'),
  ('9a', 'VI.7', '5.14d', 'Ekstremalna')
ON CONFLICT (francuska) DO NOTHING;

INSERT INTO Skale_boulderowe (font, hueco, krakowska_boulderowa) VALUES
  ('5', 'V1', 'V'),
  ('6a', 'V3', 'VI.1'),
  ('6b', 'V4', 'VI.2'),
  ('6c', 'V5', 'VI.3'),
  ('7a', 'V6', 'VI.4'),
  ('7c', 'V9', 'VI.5'),
  ('8a', 'V11', 'VI.6')
ON CONFLICT (font) DO NOTHING;

INSERT INTO Rejony (id_rejonu, nazwa_rejonu, kraj, szerokosc_geograficzna, dlugosc_geograficzna) VALUES
  (1, 'Jura Poludniowa', 'Polska', 50.2, 19.8),
  (2, 'Jura Polnocna', 'Polska', 50.6, 19.5),
  (3, 'Sokoliki', 'Polska', 50.8, 15.8),
  (4, 'Tatry Wysokie', 'Polska', 49.2, 20.0),
  (5, 'Pogorze Roznowskie', 'Polska', 49.8, 20.9)
ON CONFLICT (id_rejonu) DO NOTHING;

INSERT INTO Sektory (id_sektoru, nazwa_sektoru, id_rejonu, szerokosc_geograficzna, dlugosc_geograficzna) VALUES
  (1, 'Dolina Bedkowska', 1, 50.16, 19.74),
  (2, 'Gora Zborow', 2, 50.57, 19.53),
  (3, 'Sokolik Duzy', 3, 50.87, 15.86),
  (4, 'Dolina Rybiego Potoku', 4, 49.19, 20.05),
  (5, 'Rezerwat Ciezkowice', 5, 49.78, 20.96)
ON CONFLICT (id_sektoru) DO NOTHING;

INSERT INTO Skaly (id_skaly, id_sektoru, nazwa_skaly, szerokosc_geograficzna, dlugosc_geograficzna, czy_zakaz, opiekun, materia) VALUES
  (1, 1, 'Sokolica', 50.1682, 19.7431, false, 'Nasze Skaly', 'Wapien'),
  (2, 1, 'Dupa Slonia', 50.1711, 19.7455, false, 'Nasze Skaly', 'Wapien'),
  (3, 2, 'Mlynarz', 50.5753, 19.5312, false, NULL, 'Wapien'),
  (4, 3, 'Krzywa Turnia', 50.8715, 15.8671, false, 'Dolnoslaski Zwiazek Alpinizmu', 'Granit'),
  (5, 3, 'Sukiennice', 50.8702, 15.8690, false, NULL, 'Granit'),
  (6, 4, 'Mnich', 49.1963, 20.0531, false, 'TPN', 'Granit'),
  (7, 5, 'Ratusz', 49.7845, 20.9632, false, NULL, 'Piaskowiec')
ON CONFLICT (id_skaly) DO NOTHING;

INSERT INTO Drogi (id_drogi, typ_drogi, nazwa_drogi, id_skaly, data_utworzenia, opis) VALUES
  ('d_s1', 'sportowa', 'Bedkowski Playboy', 1, '1994-05-01', 'Klasyk na Sokolicy.'),
  ('d_s2', 'sportowa', 'Lewy Filar', 2, '1985-06-12', 'Techniczna rysa i plyta.'),
  ('d_s3', 'sportowa', 'Chomeini', 2, '1990-08-01', 'Twardy crux na starcie.'),
  ('d_t1', 'trad', 'Rysa Kurtyki', 4, '1970-04-10', 'Klasyczny trad.'),
  ('d_s4', 'sportowa', 'Krew i Pot', 5, '1995-09-10', 'Techniczne wspinanie.'),
  ('d_t2', 'trad', 'Droga Robakiewicza', 6, '1954-07-20', 'Popularny klasyk na Mnichu.'),
  ('d_t3', 'trad', 'Miedzymiastowa', 6, '1980-08-15', 'Wielowyciagowy klasyk.'),
  ('d_b1', 'boulder', 'Krew z Nosa', 7, '2005-05-05', 'Mocny start i dynamiczne wyjscie.'),
  ('d_b2', 'boulder', 'Czysta Formalnosc', 7, '2010-09-12', 'Techniczny pion.')
ON CONFLICT (id_drogi) DO NOTHING;

INSERT INTO Drogi_sportowe_szczegoly (id_drogi, dlugosc_drogi, liczba_ringow, stanowisko, skala_linowa) VALUES
  ('d_s1', 25, 11, 'Ring zjazdowy (RZ)', '7c'),
  ('d_s2', 18, 7, 'Dwa ringi z lancuchem', '6b'),
  ('d_s3', 20, 8, 'Dwa ringi z lancuchem', '7b'),
  ('d_s4', 15, 6, 'Lancuch zjazdowy', '6c')
ON CONFLICT (id_drogi) DO NOTHING;

INSERT INTO Trady_szczegoly (id_drogi, dlugosc_drogi, czy_stanowiska, potrzebny_sprzet, skala_linowa) VALUES
  ('d_t1', 20, true, 'Set kosci i friendy', '6a+'),
  ('d_t2', 140, true, 'Set friendow i kosci', '5c'),
  ('d_t3', 150, true, 'Set friendow, set kosci', '6a+')
ON CONFLICT (id_drogi) DO NOTHING;

INSERT INTO Bouldery_szczegoly (id_drogi, wysokosc, liczba_potrzebnych_crashpadow, skala_boulderowa) VALUES
  ('d_b1', 4.5, 3, '7a'),
  ('d_b2', 3.8, 2, '6c')
ON CONFLICT (id_drogi) DO NOTHING;
`;

const seed = async () => {
  try {
    await pool.query("BEGIN");
    await pool.query(seedSql);

    // Generujemy prawdziwy hash za pomocą argon2 dla testowego hasła
    const plainPassword = "Password1!";
	const dummySalt = "salt_string_12345";
    const hashedPassword = await argon2.hash( plainPassword  + dummySalt, {
        type: argon2.argon2id,
    })
     // Wypełnienie kolumny sol (jeśli trzymasz ją osobno)

    await pool.query(
      `INSERT INTO Uzytkownicy (id_uzytkownika, login, email, haslo, sol, imie, nazwisko) VALUES
        (1, 'szymon_climber', 'szymon@ropesync.test', $1, $2, 'Szymon', 'Urban'),
        (2, 'kasia_alpinistka', 'kasia@ropesync.test', $1, $2, 'Katarzyna', 'Nowak'),
        (3, 'michal_crag', 'michal@ropesync.test', $1, $2, 'Michał', 'Kowalski')
       ON CONFLICT (id_uzytkownika) DO UPDATE 
       SET haslo = EXCLUDED.haslo;`,
      [hashedPassword, dummySalt]
    );

    await pool.query(`
      INSERT INTO Obserwacje (id_obserwujacego, id_obserwowanego) VALUES
        (1, 2),
        (1, 3)
      ON CONFLICT DO NOTHING;
    `);

    await pool.query(`
      INSERT INTO Przejscia (id_przejscia, data, timeline_data, notatka, id_uzytkownika, nazwa_stylu, id_drogi) VALUES
        (
          'p_1', 
          '2025-03-16', 
          '{
            "timeline": [
              {"timestamp": 40, "height": 1.8, "events": [{"type": "clip", "clipingTime": 1.3, "force": 0.04, "belayRate": 9}]},
              {"timestamp": 120, "height": 6.3, "events": [{"type": "clip", "clipingTime": 2, "force": 0.12, "belayRate": 7}]},
              {"timestamp": 450, "height": 10.3, "events": [{"type": "fall", "force": 1.3, "duration": 2.5, "fallenDisnace": 4.1}]},
              {"timestamp": 600, "height": 16.3, "events": [{"type": "clip", "clipingTime": 2, "force": 0.4, "belayRate": 2}]},
              {"timestamp": 980, "height": 20.8, "events": [{"type": "anchor"}]}
            ]
          }'::jsonb,
          'Mocne przejście z małym lotem w połowie.',
          1, 
          'RP', 
          'd_s1'
        ),
        (
          'p_2', 
          '2025-04-02', 
          '{
            "timeline": [
              {"timestamp": 30, "height": 2.0, "events": [{"type": "clip", "clipingTime": 1.0, "force": 0.02, "belayRate": 5}]},
              {"timestamp": 150, "height": 9.5, "events": [{"type": "clip", "clipingTime": 1.5, "force": 0.08, "belayRate": 6}]},
              {"timestamp": 420, "height": 18.0, "events": [{"type": "anchor"}]}
            ]
          }'::jsonb,
          'Czysty flesz / OS.',
          1, 
          'OS', 
          'd_s2'
        ),
        (
          'p_3', 
          '2025-04-10', 
          '{
            "timeline": [
              {"timestamp": 50, "height": 3.0, "events": [{"type": "fall", "force": 2.1, "duration": 1.8, "fallenDisnace": 2.5}]},
              {"timestamp": 200, "height": 11.0, "events": [{"type": "clip", "clipingTime": 2.5, "force": 0.5, "belayRate": 4}]},
              {"timestamp": 550, "height": 20.0, "events": [{"type": "anchor"}]}
            ]
          }'::jsonb,
          'Walka z drogą.',
          2, 
          'Flash', 
          'd_s3'
        )
      ON CONFLICT (id_przejscia) DO NOTHING;
    `);

    await pool.query("COMMIT");
    console.log("Database seed completed successfully using Argon2!");
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Seed failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

seed();