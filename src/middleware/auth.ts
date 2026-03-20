import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '../config/jwt.js';
import { clerk, verifyClerkJWT, getClerkUserInfo } from '../config/clerk.js';
import {
  isWordPressAuthConfigured,
  verifyWordPressToken,
} from '../config/wordpress.js';
import { queryOne, execute } from '../config/database.js';
import { AuthRequest, ErrorCodes, UserRole, User, Student } from '../types/index.js';

const AUTH_SOURCE_HEADER = 'x-auth-source';

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[auth] 401: Missing or invalid Authorization header (expect Bearer <token>)');
    }
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

  // If request indicates WordPress, authenticate with WordPress JWT only
  const authSource = req.headers[AUTH_SOURCE_HEADER]?.toString().toLowerCase();
  if (authSource === 'wordpress') {
    const ok = await tryVerifyWordPressAndAttachUser(token, req);
    if (ok) {
      next();
      return;
    }

    res.status(401).json({
      success: false,
      error: {
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Invalid or expired WordPress token',
      },
    });
    return;
  }

  // Default order:
  // 1) Clerk
  // 2) Backend JWT (email/password login)
  // 3) WordPress JWT (auto-detect)
  if (clerk) {
    const ok = await tryVerifyClerkToken(token, req);
    if (ok) {
      next();
      return;
    }
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
    return;
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[auth] Backend JWT invalid or expired (trying WordPress next):', (err as Error).message);
    }
  }

  if (isWordPressAuthConfigured()) {
    const ok = await tryVerifyWordPressAndAttachUser(token, req);
    if (ok) {
      next();
      return;
    }
  }

  res.status(401).json({
    success: false,
    error: {
      code: ErrorCodes.UNAUTHORIZED,
      message: 'Invalid or expired token',
    },
  });
}

async function tryVerifyWordPressAndAttachUser(
  token: string,
  req: AuthRequest,
) : Promise<boolean> {
  if (!isWordPressAuthConfigured()) {
    return false;
  }

  try {
    const wpUser = verifyWordPressToken(token);
    let user = queryOne<User>('SELECT * FROM users WHERE email = ?', [
      wpUser.email.toLowerCase(),
    ]);

    if (!user) {
      const id = uuidv4();
      execute(
        'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
        [id, wpUser.name, wpUser.email.toLowerCase(), '', 'student']
      );
      user = queryOne<User>('SELECT * FROM users WHERE id = ?', [id]);
    }

    if (!user) {
      return false;
    }

    let studentId: string | undefined;
    if (user.role === 'student') {
      const student = queryOne<Student>('SELECT id FROM students WHERE user_id = ?', [
        user.id,
      ]);
      studentId = student?.id;
    }

    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      studentId,
    };

    return true;
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[auth] 401: WordPress token invalid or expired:', (err as Error).message);
    }
    return false;
  }
}

async function tryVerifyClerkToken(
  token: string,
  req: AuthRequest,
) : Promise<boolean> {
  try {
    const clerkPayload = await verifyClerkJWT(token);
    if (!clerkPayload) throw new Error('Invalid Clerk token');
    const clerkUserId = clerkPayload.sub;

    const clerkInfo = await getClerkUserInfo(clerkUserId);
    if (!clerkInfo) {
      return false;
    }

    // Find or create local user
    let user = queryOne<User>('SELECT * FROM users WHERE email = ?', [clerkInfo.email.toLowerCase()]);

    if (!user) {
      const id = uuidv4();
      execute(
        'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
        [id, clerkInfo.name, clerkInfo.email.toLowerCase(), '', 'student']
      );
      user = queryOne<User>('SELECT * FROM users WHERE id = ?', [id]);
    }

    if (!user) {
      return false;
    }

    let studentId: string | undefined;
    if (user.role === 'student') {
      const student = queryOne<Student>('SELECT id FROM students WHERE user_id = ?', [user.id]);
      studentId = student?.id;
    }

    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      studentId,
    };

    return true;
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[auth] 401: Clerk token invalid or expired:', (err as Error).message);
    }
    return false;
  }
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
