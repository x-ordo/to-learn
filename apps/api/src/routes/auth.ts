import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../middleware/errorHandler';
import { config } from '../env';
import { createSession, createUser, getUserByName } from '../db';
import { clearSessionCookie, setSessionCookie } from '../middleware/session';
import { hashPassword, verifyPassword } from '../utils/password';

const router = Router();

const LoginSchema = z.object({
  name: z.string().trim().min(1).max(50),
  password: z.string().min(4).max(100)
});

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(422, 'VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join(', '));
    }

    const { name, password } = parsed.data;

    let user = getUserByName(name);
    if (!user) {
      // 회원가입 없이 최초 로그인 시 사용자 생성
      user = createUser(name, hashPassword(password));
    } else {
      const ok = verifyPassword(password, user.passwordHash);
      if (!ok) {
        throw new ApiError(401, 'INVALID_CREDENTIALS', '이름 또는 비밀번호가 올바르지 않습니다.');
      }
    }

    const session = createSession(user.id, config.sessionTtlMs);
    setSessionCookie(res, session.id);
    return res.json({ user: { id: user.id, name: user.name } });
  })
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    clearSessionCookie(res);
    return res.json({ ok: true });
  })
);

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new ApiError(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
    }
    return res.json({ user: req.user });
  })
);

export const authRouter = router;

