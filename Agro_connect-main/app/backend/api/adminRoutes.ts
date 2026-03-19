import { Router } from 'express';
import { getAdminInsights } from '../controllers/adminController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/admin/insights', authMiddleware, getAdminInsights);

export default router;
