import rateLimit from 'express-rate-limit';
import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';

const isDevelopment = process.env.NODE_ENV === 'development';

const buildLimiter = ({
  max,
  devMax,
  windowMs,
  message,
}: {
  max: number;
  devMax: number;
  windowMs: number;
  message: string;
}) => rateLimit({
  windowMs,
  max: isDevelopment ? devMax : max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message },
});

export const loginRateLimiter = buildLimiter({
  max: Number(process.env.AUTH_LOGIN_MAX_ATTEMPTS || 10),
  devMax: 300,
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  message: 'Too many login attempts. Please try again later.',
});

export const registerRateLimiter = buildLimiter({
  max: Number(process.env.AUTH_REGISTER_MAX_ATTEMPTS || 10),
  devMax: 200,
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  message: 'Too many registration attempts. Please try again later.',
});

export const forgotPasswordRateLimiter = buildLimiter({
  max: Number(process.env.AUTH_FORGOT_PASSWORD_MAX_ATTEMPTS || 5),
  devMax: 120,
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  message: 'Too many password reset requests. Please try again later.',
});

export const resetPasswordRateLimiter = buildLimiter({
  max: Number(process.env.AUTH_RESET_PASSWORD_MAX_ATTEMPTS || 20),
  devMax: 200,
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  message: 'Too many reset attempts. Please try again later.',
});

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    next();
    return;
  }

  res.status(400).json({
    message: 'Validation failed',
    errors: errors.array().map((error) => ({
      field: 'path' in error ? error.path : 'unknown',
      message: error.msg,
    })),
  });
};
