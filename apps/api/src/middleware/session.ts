import type { NextFunction, Request, Response } from 'express';
import { getSession, getUserById, deleteSession } from '../db';
import { config } from '../env';

const COOKIE_NAME = 'sid';

function parseCookies(cookieHeader?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  cookieHeader.split(';').forEach((part) => {
    const [k, ...rest] = part.split('=');
    const key = k?.trim();
    if (!key) return;
    out[key] = decodeURIComponent(rest.join('=').trim());
  });
  return out;
}

export const sessionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const cookies = parseCookies(req.headers.cookie);
  const sid = cookies[COOKIE_NAME];

  if (sid) {
    const session = getSession(sid);
    if (session) {
      const user = getUserById(session.userId);
      if (user) {
        req.user = { id: user.id, name: user.name } as any;
        // refresh cookie expiration on each request (sliding expiration)
        const secure = process.env.NODE_ENV === 'production';
        res.cookie(COOKIE_NAME, session.id, {
          httpOnly: true,
          sameSite: 'lax',
          secure,
          maxAge: config.sessionTtlMs,
          path: '/'
        });
      } else {
        // orphan session
        deleteSession(sid);
      }
    }
  }

  next();
};

export const setSessionCookie = (res: Response, sessionId: string) => {
  const secure = process.env.NODE_ENV === 'production';
  res.cookie(COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: config.sessionTtlMs,
    path: '/'
  });
};

export const clearSessionCookie = (res: Response) => {
  const secure = process.env.NODE_ENV === 'production';
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'lax', secure, path: '/' });
};

