export interface JwtPayload {
    sub: string;
    type: 'access';
    sessionId: string;
}

export interface AuthenticatedUser {
    id: string;
    email: string;
    sessionId: string;
}