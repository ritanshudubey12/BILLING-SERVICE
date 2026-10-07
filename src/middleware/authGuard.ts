import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthContext, JWTPayload } from '../types/index.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'triostack-billing-secret-key-2026';

declare global {
  namespace Express {
    interface Request {
      user?: AuthContext;
    }
  }
}

/**
 * AuthGuard Middleware:
 * Validates Bearer JWT, extracts sub (user_id), organization_id, roles, and permissions.
 * Protects endpoints and establishes organization isolation boundary.
 */
export const authGuard = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Missing or malformed Authorization header. Expected Bearer <JWT>'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    if (!decoded.sub || !decoded.organization_id) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid JWT payload: sub (user_id) and organization_id are required'
      });
    }

    req.user = {
      userId: String(decoded.sub),
      organizationId: String(decoded.organization_id),
      roles: decoded.roles || [],
      permissions: decoded.permissions || []
    };

    next();
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid or expired JWT access token'
    });
  }
};

/**
 * Generate a valid test JWT for testing in Postman or browser
 */
export const generateTestToken = (payload?: Partial<JWTPayload>): string => {
  const defaultPayload: JWTPayload = {
    sub: '10001',
    organization_id: '50001',
    roles: ['OWNER'],
    permissions: ['billing:read', 'billing:write'],
    exp: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year expiry
    ...payload
  };

  return jwt.sign(defaultPayload, JWT_SECRET);
};
