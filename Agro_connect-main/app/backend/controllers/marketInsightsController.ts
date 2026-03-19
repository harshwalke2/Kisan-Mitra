import { Request, Response } from 'express';
import { fetchGovMarketInsightsWithFilters } from '../services/govMarketInsightsService';

export const getLiveMarketInsights = async (req: Request, res: Response): Promise<void> => {
  try {
    const requestedLimit = Number(req.query.limit);
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 1000)
      : 500;

    const state = typeof req.query.state === 'string' ? req.query.state : undefined;
    const city = typeof req.query.city === 'string' ? req.query.city : undefined;
    const commodity = typeof req.query.commodity === 'string' ? req.query.commodity : undefined;

    const result = await fetchGovMarketInsightsWithFilters({
      sourceLimit: limit,
      state,
      city,
      commodity,
    });

    res.status(200).json({
      insights: result.insights,
      observations: result.observations,
      statistics: result.statistics,
      source: result.source,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch live market insights';
    const statusCode = 502;

    res.status(statusCode).json({
      message,
      insights: [],
      observations: [],
      statistics: {
        totalRecords: 0,
        totalStates: 0,
        totalCities: 0,
        totalMarkets: 0,
        totalCommodities: 0,
        stateOptions: [],
        cityOptions: [],
        lastUpdated: null,
      },
    });
  }
};
