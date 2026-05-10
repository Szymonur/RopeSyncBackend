import { User } from "../types/user.js";

export const users: User[] = [
    {
        id: 1,
        username: "user1",
        password: "password1",
        role: "user",
        lastName: "Kowalski",
        firstName: "Jan",
        email: "example@gmail.com",
    },
    {
        id: 2,
        username: "admin",
        password: "admin",
        role: "admin",
        lastName: "Doe",
        firstName: "John",
        email: "example@gmail.com",
    },
    {
        id: 3,
        username: "1",
        password: "1",
        role: "user",
        lastName: "Nazwisko",
        firstName: "Imie",
        email: "example@gmail.com",
    },
];

export const addUser = (user: User) => {
    users.push(user);
};

export const findUserByUsername = (username: string) => {
    return users.find((u) => u.username === username);
};
