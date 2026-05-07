import fs from "fs";
import https from "https";
import express from "express";

import "dotenv/config";

import login from "./routes/Login.js";
import profile from "./routes/Profile.js";

const PORT = process.env.PORT;

const app = express();
app.use(express.json());

const privateKey = fs.readFileSync("server.key", "utf8");
const certificate = fs.readFileSync("server.cert", "utf8");

const credentials = { key: privateKey, cert: certificate };

app.use("/login", login);
app.use("/profile", profile);

const httpsServer = https.createServer(credentials, app);

// Start server
httpsServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
