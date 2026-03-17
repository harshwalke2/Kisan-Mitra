import { Router } from 'express';
import { postCropRecommendation } from '../controllers/cropRecommendationController';

const router = Router();

router.post('/crop-recommend', postCropRecommendation);

export default router;
