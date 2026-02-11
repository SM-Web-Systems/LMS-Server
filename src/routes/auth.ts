import { Router } from 'express';
import { login, logout, getMe } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// POST /auth/login - Authenticate user
router.post('/login', login);

// POST /auth/logout - Logout user (requires auth)
router.post('/logout', authenticate, logout);

// GET /auth/me - Get current user info
router.get('/me', authenticate, getMe);

export default router;

