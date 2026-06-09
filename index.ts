import fs from "fs";
import https from "https";
import express from "express";

import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

import "dotenv/config";

import login from "./routes/Login.js";
import profile from "./routes/Profile.js";
import register from "./routes/Register.js";
import refresh from "./routes/Refresh.js";
import restartPassword from "./routes/ResetPassword.js";
import follow from "./routes/Follow.js";
import unfollow from "./routes/Unfollow.js";
import ascents from "./routes/Ascents.js";
import routes from "./routes/Routes.js";
import regions from "./routes/Regions.js";
import rocks from "./routes/Rocks.js";
import sectors from "./routes/Sectors.js";


const PORT = process.env.PORT;

const app = express();
app.use(cors());

// // Security start
app.use(helmet());
// app.use(
//     cors({
//         origin: process.env.FRONTEND_URL,
//         credentials: true,
//     }),
// );
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes window
    max: 100, // limit 100 requests from IP In 15 minutes
    message: "Too many requests from your IP, try again later.",
});
app.use("/login", limiter);
app.use("/register", limiter);

app.use(express.json({ limit: "10kb" })); // size limit
// // Security send

const privateKey = fs.readFileSync("server.key", "utf8");
const certificate = fs.readFileSync("server.cert", "utf8");

const credentials = { key: privateKey, cert: certificate };

app.use("/login", login);
app.use("/register", register);
app.use("/profile", profile);
app.use("/refresh", refresh);
app.use("/reset-password", restartPassword);
app.use("/follow", follow);
app.use("/unfollow", unfollow);
app.use("/ascents", ascents);
app.use("/routes", routes);
app.use("/regions", regions);
app.use("/sectors", sectors);
app.use("/rocks", rocks);

// const httpsServer = https.createServer(credentials, app);

// httpsServer.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
// });

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
