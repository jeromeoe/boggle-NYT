import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'boggle_session';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-secret-change-in-production');

interface SessionPayload {
    sub: string;       // user id
    username: string;
    display_name: string | null;
}

export async function signToken(payload: SessionPayload): Promise<string> {
    return new SignJWT({
        username: payload.username,
        display_name: payload.display_name,
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(payload.sub)
        .setIssuedAt()
        .setExpirationTime('30d')
        .sign(SECRET);
}

export async function verifyToken(token: string): Promise<SessionPayload> {
    const { payload } = await jwtVerify(token, SECRET);
    return {
        sub: payload.sub as string,
        username: payload['username'] as string,
        display_name: (payload['display_name'] as string | null) ?? null,
    };
}
