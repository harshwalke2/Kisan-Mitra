import { Request, Response } from 'express';
import { fetchGovMarketInsights } from '../services/govMarketInsightsService';

export const getLiveMarketInsights = async (req: Request, res: Response): Promise<void> => {
  try {
    const requestedLimit = Number(req.query.limit);
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 1000)
      : 500;

    const result = await fetchGovMarketInsights(limit);

    res.status(200).json({
      insights: result.insights,
      source: result.source,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch live market insights';
    const statusCode = message.includes('DATA_GOV_RESOURCE_ID') ? 503 : 502;

    res.status(statusCode).json({
      message,
      insights: [],
    });
  }
};
