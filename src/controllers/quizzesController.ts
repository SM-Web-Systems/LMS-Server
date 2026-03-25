import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../config/database.js';
import { AuthRequest, ErrorCodes } from '../types/index.js';
import { AppError } from '../middleware/errorHandler.js';

interface QuizRow {
  id: string;
  title: string;
  description: string | null;
  course_id: string | null;
  questions: string;
  passing_score: number;
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

interface CompletionRow {
  id: string;
  quiz_id: string;
  user_id: string;
  score: number;
  total: number;
  passed: number;
  answers: string;
  completed_at: string;
}

interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'short_answer';
  question: string;
  options?: string[];
  correctIndex?: number;
  correctAnswer?: string;
  order: number;
}

function formatQuiz(row: QuizRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    courseId: row.course_id ?? undefined,
    questions: JSON.parse(row.questions || '[]'),
    passingScore: row.passing_score,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  };
}

function formatCompletion(row: CompletionRow) {
  return {
    id: row.id,
    quizId: row.quiz_id,
    userId: row.user_id,
    score: row.score,
    total: row.total,
    passed: !!row.passed,
    answers: JSON.parse(row.answers || '{}'),
    completedAt: row.completed_at,
  };
}

// GET /quizzes
export function getQuizzes(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const rows = query<QuizRow>('SELECT * FROM quizzes ORDER BY created_at DESC', []);
    const quizzes = rows.map(formatQuiz);

    if (req.user?.role !== 'admin') {
      quizzes.forEach((q) => {
        (q.questions as QuizQuestion[]).forEach((question) => {
          delete question.correctIndex;
          delete question.correctAnswer;
        });
      });
    }

    res.json({ success: true, data: { quizzes } });
  } catch (err) {
    next(err);
  }
}

// GET /quizzes/completions?userId=...
export function getCompletions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = (req.query.userId as string) || req.user!.userId;
    const rows = query<CompletionRow>(
      'SELECT * FROM quiz_completions WHERE user_id = ? ORDER BY completed_at DESC',
      [userId]
    );
    res.json({ success: true, data: { completions: rows.map(formatCompletion) } });
  } catch (err) {
    next(err);
  }
}

// GET /quizzes/:id
export function getQuiz(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const row = queryOne<QuizRow>('SELECT * FROM quizzes WHERE id = ?', [req.params.id]);
    if (!row) throw new AppError('Quiz not found', 404, ErrorCodes.NOT_FOUND);

    const quiz = formatQuiz(row);

    if (req.user?.role !== 'admin') {
      (quiz.questions as QuizQuestion[]).forEach((question) => {
        delete question.correctIndex;
        delete question.correctAnswer;
      });
    }

    res.json({ success: true, data: quiz });
  } catch (err) {
    next(err);
  }
}

// POST /quizzes (admin only)
export function createQuiz(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { title, description, courseId, passingScore, questions } = req.body;
    if (!title?.trim()) throw new AppError('Title is required', 400, ErrorCodes.VALIDATION_ERROR);

    const id = req.body.id || uuidv4();
    execute(
      `INSERT INTO quizzes (id, title, description, course_id, questions, passing_score, created_by_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, title.trim(), description?.trim() || null, courseId || null, JSON.stringify(questions || []), passingScore ?? 70, req.user!.userId]
    );

    const row = queryOne<QuizRow>('SELECT * FROM quizzes WHERE id = ?', [id]);
    res.status(201).json({ success: true, data: formatQuiz(row!) });
  } catch (err) {
    next(err);
  }
}

// PUT /quizzes/:id (admin only) — upsert: creates if not found
export function updateQuiz(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const existing = queryOne<QuizRow>('SELECT * FROM quizzes WHERE id = ?', [req.params.id]);
    const { title, description, courseId, passingScore, questions } = req.body;

    if (!existing) {
      if (!title?.trim()) throw new AppError('Title is required', 400, ErrorCodes.VALIDATION_ERROR);
      execute(
        `INSERT INTO quizzes (id, title, description, course_id, questions, passing_score, created_by_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [req.params.id, title.trim(), description?.trim() || null, courseId || null, JSON.stringify(questions || []), passingScore ?? 70, req.user!.userId]
      );
    } else {
      execute(
        `UPDATE quizzes SET title = ?, description = ?, course_id = ?, questions = ?, passing_score = ?, updated_at = datetime('now')
         WHERE id = ?`,
        [
          title?.trim() || existing.title,
          description?.trim() ?? existing.description,
          courseId ?? existing.course_id,
          questions ? JSON.stringify(questions) : existing.questions,
          passingScore ?? existing.passing_score,
          req.params.id,
        ]
      );
    }

    const row = queryOne<QuizRow>('SELECT * FROM quizzes WHERE id = ?', [req.params.id]);
    res.status(existing ? 200 : 201).json({ success: true, data: formatQuiz(row!) });
  } catch (err) {
    next(err);
  }
}

// DELETE /quizzes/:id (admin only)
export function deleteQuiz(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const existing = queryOne<QuizRow>('SELECT id FROM quizzes WHERE id = ?', [req.params.id]);
    if (!existing) throw new AppError('Quiz not found', 404, ErrorCodes.NOT_FOUND);

    execute('DELETE FROM quizzes WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Quiz deleted' });
  } catch (err) {
    next(err);
  }
}

// GET /quizzes/:id/completion?userId=...
export function getQuizCompletion(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = (req.query.userId as string) || req.user!.userId;
    const row = queryOne<CompletionRow>(
      'SELECT * FROM quiz_completions WHERE quiz_id = ? AND user_id = ? ORDER BY completed_at DESC LIMIT 1',
      [req.params.id, userId]
    );
    res.json({ success: true, data: row ? formatCompletion(row) : null });
  } catch (err) {
    next(err);
  }
}

// POST /quizzes/:id/submit
export function submitQuiz(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const quizRow = queryOne<QuizRow>('SELECT * FROM quizzes WHERE id = ?', [req.params.id]);
    if (!quizRow) throw new AppError('Quiz not found', 404, ErrorCodes.NOT_FOUND);

    const { answers } = req.body;
    if (!answers || typeof answers !== 'object') {
      throw new AppError('Answers object is required', 400, ErrorCodes.VALIDATION_ERROR);
    }

    const questions: QuizQuestion[] = JSON.parse(quizRow.questions || '[]');
    const total = questions.length;
    let correct = 0;

    for (const q of questions) {
      const submitted = (answers[q.id] ?? '').toString().trim();
      if (q.type === 'multiple_choice') {
        const correctOption = q.options?.[q.correctIndex ?? 0] ?? '';
        if (submitted === correctOption) correct++;
      } else if (q.type === 'short_answer') {
        if (submitted.toLowerCase() === (q.correctAnswer ?? '').toLowerCase().trim()) correct++;
      }
    }

    const scorePercent = total > 0 ? Math.round((correct / total) * 100) : 0;
    const passed = scorePercent >= (quizRow.passing_score ?? 70);

    const id = uuidv4();
    execute(
      `INSERT INTO quiz_completions (id, quiz_id, user_id, score, total, passed, answers)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, req.params.id, req.user!.userId, scorePercent, total, passed ? 1 : 0, JSON.stringify(answers)]
    );

    const row = queryOne<CompletionRow>('SELECT * FROM quiz_completions WHERE id = ?', [id]);
    res.status(201).json({ success: true, data: formatCompletion(row!) });
  } catch (err) {
    next(err);
  }
}
