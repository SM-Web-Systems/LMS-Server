import { Response, NextFunction } from 'express';
import { verifyToken } from '../config/jwt.js';
import { queryOne } from '../config/database.js';
import { AccessLevel, AuthRequest, ErrorCodes, UserRole } from '../types/index.js';
import { resolveUserFromClerkSessionToken } from '../auth/clerkUser.js';

/**
 * Resolve the authoritative access level from the DB (not the token, which may
 * be stale). Admins are always 'full'. Falls back to 'full' if the column /
 * row is missing so existing accounts keep working.
 */
function resolveAccessLevel(req: AuthRequest): void {
  if (!req.user) return;
  if (req.user.role === 'admin') {
    req.user.accessLevel = 'full';
    return;
  }
  try {
    const row = queryOne<{ access_level: AccessLevel }>(
      'SELECT access_level FROM users WHERE id = ?',
      [req.user.userId]
    );
    req.user.accessLevel = row?.access_level ?? 'full';
  } catch {
    req.user.accessLevel = 'full';
  }
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  void authenticateAsync(req, res, next);
}

async function authenticateAsync(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Missing or invalid authorization header',
        },
      });
      return;
    }

    const token = authHeader.substring(7);

    try {
      const payload = verifyToken(token);
      req.user = payload;
      resolveAccessLevel(req);
      next();
      return;
    } catch {
      // Not an LMS-issued JWT; try Clerk session token if configured
    }

    const clerkUser = await resolveUserFromClerkSessionToken(token);
    if (clerkUser) {
      req.user = clerkUser;
      resolveAccessLevel(req);
      next();
      return;
    }

    res.status(401).json({
      success: false,
      error: {
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Invalid or expired token',
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Blocks read-only 'preview' users from mutating actions. Use on write routes
 * that authenticated students can otherwise reach. Must run after authenticate.
 */
export function requireFullAccess(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: { code: ErrorCodes.UNAUTHORIZED, message: 'Authentication required' },
    });
    return;
  }
  if (req.user.accessLevel === 'preview') {
    res.status(403).json({
      success: false,
      error: {
        code: ErrorCodes.FORBIDDEN,
        message: 'This action is not available in preview mode. Sign in with an invited account for full access.',
      },
    });
    return;
  }
  next();
}

export function authorize(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Authentication required',
        },
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: ErrorCodes.FORBIDDEN,
          message: 'You do not have permission to access this resource',
        },
      });
      return;
    }

    next();
  };
}

