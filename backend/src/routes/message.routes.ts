import { Router } from 'express';
import {
  getContacts, getConversations, startConversation, getMessages, sendMessage,
  setTyping, deleteMessage, deleteConversation, reportConversation,
} from '../controllers/message.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.get('/contacts', getContacts);
router.get('/conversations', getConversations);
router.post('/conversations', startConversation);
router.get('/conversations/:id/messages', getMessages);
router.post('/conversations/:id/messages', sendMessage);
router.patch('/conversations/:id/typing', setTyping);
router.delete('/conversations/:id', deleteConversation);
router.post('/conversations/:id/report', reportConversation);
router.delete('/messages/:messageId', deleteMessage);

export default router;
