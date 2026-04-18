import { NextRequest } from 'next/server';
import { verifyToken, SESSION_COOKIE } from './jwt';

export interface SessionUser {
    id: string;
    username: string;
    display_name: string | null;
}

export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
    try {
        const token = req.cookies.get(SESSION_COOKIE)?.value;
        if (!token) return null;
        const payload = await verifyToken(token);
        return { id: payload.sub, username: payload.username, display_name: payload.display_name };
    } catch {
        return null;
    }
}
