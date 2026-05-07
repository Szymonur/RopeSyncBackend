export interface User {
    id: number;
    username: string;
    password?: string;
    role: string;
}

export interface JwtPayload {
    id: number;
    username: string;
    role: string;
}
