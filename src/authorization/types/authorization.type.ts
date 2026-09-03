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

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: {
    id: string;
    email: string;
  };
}

export interface SessionMetadata {
  ipAddress?: string;
  userAgent?: string;
}
