import fs from "fs";
import path from "path";
import pool from "./db.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const initDb = async () => {
    try {
        const schemaPath = path.join(__dirname, "schema.postgres.sql");
        const schema = fs.readFileSync(schemaPath, "utf8");

        console.log("Initializing database...");
        await pool.query(schema);
        console.log("Database initialized successfully.");

        await pool.end();
    } catch (err) {
        console.error("Error initializing database:", err);
        process.exit(1);
    }
};

initDb();
