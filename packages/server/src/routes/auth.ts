import { Router } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/AuthService';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
  try {
    const result = await AuthService.login(req.body.email, req.body.password);
    res.json({ data: result });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: 'AUTH_ERROR', message: err.message });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'MISSING_TOKEN', message: 'refreshToken required' });
    const result = await AuthService.refresh(refreshToken);
    res.json({ data: result });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: 'AUTH_ERROR', message: err.message });
  }
});

router.post('/logout', authenticate, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await AuthService.logout(refreshToken);
    res.json({ data: { success: true } });
  } catch (err: any) {
    res.status(500).json({ error: 'AUTH_ERROR', message: err.message });
  }
});

router.get('/me', authenticate, (req, res) => {
  res.json({ data: req.user });
});

export default router;
