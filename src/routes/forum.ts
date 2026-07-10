import { Router } from 'express';
import { getTopics, getTopic, getPosts, createTopic, createPost } from '../controllers/forumController.js';
import { authenticate, requireFullAccess } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/topics', getTopics);
router.get('/topics/:id', getTopic);
router.get('/topics/:topicId/posts', getPosts);
router.post('/topics', requireFullAccess, createTopic);
router.post('/topics/:topicId/posts', requireFullAccess, createPost);

export default router;
