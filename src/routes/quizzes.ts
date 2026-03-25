import { Router } from 'express';
import {
  getQuizzes,
  getQuiz,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  getCompletions,
  getQuizCompletion,
  submitQuiz,
} from '../controllers/quizzesController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getQuizzes);
router.get('/completions', getCompletions);
router.get('/:id', getQuiz);
router.get('/:id/completion', getQuizCompletion);

router.post('/', authorize('admin'), createQuiz);
router.put('/:id', authorize('admin'), updateQuiz);
router.delete('/:id', authorize('admin'), deleteQuiz);

router.post('/:id/submit', submitQuiz);

export default router;
