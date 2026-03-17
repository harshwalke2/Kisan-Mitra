import { Request, Response } from 'express';
import {
  CropRecommendationInput,
  REQUIRED_CROP_FIELDS
} from '../models/cropRecommendationModel';
import { predictCropWithPython } from '../utils/pythonCropPredictor';

const toNumericInput = (body: Record<string, unknown>): CropRecommendationInput => {
  const input = {} as CropRecommendationInput;

  for (const field of REQUIRED_CROP_FIELDS) {
    const rawValue = body[field];
    const numericValue = typeof rawValue === 'number' ? rawValue : Number(rawValue);

    if (!Number.isFinite(numericValue)) {
      throw new Error(`Invalid value for ${field}`);
    }

    input[field] = numericValue;
  }

  return input;
};

export const postCropRecommendation = async (req: Request, res: Response) => {
  const startedAt = Date.now();

  try {
    const input = toNumericInput(req.body as Record<string, unknown>);
    console.log('[crop-recommend] request received', input);

    const prediction = await predictCropWithPython(input);
    console.log('[crop-recommend] prediction success', {
      recommendedCrop: prediction.recommended_crop,
      confidence: prediction.confidence,
      latencyMs: Date.now() - startedAt,
    });

    res.status(200).json(prediction);
  } catch (error) {
    const message = (error as Error).message || 'Unable to generate crop recommendation';
    console.error('[crop-recommend] prediction failed', {
      message,
      latencyMs: Date.now() - startedAt,
      body: req.body,
    });

    res.status(400).json({
      message,
      hint: 'Ensure backend model is trained and request includes all numeric crop parameters.'
    });
  }
};
