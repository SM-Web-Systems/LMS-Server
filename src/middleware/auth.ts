import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '../config/jwt.js';
import { clerk, verifyClerkJWT, getClerkUserInfo } from '../config/clerk.js';
import { queryOne, execute } from '../config/database.js';
import { AuthRequest, ErrorCodes, UserRole, User, Student } from '../types/index.js';

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
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

  // Try backend JWT first
  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
    return;
  } catch {
    // Not a backend JWT — try Clerk
  }

  // Try Clerk token verification
  if (!clerk) {
    res.status(401).json({
      success: false,
      error: {
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Invalid or expired token',
      },
    });
    return;
  }

  verifyClerkToken(token, req, res, next);
}

async function verifyClerkToken(
  token: string,
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const clerkPayload = await verifyClerkJWT(token);
    if (!clerkPayload) throw new Error('Invalid Clerk token');
    const clerkUserId = clerkPayload.sub;

    const clerkInfo = await getClerkUserInfo(clerkUserId);
    if (!clerkInfo) {
      res.status(401).json({
        success: false,
        error: { code: ErrorCodes.UNAUTHORIZED, message: 'Could not resolve Clerk user' },
      });
      return;
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
      res.status(401).json({
        success: false,
        error: { code: ErrorCodes.UNAUTHORIZED, message: 'Could not find or create user' },
      });
      return;
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

    next();
  } catch {
    res.status(401).json({
      success: false,
      error: { code: ErrorCodes.UNAUTHORIZED, message: 'Invalid or expired token' },
    });
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
