import fs from "fs";
import express from "express";

import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

import "dotenv/config";

import auth from "./routes/Auth.js";
import users from "./routes/Users.js";
import notifications from "./routes/Notifications.js";
import dictionaries from "./routes/Dictionaries.js";
import ascents from "./routes/Ascents.js";
import routes from "./routes/Routes.js";
import regions from "./routes/Regions.js";
import rocks from "./routes/Rocks.js";
import sectors from "./routes/Sectors.js";

const PORT = process.env.PORT;

const app = express();
app.use(cors());

app.use(helmet());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes window
    max: 100, // limit 100 requests from IP in 15 minutes
    message: "Too many requests from your IP, try again later.",
});

// Swagger configuration
const swaggerOptions = {
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

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Limiter applied to auth routes
app.use("/auth/login", limiter);
app.use("/auth/register", limiter);

app.use(express.json({ limit: "10kb" }));

app.use("/auth", auth);
app.use("/users", users);
app.use("/notifications", notifications);
app.use("/", dictionaries); // For /styles
app.use("/ascents", ascents);
app.use("/routes", routes);
app.use("/regions", regions);
app.use("/sectors", sectors);
app.use("/rocks", rocks);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Documentation available at http://localhost:${PORT}/api-docs`);
});
