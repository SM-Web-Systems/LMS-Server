import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../config/database.js';
import { AuthRequest, Course, CourseSection, CourseItem, ErrorCodes } from '../types/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { getDocumentFileUrl } from '../utils/fileUpload.js';

interface CourseRow {
  id: string;
  title: string;
  description: string | null;
  sections: string;
}

function parseSections(sectionsJson: string): CourseSection[] {
  try {
    const parsed = JSON.parse(sectionsJson || '[]') as CourseSection[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function ensurePdfFileUrls(sections: CourseSection[]): CourseSection[] {
  return sections.map((sec) => ({
    ...sec,
    items: sec.items.map((item) => {
      if (item.type === 'pdf' && item.documentId && !item.fileUrl) {
        return { ...item, fileUrl: getDocumentFileUrl(item.documentId) };
      }
      return item;
    }),
  }));
}

function rowToCourse(row: CourseRow): Course {
  const sections = ensurePdfFileUrls(parseSections(row.sections));
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    sections,
  };
}

export async function getCourses(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const rows = query<CourseRow>('SELECT id, title, description, sections FROM courses ORDER BY title');
    const courses = rows.map(rowToCourse);
    res.json({
      success: true,
      data: { courses },
    });
  } catch (error) {
    next(error);
  }
}

export async function getCourse(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const row = queryOne<CourseRow>('SELECT id, title, description, sections FROM courses WHERE id = ?', [id]);
    if (!row) {
      throw new AppError('Course not found', 404, ErrorCodes.NOT_FOUND);
    }
    res.json({
      success: true,
      data: rowToCourse(row),
    });
  } catch (error) {
    next(error);
  }
}

function validateCourseForCreate(body: unknown): { course: Course; errors: Array<{ field: string; message: string }> } {
  const errors: Array<{ field: string; message: string }> = [];
  const o = body as Record<string, unknown>;
  const title = o?.title;
  const sections = o?.sections;

  if (title === undefined || title === null || String(title).trim() === '') {
    errors.push({ field: 'title', message: 'Title is required' });
  }
  if (sections !== undefined && !Array.isArray(sections)) {
    errors.push({ field: 'sections', message: 'sections must be an array' });
  }

  const sectionsArray = Array.isArray(sections) ? (sections as CourseSection[]) : [];
  const course: Course = {
    id: (o?.id && String(o.id).trim()) || uuidv4(),
    title: title != null ? String(title).trim() : '',
    description: o?.description != null ? String(o.description).trim() : undefined,
    sections: sectionsArray,
  };
  return { course, errors };
}

export async function createCourse(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { course, errors } = validateCourseForCreate(req.body);
    if (errors.length > 0) {
      throw new AppError('Validation failed', 400, ErrorCodes.VALIDATION_ERROR, errors);
    }

    const existing = queryOne<{ id: string }>('SELECT id FROM courses WHERE id = ?', [course.id]);
    if (existing) {
      throw new AppError('A course with this id already exists', 400, ErrorCodes.DUPLICATE_ENTRY);
    }

    execute(
      'INSERT INTO courses (id, title, description, sections) VALUES (?, ?, ?, ?)',
      [course.id, course.title, course.description ?? null, JSON.stringify(course.sections)]
    );

    const row = queryOne<CourseRow>('SELECT id, title, description, sections FROM courses WHERE id = ?', [course.id]);
    if (!row) {
      throw new AppError('Failed to create course', 500, ErrorCodes.INTERNAL_ERROR);
    }

    res.status(201).json({
      success: true,
      data: rowToCourse(row),
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCourse(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const existing = queryOne<CourseRow>('SELECT id, title, description, sections FROM courses WHERE id = ?', [id]);
    if (!existing) {
      throw new AppError('Course not found', 404, ErrorCodes.NOT_FOUND);
    }

    const o = (req.body || {}) as Record<string, unknown>;
    const errors: Array<{ field: string; message: string }> = [];
    if (o.title !== undefined && (o.title === null || String(o.title).trim() === '')) {
      errors.push({ field: 'title', message: 'Title cannot be empty' });
    }
    if (o.sections !== undefined && !Array.isArray(o.sections)) {
      errors.push({ field: 'sections', message: 'sections must be an array' });
    }
    if (errors.length > 0) {
      throw new AppError('Validation failed', 400, ErrorCodes.VALIDATION_ERROR, errors);
    }

    const title = o.title !== undefined ? String(o.title).trim() : existing.title;
    const description = o.description !== undefined ? (o.description != null ? String(o.description).trim() : null) : existing.description;
    const sections = o.sections !== undefined ? (o.sections as CourseSection[]) : parseSections(existing.sections);

    execute('UPDATE courses SET title = ?, description = ?, sections = ? WHERE id = ?', [
      title,
      description ?? null,
      JSON.stringify(sections),
      id,
    ]);

    const row = queryOne<CourseRow>('SELECT id, title, description, sections FROM courses WHERE id = ?', [id]);
    res.json({
      success: true,
      data: rowToCourse(row!),
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteCourse(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const existing = queryOne<{ id: string }>('SELECT id FROM courses WHERE id = ?', [id]);
    if (!existing) {
      throw new AppError('Course not found', 404, ErrorCodes.NOT_FOUND);
    }
    execute('DELETE FROM courses WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}
