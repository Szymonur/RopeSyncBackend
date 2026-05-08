import { User } from "../types/user.js";

export const users: User[] = [
    { id: 1, username: "user1", password: "password1", role: "user" },
    { id: 2, username: "admin", password: "admin", role: "admin" },
    { id: 3, username: "1", password: "1", role: "user" },
];

export const addUser = (user: User) => {
    users.push(user);
};

export const findUserByUsername = (username: string) => {
    return users.find((u) => u.username === username);
};
