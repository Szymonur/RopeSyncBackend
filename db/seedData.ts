import "dotenv/config";
import pool from "./db.js";

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

INSERT INTO Rejony (id_rejonu, nazwa_rejonu, kraj) VALUES
  (1, 'Jura Poludniowa', 'Polska'),
  (2, 'Jura Polnocna', 'Polska'),
  (3, 'Sokoliki', 'Polska'),
  (4, 'Tatry Wysokie', 'Polska'),
  (5, 'Pogorze Roznowskie', 'Polska')
ON CONFLICT (id_rejonu) DO NOTHING;

INSERT INTO Sektory (id_sektoru, nazwa_sektoru, id_rejonu) VALUES
  (1, 'Dolina Bedkowska', 1),
  (2, 'Gora Zborow', 2),
  (3, 'Sokolik Duzy', 3),
  (4, 'Dolina Rybiego Potoku', 4),
  (5, 'Rezerwat Ciezkowice', 5)
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
    await pool.query("COMMIT");

    const summary = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM Rejony) AS rejony,
         (SELECT COUNT(*) FROM Sektory) AS sektory,
         (SELECT COUNT(*) FROM Skaly) AS skaly,
         (SELECT COUNT(*) FROM Drogi) AS drogi`
    );

    console.log("Backend seed done.");
    console.log(summary.rows[0]);
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Seed failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

seed();
