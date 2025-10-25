import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getClientIp, getUserAgent } from '../middleware/authMiddleware.js';
import { login, logout, refreshAccessToken } from '../services/authService.js';
import config from '../config/index.js';
import { z } from 'zod';

const router = Router();

// Login validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

/**
 * POST /auth/login
 * Authenticate user and return tokens
 */
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    // Validate input
    const validatedData = loginSchema.parse(req.body);

    const deviceInfo = {
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    };

    const { user, tokens } = await login(
      validatedData.email,
      validatedData.password,
      deviceInfo
    );

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: config.cookie.secure,
      sameSite: config.cookie.sameSite,
      domain: config.cookie.domain,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
    });

    res.json({
      accessToken: tokens.accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
    });
  })
);

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    // Get refresh token from cookie or body
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      res.status(401).json({ error: 'Refresh token required' });
      return;
    }

    const deviceInfo = {
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    };

    const tokens = await refreshAccessToken(refreshToken, deviceInfo);

    // Set new refresh token cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: config.cookie.secure,
      sameSite: config.cookie.sameSite,
      domain: config.cookie.domain,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({
      accessToken: tokens.accessToken,
    });
  })
);

/**
 * POST /auth/logout
 * Logout and revoke refresh token
 */
router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (refreshToken) {
      const ipAddress = getClientIp(req);
      await logout(refreshToken, ipAddress);
    }

    // Clear cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: config.cookie.secure,
      sameSite: config.cookie.sameSite,
      domain: config.cookie.domain,
      path: '/',
    });

    res.json({ message: 'Logged out successfully' });
  })
);

export default router;
