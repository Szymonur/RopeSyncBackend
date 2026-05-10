import express, { Request, Response } from "express";
import { users, addUser } from "../utils/tmpDB.js";
import { User } from "../types/user.js";

const router = express.Router();

// Register route
router.post("/", (req: Request, res: Response) => {
    const { username, password, firstName, lastName, email } = req.body;

    if (!username || !password) {
        return res
            .status(400)
            .json({ message: "Username and password are required" });
    }

    // Check if user already exists
    const existingUser = users.find((u) => u.username === username);
    if (existingUser) {
        return res.status(409).json({ message: "User already exists" });
    }

    // Create new user
    const newUser: User = {
        id: users.length + 1,
        username,
        firstName,
        lastName,
        email,
        password,
        role: "user",
    };

    // Add to mock DB
    addUser(newUser);

    res.status(201).json({
        message: "User registered successfully",
        userId: newUser.id,
    });
});

export default router;
