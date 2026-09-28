import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'boggle_session';
export const LOCAL_TEST_USERNAME = 'testuser';

export function isLocalTestUsername(username: string): boolean {
    return username.trim().toLowerCase() === LOCAL_TEST_USERNAME;
}

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
    if (process.env.NODE_ENV === 'production' && isLocalTestUsername(String(payload.username ?? ''))) {
        throw new Error('Local test sessions are not valid in production');
    }
    return {
        sub: payload.sub as string,
        username: payload['username'] as string,
        display_name: (payload['display_name'] as string | null) ?? null,
    };
}
