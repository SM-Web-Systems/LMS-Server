import { Router } from 'express';
import {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
} from '../controllers/coursesController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getCourses);
router.get('/:id', getCourse);
router.post('/', authorize('admin'), createCourse);
router.put('/:id', authorize('admin'), updateCourse);
router.delete('/:id', authorize('admin'), deleteCourse);

export default router;
