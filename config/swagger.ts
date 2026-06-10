import { Options } from "swagger-jsdoc";

const PORT = process.env.PORT;

export const swaggerOptions: Options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "RopeSync API",
            version: "1.0.0",
            description: "Dokumentacja API dla aplikacji RopeSync (Backend)",
        },
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
            schemas: {
                User: {
                    type: "object",
                    properties: {
                        id: { type: "integer" },
                        username: { type: "string" },
                        email: { type: "string" },
                        firstName: { type: "string" },
                        lastName: { type: "string" },
                    },
                },
                Ascent: {
                    type: "object",
                    properties: {
                        id_przejscia: { type: "string" },
                        data: { type: "string", format: "date" },
                        notatka: { type: "string" },
                        timeline_data: { type: "object" },
                        id_uzytkownika: { type: "integer" },
                        nazwa_stylu: { type: "string" },
                        id_drogi: { type: "integer" },
                        wycena: { type: "string" },
                        nazwa_drogi: { type: "string" },
                        typ_drogi: { type: "string" },
                        username: { type: "string" },
                    },
                },
                Route: {
                    type: "object",
                    properties: {
                        id_drogi: { type: "integer" },
                        typ_drogi: { type: "string" },
                        nazwa_drogi: { type: "string" },
                        wycena: { type: "string" },
                        nazwa_skaly: { type: "string" },
                        nazwa_rejonu: { type: "string" },
                    },
                },
                Region: {
                    type: "object",
                    properties: {
                        id_rejonu: { type: "integer" },
                        nazwa_rejonu: { type: "string" },
                        kraj: { type: "string" },
                    },
                },
                Rock: {
                    type: "object",
                    properties: {
                        id_skaly: { type: "integer" },
                        nazwa_skaly: { type: "string" },
                        materia: { type: "string" },
                        czy_zakaz: { type: "boolean" },
                    },
                },
                Sector: {
                    type: "object",
                    properties: {
                        id_sektoru: { type: "integer" },
                        nazwa_sektoru: { type: "string" },
                        id_rejonu: { type: "integer" },
                    },
                },
                Notification: {
                    type: "object",
                    properties: {
                        id_uzytkownika: { type: "integer" },
                        username: { type: "string" },
						imie: { type: "string" },
						nazwisko: { type: "string" },
						id_przejscia: { type: "integer" },
						id_drogi: { type: "integer" },
						nazwa_drogi: { type: "string" },
						data_reakcji: { type: "string", format: "date-time" },
                        wyswietlono: { type: "boolean" },
                    },
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
        servers: [
            {
                url: `http://localhost:${PORT}`,
                description: "Development server",
            },
        ],
    },
    apis: ["./routes/*.ts", "./routes/*.js"], // Path to the API docs
};
