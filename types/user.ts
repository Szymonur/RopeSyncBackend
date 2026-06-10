export interface User {
    userId?: number;
    username: string;
    firstName: string;
    lastName: string;
    password: string;
    salt: string;
    email: string;
    role: string;
}

export interface JwtPayload {
    id: number;
    username: string;
}
