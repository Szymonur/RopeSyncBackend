-- PostgreSQL Schema for RopeSync

-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS Pomiary_wyciagow CASCADE;
DROP TABLE IF EXISTS Reakcje CASCADE;
DROP TABLE IF EXISTS Przejscia CASCADE;
DROP TABLE IF EXISTS Style_przejscia CASCADE;
DROP TABLE IF EXISTS Obserwacje CASCADE;
DROP TABLE IF EXISTS Uzytkownicy CASCADE;
DROP TABLE IF EXISTS Bouldery_szczegoly CASCADE;
DROP TABLE IF EXISTS Trady_szczegoly CASCADE;
DROP TABLE IF EXISTS Drogi_sportowe_szczegoly CASCADE;
DROP TABLE IF EXISTS Drogi CASCADE;
DROP TABLE IF EXISTS Skale_boulderowe CASCADE;
DROP TABLE IF EXISTS Skale_linowe CASCADE;
DROP TABLE IF EXISTS Skaly CASCADE;
DROP TABLE IF EXISTS Typy_skaly CASCADE;
DROP TABLE IF EXISTS Sektory CASCADE;
DROP TABLE IF EXISTS Rejony CASCADE;

CREATE TABLE Rejony (
    id_rejonu SERIAL PRIMARY KEY,
    nazwa_rejonu TEXT NOT NULL UNIQUE,
    kraj TEXT
);

CREATE TABLE Sektory (
    id_sektoru SERIAL PRIMARY KEY,
    nazwa_sektoru TEXT NOT NULL,
    id_rejonu INTEGER NOT NULL,
    UNIQUE (nazwa_sektoru, id_rejonu),
    FOREIGN KEY (id_rejonu) REFERENCES Rejony(id_rejonu) ON DELETE CASCADE
);

CREATE TABLE Typy_skaly (
    materia TEXT PRIMARY KEY
);

CREATE TABLE Skaly (
    id_skaly SERIAL PRIMARY KEY,
    id_sektoru INTEGER NOT NULL,
    nazwa_skaly TEXT NOT NULL,
    szerokosc_geograficzna REAL NOT NULL CHECK (szerokosc_geograficzna BETWEEN -90 AND 90),
    dlugosc_geograficzna REAL NOT NULL CHECK (dlugosc_geograficzna BETWEEN -180 AND 180),
    czy_zakaz BOOLEAN NOT NULL DEFAULT FALSE,
    opiekun TEXT,
    materia TEXT NOT NULL,
    UNIQUE (nazwa_skaly, id_sektoru),
    FOREIGN KEY (id_sektoru) REFERENCES Sektory(id_sektoru) ON DELETE CASCADE,
    FOREIGN KEY (materia) REFERENCES Typy_skaly(materia) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE Skale_linowe (
    francuska TEXT PRIMARY KEY,
    kurtyki TEXT NOT NULL,
    yds TEXT NOT NULL,
    przymiotnikowa TEXT NOT NULL,
    CHECK (francuska = LOWER(francuska))
);

CREATE TABLE Skale_boulderowe (
    font TEXT PRIMARY KEY,
    hueco TEXT NOT NULL,
    krakowska_boulderowa TEXT NOT NULL,
    CHECK (font = LOWER(font))
);

CREATE TABLE Drogi (
    id_drogi TEXT PRIMARY KEY,
    typ_drogi TEXT NOT NULL CHECK (typ_drogi IN ('sportowa', 'trad', 'boulder')),
    nazwa_drogi TEXT NOT NULL,
    id_skaly INTEGER NOT NULL,  
    data_utworzenia DATE DEFAULT CURRENT_DATE,
    opis TEXT,
    UNIQUE (nazwa_drogi, id_skaly),
    FOREIGN KEY (id_skaly) REFERENCES Skaly(id_skaly) ON DELETE CASCADE
);

CREATE TABLE Drogi_sportowe_szczegoly (
    id_drogi TEXT PRIMARY KEY,
    dlugosc_drogi INTEGER NOT NULL,
    liczba_ringow INTEGER NOT NULL,
    stanowisko TEXT,
    skala_linowa TEXT NOT NULL,
    FOREIGN KEY (id_drogi) REFERENCES Drogi(id_drogi) ON DELETE CASCADE,
    FOREIGN KEY (skala_linowa) REFERENCES Skale_linowe(francuska) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE Trady_szczegoly (
    id_drogi TEXT PRIMARY KEY,
    dlugosc_drogi INTEGER NOT NULL,
    czy_stanowiska BOOLEAN NOT NULL DEFAULT FALSE,
    potrzebny_sprzet TEXT NOT NULL,
    skala_linowa TEXT NOT NULL,
    FOREIGN KEY (id_drogi) REFERENCES Drogi(id_drogi) ON DELETE CASCADE,
    FOREIGN KEY (skala_linowa) REFERENCES Skale_linowe(francuska) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE Bouldery_szczegoly (
    id_drogi TEXT PRIMARY KEY,
    wysokosc REAL NOT NULL,
    liczba_potrzebnych_crashpadow INTEGER,
    skala_boulderowa TEXT NOT NULL,
    FOREIGN KEY (id_drogi) REFERENCES Drogi(id_drogi) ON DELETE CASCADE,
    FOREIGN KEY (skala_boulderowa) REFERENCES Skale_boulderowe(font) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE Uzytkownicy (
    id_uzytkownika SERIAL PRIMARY KEY,
    login TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    haslo TEXT NOT NULL, 
    sol TEXT NOT NULL,
    imie TEXT NOT NULL,
    nazwisko TEXT NOT NULL,

    CONSTRAINT check_password_length CHECK (LENGTH(haslo) >= 60 AND LENGTH(haslo) <= 150),
    CONSTRAINT check_email_format CHECK (
        email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    )
);

CREATE TABLE Obserwacje (
    id_obserwujacego INTEGER NOT NULL,
    id_obserwowanego INTEGER NOT NULL,
    data_rozpoczecia TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id_obserwujacego, id_obserwowanego),
    FOREIGN KEY (id_obserwujacego) REFERENCES Uzytkownicy(id_uzytkownika) ON DELETE CASCADE,
    FOREIGN KEY (id_obserwowanego) REFERENCES Uzytkownicy(id_uzytkownika) ON DELETE CASCADE,
    CHECK (id_obserwujacego <> id_obserwowanego)
);

CREATE TABLE Style_przejscia (
    nazwa_stylu TEXT PRIMARY KEY
);

CREATE TABLE Przejscia (
    id_przejscia TEXT PRIMARY KEY,
    data DATE DEFAULT CURRENT_DATE,
    uri_timeline TEXT,
    notatka TEXT,
    id_uzytkownika INTEGER NOT NULL,
    nazwa_stylu TEXT NOT NULL,
    id_drogi TEXT NOT NULL,
    FOREIGN KEY (id_uzytkownika) REFERENCES Uzytkownicy(id_uzytkownika) ON DELETE CASCADE,
    FOREIGN KEY (nazwa_stylu) REFERENCES Style_przejscia(nazwa_stylu) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_drogi) REFERENCES Drogi(id_drogi) ON DELETE CASCADE
);

CREATE TABLE Reakcje (
    id_uzytkownika INTEGER NOT NULL,
    id_przejscia TEXT NOT NULL,
    PRIMARY KEY (id_uzytkownika, id_przejscia),
    FOREIGN KEY (id_uzytkownika) REFERENCES Uzytkownicy(id_uzytkownika) ON DELETE CASCADE,
    FOREIGN KEY (id_przejscia) REFERENCES Przejscia(id_przejscia) ON DELETE CASCADE
);

CREATE TABLE Pomiary_wyciagow (
    id_sesji TEXT PRIMARY KEY,
    id_urzadzenia TEXT,
    start_pomiaru TIMESTAMP NOT NULL,
    koniec_pomiaru TIMESTAMP NOT NULL,
    max_wysokosc REAL NOT NULL,
    min_wysokosc REAL NOT NULL,
    max_sila REAL NOT NULL,
    id_przejscia TEXT NOT NULL,
    CHECK (koniec_pomiaru >= start_pomiaru),
    CHECK (max_wysokosc >= min_wysokosc),
    FOREIGN KEY (id_przejscia) REFERENCES Przejscia(id_przejscia) ON DELETE CASCADE
);

CREATE INDEX idx_sektory_rejon ON Sektory(id_rejonu);
CREATE INDEX idx_skaly_sektor ON Skaly(id_sektoru);
CREATE INDEX idx_skaly_materia ON Skaly(materia);
CREATE INDEX idx_drogi_skala ON Drogi(id_skaly);
CREATE INDEX idx_przejscia_uzytkownik ON Przejscia(id_uzytkownika);
CREATE INDEX idx_przejscia_droga ON Przejscia(id_drogi);
CREATE INDEX idx_przejscia_styl ON Przejscia(nazwa_stylu);
CREATE INDEX idx_pomiary_przejscie ON Pomiary_wyciagow(id_przejscia);
CREATE INDEX idx_obserwacje_obserwowany ON Obserwacje(id_obserwowanego);
CREATE INDEX idx_reakcje_przejscie ON Reakcje(id_przejscia);
