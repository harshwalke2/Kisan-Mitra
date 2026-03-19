import { Router } from 'express';
import { getLiveMarketInsights } from '../controllers/marketInsightsController';

const router = Router();

router.get('/market/insights', getLiveMarketInsights);

export default router;
