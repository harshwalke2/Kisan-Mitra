import { Router } from 'express';
import { whatsappHealth, whatsappWebhook } from '../controllers/whatsappController';

const router = Router();

router.get('/whatsapp/health', whatsappHealth);
router.post('/whatsapp/webhook', whatsappWebhook);

export default router;
