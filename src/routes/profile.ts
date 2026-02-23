import { Router } from 'express';
import { getProfile, patchProfile } from '../controllers/profileController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getProfile);
router.patch('/', patchProfile);

export default router;
