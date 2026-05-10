import express, { Request, Response } from "express";
import authenticateAccesJWT from "../utils/authenticateJWT.js";
import { users } from "../utils/tmpDB.js";

const router = express.Router();

router.get("/", authenticateAccesJWT, (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    const user = users.find((u) => u.id === userId);

    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    // Opcjonalnie: usuwamy hasło z obiektu przed wysłaniem
    const { password, ...userWithoutPassword } = user;

    res.json({ message: "Profile accessed", user: userWithoutPassword });
});

router.get("/:id", authenticateAccesJWT, (req: Request, res: Response) => {
    const userId = parseInt(req.params.id as string);
    const user = users.find((u) => u.id === userId);

    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    const { password, ...userWithoutPassword } = user;

    res.json({ message: "Profile accessed", user: userWithoutPassword });
});

export default router;
