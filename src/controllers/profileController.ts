import { Response, NextFunction } from 'express';
import { queryOne, execute } from '../config/database.js';
import { AuthRequest, ErrorCodes } from '../types/index.js';
import { AppError } from '../middleware/errorHandler.js';

interface UserProfileRow {
  name: string;
  description: string | null;
}

export async function getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Authentication required', 401, ErrorCodes.UNAUTHORIZED);
    }

    const row = queryOne<UserProfileRow>(
      'SELECT name, description FROM users WHERE id = ?',
      [userId]
    );

    if (!row) {
      throw new AppError('User not found', 404, ErrorCodes.NOT_FOUND);
    }

    res.json({
      success: true,
      data: {
        name: row.name,
        description: row.description ?? '',
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function patchProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Authentication required', 401, ErrorCodes.UNAUTHORIZED);
    }

    const existing = queryOne<UserProfileRow>('SELECT name, description FROM users WHERE id = ?', [userId]);
    if (!existing) {
      throw new AppError('User not found', 404, ErrorCodes.NOT_FOUND);
    }

    const { name, description } = req.body ?? {};
    const updates: string[] = [];
    const params: unknown[] = [];

    if (name !== undefined) {
      const trimmed = typeof name === 'string' ? name.trim() : '';
      if (trimmed.length === 0) {
        throw new AppError('Name cannot be empty', 400, ErrorCodes.VALIDATION_ERROR);
      }
      updates.push('name = ?');
      params.push(trimmed);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(typeof description === 'string' ? description.trim() : description == null ? null : String(description));
    }

    if (updates.length > 0) {
      params.push(userId);
      execute(`UPDATE users SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ?`, params);
    }

    const row = queryOne<UserProfileRow>('SELECT name, description FROM users WHERE id = ?', [userId]);
    res.json({
      success: true,
      data: {
        name: row!.name,
        description: row!.description ?? '',
      },
    });
  } catch (error) {
    next(error);
  }
}
