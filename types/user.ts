export interface User {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    password?: string;
    email: string;
    role: string;
}

export interface JwtPayload {
    id: number;
    username: string;
    role: string;
}
