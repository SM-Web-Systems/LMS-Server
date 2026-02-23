import { Router } from 'express';
import {
  getConversations,
  postConversations,
  getConversation,
  getMessages,
  postMessage,
} from '../controllers/messagesController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/conversations', getConversations);
router.post('/conversations', postConversations);
router.get('/conversations/:id', getConversation);
router.get('/conversations/:id/messages', getMessages);
router.post('/conversations/:id/messages', postMessage);

export default router;
